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
        }
    },
    data: () => ({
        dragConnector: null
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
                allowedActions: {
                    canDelete: false
                },
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
            let [absoluteX, absoluteY] = this.positionOnCanvas([e.x, e.y]);
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


            if (hitTarget && this.lastHitTarget === hitTarget) {
                // hitTarget exists and is the same as last time
                hitTarget.dispatchEvent(moveEvent);
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
                    consola.trace('leave', 'cancelled:', !leaveEventNotCancelled, this.lastHitTarget);
                }

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
                    hitTarget.dispatchEvent(moveEvent);
                }

                // remember hitTarget
                this.lastHitTarget = hitTarget;
            }
            this.dragConnector.absolutePoint = [absoluteX, absoluteY];
            /* eslint-enable no-invalid-this */
        }, MOVE_THROTTLE)
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
  >
    <PortWithTooltip
      :port="port"
      :tooltip-position="relativePosition"
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
}
</style>
