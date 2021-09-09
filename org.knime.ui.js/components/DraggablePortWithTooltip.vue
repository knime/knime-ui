<script>
import { mapGetters, mapActions } from 'vuex';
import PortWithTooltip from '~/components/PortWithTooltip';
import Port from '~/components/Port';
import Connector from '~/components/Connector';
import { throttle } from 'lodash';

const MOVE_THROTTLE = 50;

export default {
    components: {
        PortWithTooltip,
        Port,
        Connector
    },
    props: {
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
        }
    },
    data: () => ({
        dragConnector: null,
        targeted: false
    }),
    computed: {
        ...mapGetters('canvas', ['fromAbsoluteCoordinates'])
    },
    methods: {
        ...mapActions('workflow', ['connectNodes']),

        /* ======== Drag Connector ======== */
        positionOnCanvas([x, y]) {
            const { offsetLeft, offsetTop, scrollLeft, scrollTop } = this.kanvasElement;
            let result = this.fromAbsoluteCoordinates([
                x - offsetLeft + scrollLeft,
                y - offsetTop + scrollTop
            ]);
            return result;
        },
        onPointerDown(e) {
            e.target.setPointerCapture(e.pointerId);

            this.kanvasElement = document.getElementById('kanvas');

            let connector = {
                id: 'drag-connector',
                canDelete: false,
                flowVariableConnection: this.port.type === 'flowVariable',
                absolutePoint: this.positionOnCanvas([e.x, e.y])
            };

            if (this.direction === 'out') {
                connector.sourceNode = this.nodeId;
                connector.sourcePort = this.port.index;
            } else {
                connector.destNode = this.nodeId;
                connector.destPort = this.port.index;
            }

            this.dragConnector = connector;
        },
        onPointerUp(e) {
            e.target.releasePointerCapture(e.pointerId);
            
            let { sourceNode, sourcePort, destNode, destPort } = this.dragConnector;

            this.lastHitTarget?.dispatchEvent(
                new CustomEvent(
                    'connector-drop', {
                        detail: {
                            sourceNode,
                            sourcePort,
                            destNode,
                            destPort
                        },
                        bubbles: true
                    }
                )
            );
        },
        onLostPointerCapture(e) {
            this.dragConnector = null;
            this.lastHitTarget?.dispatchEvent(new CustomEvent('connector-leave', { bubbles: true }));
        },
        onPointerMove: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (!this.dragConnector) { return; }


            // find HTML-Element below cursor
            let hitTarget = document.elementFromPoint(e.x, e.y);

            // create move event
            let moveEventNotCancelled = true;
            let moveEvent = new CustomEvent('connector-move', {
                detail: { x: e.x, y: e.y },
                bubbles: true,
                cancelable: true
            });


            if (hitTarget && this.lastHitTarget === hitTarget) {
                // hitTarget exists and is the same as last time
                moveEventNotCancelled = hitTarget.dispatchEvent(moveEvent);
            } else {
                // different hitTarget than lastHitTarget, possibly null

                let leaveEventNotCancelled = true;
                
                // send 'connector-leave' to last hitTarget, if it exists
                if (this.lastHitTarget) {
                    leaveEventNotCancelled = this.lastHitTarget.dispatchEvent(
                        new CustomEvent('connector-leave', {
                            detail: {
                                relatedTarget: hitTarget
                            },
                            bubbles: true,
                            cancelable: true
                        })
                    );
                }

                // remember hitTarget
                this.lastHitTarget = hitTarget;

                /* if leave event hasn't been cancelled:
                 *   send 'connector-enter' to new hitTarget
                 *   send 'connector-move' to new hitTarget
                 */
                if (hitTarget && leaveEventNotCancelled) {
                    hitTarget.dispatchEvent(
                        new CustomEvent('connector-enter', {
                            bubbles: true
                        })
                    );
                    moveEventNotCancelled = hitTarget.dispatchEvent(moveEvent);
                }
            }
            
            if (moveEventNotCancelled) {
                this.dragConnector.absolutePoint = this.positionOnCanvas([e.x, e.y]);
            }
            /* eslint-enable no-invalid-this */
        }, MOVE_THROTTLE),

        /* ======== Drop Connector ======== */
        onConnectorEnter() {
            this.targeted = true;
        },
        onConnectorLeave() {
            this.targeted = false;
        },
        onConnectorDrop(e) {
            let { destNode, destPort, sourceNode, sourcePort } = e.detail;

            if (this.direction === 'in') {
                this.connectNodes({
                    sourceNode,
                    sourcePort,
                    destNode: this.nodeId,
                    destPort: this.port.index
                });
            } else {
                this.connectNodes({
                    sourceNode: this.nodeId,
                    sourcePort: this.port.index,
                    destNode,
                    destPort
                });
            }
        }
    }
};
</script>

<template>
  <g
    :transform="`translate(${relativePosition})`"
    :class="{ 'targeted': targeted }"
    @pointerdown.stop="onPointerDown"
    @pointerup.stop="onPointerUp"
    @pointermove.stop="onPointerMove"
    @lostpointercapture.stop="onLostPointerCapture"
    @connector-enter="onConnectorEnter"
    @connector-leave="onConnectorLeave"
    @connector-drop.stop="onConnectorDrop"
  >
    <PortWithTooltip
      :port="port"
      :position="relativePosition"
    />
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
}

.targeted >>> .port > * {
  transform: scale(1.4);
  pointer-events: none;
}
</style>
