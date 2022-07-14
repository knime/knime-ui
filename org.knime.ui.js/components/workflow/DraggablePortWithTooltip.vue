<script>
import { mapState, mapGetters } from 'vuex';
import throttle from 'raf-throttle';
import { mixin as clickaway } from 'vue-clickaway2';

import PortWithTooltip from '~/components/workflow/PortWithTooltip';
import Port from '~/components/workflow/Port';
import Connector from '~/components/workflow/Connector';
import ActionButton from '~/components/workflow/ActionButton';
import DeleteIcon from '~/assets/delete.svg?inline';

import { circleDetection } from '~/util/compatibleConnections';

export default {
    components: {
        PortWithTooltip,
        Port,
        Connector,
        ActionButton,
        DeleteIcon
    },
    mixins: [clickaway],
    inject: ['anchorPoint'],
    props: {
        /** direction of the port and the connector coming out of it: in-coming or out-going */
        direction: {
            type: String,
            required: true,
            validator: (t) => ['in', 'out'].includes(t)
        },
        nodeId: {
            type: String,
            default: null
        },
        relativePosition: {
            type: Array,
            default: () => [0, 0],
            validator: pos => Array.isArray(pos) && pos.length === 2
        },
        port: {
            type: Object,
            required: true
        },
        // if true, the port will highlight itself
        targeted: {
            type: Boolean,
            default: false
        },
        canSelect: {
            type: Boolean,
            default: false
        }
    },
    data: () => ({
        dragConnector: null,
        didMove: false,
        isSelected: false,
        pointerDown: false
    }),
    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('workflow', ['isWritable', 'isDragging']),
        ...mapState('application', ['availablePortTypes']),
        /*
         * only in-Ports replace their current connector if a new one is connected
         * only in-Ports that are connected need to indicate connector replacement
         * indicate, if this port is targeted for connection
         * indicate, if this port is the starting point of a new connector
        */
        indicateConnectorReplacement() {
            return this.direction === 'in' && Boolean(this.port.connectedVia.length) &&
            (this.targeted || Boolean(this.dragConnector));
        },
        selectedPortPosition() {
            const [x, y] = this.relativePosition;
            return [
                this.anchorPoint.x + x,
                this.anchorPoint.y + y
            ];
        }
    },
    watch: {
        indicateConnectorReplacement(indicateReplacement) {
            let [incomingConnection] = this.port.connectedVia;
            let incomingConnector = document.querySelector(`[data-connector-id="${incomingConnection}"]`);
            incomingConnector.dispatchEvent(new CustomEvent('indicate-replacement', { detail: {
                state: indicateReplacement
            } }));
        },
        isSelected(isSelected, wasSelected) {
            if (!wasSelected && isSelected && !this.unwatchIsDragging) {
                // deselect port if the user starts to drag a node
                let unwatch = this.$watch('isDragging', () => {
                    this.isSelected = false;
                });
                this.unwatchIsDragging = () => {
                    unwatch();
                    this.unwatchIsDragging = null;
                };
            } else if (wasSelected && !isSelected) {
                this.unwatchIsDragging();
            }
        }
    },
    methods: {
        /* ======== Drag Connector ======== */
        onPointerDown(e) {
            if (!this.isWritable || e.button !== 0 || e.shiftKey || e.ctrlKey) {
                return;
            }
            e.stopPropagation();
            
            this.pointerDown = true;
        },
        initialPointerMove(e) {
            this.didMove = true;

            e.target.setPointerCapture(e.pointerId);

            this.kanvasElement = document.getElementById('kanvas');

            // set up connector
            let portKind = this.availablePortTypes[this.port.typeId].kind;
            let connector = {
                id: 'drag-connector',
                allowedActions: {
                    canDelete: false
                },
                flowVariableConnection: portKind === 'flowVariable',
                absolutePoint: this.screenToCanvasCoordinates([e.x, e.y])
            };

            if (this.direction === 'out') {
                connector.sourceNode = this.nodeId;
                connector.sourcePort = this.port.index;
            } else {
                connector.destNode = this.nodeId;
                connector.destPort = this.port.index;
            }

            this.dragConnector = connector;

            // find compatible nodes
            let compatibleNodes = circleDetection({
                downstreamConnection: this.direction === 'out',
                startNode: this.nodeId,
                workflow: this.$store.state.workflow.activeWorkflow
            });

            // signal start of connecting phase
            this.$root.$emit('connector-start', {
                compatibleNodes,
                nodeId: this.nodeId
            });
        },
        onPointerMove: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.pointerDown && !this.didMove) {
                this.initialPointerMove(e);
            }

            if (!this.dragConnector) {
                return;
            }
            
            // find HTML-Element below cursor
            let hitTarget = document.elementFromPoint(e.x, e.y);

            // create move event
            let [absoluteX, absoluteY] = this.screenToCanvasCoordinates([e.x, e.y]);
            let moveEvent = new CustomEvent('connector-move', {
                detail: {
                    x: absoluteX,
                    y: absoluteY,
                    targetPortDirection: this.direction === 'out' ? 'in' : 'out',
                    overwritePosition: ([x, y]) => {
                        absoluteX = x;
                        absoluteY = y;
                    }
                },
                bubbles: true
            });

            let isSameTarget = hitTarget && this.lastHitTarget?.element === hitTarget;

            if (isSameTarget && !this.lastHitTarget.allowsDrop) {
                // same hitTarget as before, but doesn't allow drop
                // Do-Nothing
            } else if (isSameTarget) {
                // same hitTarget as before and allows connector drop
                hitTarget.dispatchEvent(moveEvent);
            } else {
                // different hitTarget than lastHitTarget, possibly null

                // send 'connector-leave' to last hitTarget, if it exists and has allowed connector dropping
                if (this.lastHitTarget && this.lastHitTarget.allowsDrop) {
                    this.lastHitTarget.element.dispatchEvent(
                        new CustomEvent('connector-leave', {
                            detail: {
                                relatedTarget: hitTarget
                            },
                            bubbles: true
                        })
                    );
                }

                /*
                 * If the new hit target exists send 'connector-enter'
                 * The hit target can enable connector dropping by cancelling this event
                 */
                if (hitTarget) {
                    let notCancelled = hitTarget.dispatchEvent(
                        new CustomEvent('connector-enter', {
                            bubbles: true,
                            cancelable: true
                        })
                    );

                    // cancelling signals, that hit target allows dropping a connector
                    let allowsDrop = !notCancelled;

                    if (allowsDrop) {
                        // send first move event right away
                        hitTarget.dispatchEvent(moveEvent);
                    }

                    // remember hitTarget
                    this.lastHitTarget = { element: hitTarget, allowsDrop };
                } else {
                    this.lastHitTarget = null;
                }
            }

            this.dragConnector.absolutePoint = [absoluteX, absoluteY];
            /* eslint-enable no-invalid-this */
        }),
        onPointerUp(e) {
            this.pointerDown = false;
            
            if (!this.dragConnector) {
                return;
                // TODO: maybe get rid of didMove and handle normal click here?
            }

            e.stopPropagation();
            e.target.releasePointerCapture(e.pointerId);

            let { sourceNode, sourcePort, destNode, destPort } = this.dragConnector;

            if (this.lastHitTarget && this.lastHitTarget.allowsDrop) {
                let dropped = this.lastHitTarget.element.dispatchEvent(
                    new CustomEvent(
                        'connector-drop', {
                            detail: {
                                sourceNode,
                                sourcePort,
                                destNode,
                                destPort
                            },
                            bubbles: true,
                            cancelable: true
                        }
                    )
                );
                if (dropped) {
                    this.$root.$emit('connector-dropped');
                }
            }
        },
        onLostPointerCapture(e) {
            this.pointerDown = false;
            this.dragConnector = null;
            this.didMove = false;
            if (this.lastHitTarget && this.lastHitTarget.allowsDrop) {
                this.lastHitTarget.element.dispatchEvent(new CustomEvent('connector-leave', { bubbles: true }));
            }
            this.$root.$emit('connector-end');
        },
        onClick() {
            if (this.canSelect && !this.didMove) {
                this.isSelected = true;
            }
        },
        onClickAway() {
            this.isSelected = false;
        },
        onDelete() {
            this.isSelected = false;

            const side = this.direction === 'in' ? 'input' : 'output';
            
            this.$store.dispatch('workflow/removeContainerNodePort', {
                nodeId: this.nodeId,
                side,
                typeId: this.port.typeId,
                portIndex: this.port.index
            });
        }
    }
};
</script>

<template>
  <g
    v-on-clickaway="() => onClickAway()"
    :transform="`translate(${relativePosition})`"
    :class="{ 'targeted': targeted }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointermove.stop="onPointerMove"
    @lostpointercapture.stop="onLostPointerCapture"
  >
    <PortWithTooltip
      :port="port"
      :tooltip-position="relativePosition"
      :class="{ 'hoverable-port': !isSelected }"
      @click.native="onClick"
    />

    <portal to="selected-port">
      <g
        v-if="isSelected"
        :key="`${nodeId}-${port.index}`"
        :transform="`translate(${selectedPortPosition})`"
      >
        <Port
          :port="port"
          class="selected-port"
          is-selected
        />
    
        <ActionButton
          :x="relativePosition[0] - (direction === 'in' ? 22 : 10)"
          :disabled="!port.canRemove"
          title="Delete port"
          @click="onDelete"
        >
          <DeleteIcon />
        </ActionButton>
      </g>
    </portal>

    <portal
      v-if="dragConnector"
      to="drag-connector"
    >
      <Connector
        v-bind="dragConnector"
        class="non-interactive"
      />
      <Port
        class="non-interactive"
        :port="port"
        :transform="`translate(${dragConnector.absolutePoint})`"
      />
    </portal>
  </g>
</template>

<style lang="postcss" scoped>
.non-interactive {
  pointer-events: none;

  & >>> .hover-area {
    /* overwrite hover-area of ports */
    pointer-events: none !important;
  }
}

.targeted >>> .scale {
  transform: scale(1.4);
}

.hoverable-port {
  & >>> .scale {
    pointer-events: none;
    transition: transform 0.1s linear;
  }

  &:hover >>> .scale {
    transition: transform 0.17s cubic-bezier(0.8, 2, 1, 2.5);
    transform: scale(1.2);
  }
}
</style>
