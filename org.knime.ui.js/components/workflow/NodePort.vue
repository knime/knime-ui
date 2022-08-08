<script>
import { mapState, mapGetters } from 'vuex';
import throttle from 'raf-throttle';
import { mixin as clickaway } from 'vue-clickaway2';
import { tooltip } from '~/mixins';

import Port from '~/components/workflow/Port.vue';
import Connector from '~/components/workflow/Connector.vue';
import NodePortActions from './NodePortActions.vue';

import { circleDetection } from '~/util/compatibleConnections';

export default {
    components: {
        Port,
        Connector,
        NodePortActions
    },
    mixins: [clickaway, tooltip],
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
        selected: {
            type: Boolean,
            default: false
        }
    },
    data: () => ({
        dragConnector: null,
        didMove: false,
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
        portTemplate() {
            let template = this.availablePortTypes[this.port.typeId];
            if (!template) {
                throw new Error(`port template ${this.port.typeId} not available in application`);
            }
            return template;
        },
        
        // implemented as required by the tooltip mixin
        tooltip() {
            // table ports have less space than other ports, because the triangular shape naturally creates a gap
            const gap = this.portTemplate.kind === 'table' ? 6 : 8; // eslint-disable-line no-magic-numbers
            const { portSize } = this.$shapes;
            return {
                position: {
                    x: this.relativePosition[0],
                    y: this.relativePosition[1] - portSize / 2
                },
                gap,
                anchorPoint: this.anchorPoint,
                title: this.port.name,
                text: this.port.info,
                orientation: 'top',
                hoverable: false
            };
        }
    },
    watch: {
        indicateConnectorReplacement(indicateReplacement) {
            let [incomingConnection] = this.port.connectedVia;
            let incomingConnector = document.querySelector(`[data-connector-id="${incomingConnection}"]`);
            incomingConnector.dispatchEvent(new CustomEvent('indicate-replacement', { detail: {
                state: indicateReplacement
            } }));
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
            let portKind = this.portTemplate.kind;
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
            if (this.didMove) {
                return;
            }

            this.$emit('click');
        },
        onClose() {
            if (this.selected) {
                this.$emit('deselect');
            }
        }
    }
};
</script>

<template>
  <g
    v-on-clickaway="() => onClose()"
    :transform="`translate(${relativePosition})`"
    :class="{ 'targeted': targeted }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointermove.stop="onPointerMove"
    @lostpointercapture.stop="onLostPointerCapture"
  >
    <!-- regular port shown on the workflow -->
    <Port
      :port="port"
      :class="{ 'hoverable-port': !selected }"
      @click.native="onClick"
    />

    <portal to="selected-port">
      <NodePortActions
        v-if="selected"
        :key="`${nodeId}-${port.index}-${direction}`"
        :port="port"
        :anchor-point="anchorPoint"
        :relative-position="relativePosition"
        :direction="direction"
        @action:remove="$emit('remove')"
        @close="onClose"
      />
    </portal>

    <portal
      v-if="dragConnector"
      to="drag-connector"
    >
      <Connector
        v-bind="dragConnector"
        class="non-interactive"
      />
      <!-- 'fake' port for dragging -->
      <Port
        class="non-interactive"
        data-test-id="drag-connector-port"
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
