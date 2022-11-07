<script>
import { mapState, mapGetters } from 'vuex';
import throttle from 'raf-throttle';
import { mixin as clickaway } from 'vue-clickaway2';
import { tooltip } from '@/mixins';

import { circleDetection } from '@/util/compatibleConnections';
import Port from '@/components/common/Port.vue';
import Connector from '@/components/workflow/connectors/Connector.vue';
import NodePortActions from './NodePortActions.vue';
import QuickAddNodeGhost from '@/components/workflow/node/quickAdd/QuickAddNodeGhost.vue';

const checkConnectionSupport = ({ toPort, connections, targetPortDirection }) => {
    if (targetPortDirection === 'in') {
        const isPortFree = toPort.connectedVia.length === 0;

        if (isPortFree) {
            return true;
        }

        // In ports can only have 1 connection at a time
        const [connectionId] = toPort.connectedVia;

        // can be connected if the existing connection is deleteable
        return connections[connectionId].allowedActions.canDelete;
    }

    return true;
};

const checkPortCompatibility = ({ fromPort, toPort, availablePortTypes }) => {
    const fromPortObjectInfo = availablePortTypes[fromPort.typeId];
    const toPortObjectInfo = availablePortTypes[toPort.typeId];
    const { compatibleTypes } = toPortObjectInfo;
    const { kind: fromPortKind } = fromPortObjectInfo;
    const { kind: toPortKind } = toPortObjectInfo;

    // 'generic' and 'table' port kinds are not compatible, so we check either direction
    if (
        (fromPortKind === 'generic' && toPortKind === 'table') ||
        (fromPortKind === 'table' && toPortKind === 'generic')
    ) {
        return false;
    }

    // generic ports accept any type of connection
    if (fromPortKind === 'generic' || toPortKind === 'generic') {
        return true;
    }

    // if compatible types exist, check if they contain each other
    if (compatibleTypes) {
        return compatibleTypes.includes(fromPort.typeId);
    }

    // lastly, if port types ids don't match then they can't be connected
    return fromPort.typeId === toPort.typeId;
};

// creates an array of [group, supportedPortTypes] entries even for metanodes and components (where the group is null)
const groupAddablePortTypesByPortGroup = ({
    targetPortGroups,
    availablePortTypes,
    targetPortDirection
}) => {
    // use all port types for metanodes and components (we assume them if portGroups is null!)
    if (!targetPortGroups) {
        return [[null, Object.keys(availablePortTypes)]]; // end here
    }

    // unwrap compatible port type by portGroup
    const portGroupEntries = Object.entries(targetPortGroups);
    const filterProp = targetPortDirection === 'in' ? 'canAddInPort' : 'canAddOutPort';
    const portGroupsForTargetDirection = portGroupEntries.filter(([_, portGroup]) => portGroup[filterProp]);

    return portGroupsForTargetDirection.map(([groupName, portGroup]) => [groupName, portGroup.supportedPortTypeIds]);
};

const findTypeIdFromPlaceholderPort = ({
    fromPort,
    availablePortTypes,
    targetPortGroups,
    targetPortDirection
}) => {
    let suggestedTypeId,
        portGroup;

    const addablePortTypesGrouped = groupAddablePortTypesByPortGroup({
        availablePortTypes,
        targetPortGroups,
        targetPortDirection
    });

    const directMatches = addablePortTypesGrouped.filter(([_, supportedIds]) => supportedIds.includes(fromPort.typeId));

    // TODO: NXT-1242 let the user choose the portGroup
    // for now just use the first direct match
    if (directMatches.length > 0) {
        suggestedTypeId = fromPort.typeId;
        [[portGroup]] = directMatches;
    } else {
        const compatibleMatches = addablePortTypesGrouped.map(([group, supportedTypeIds]) => {
            const compatibleTypeIds = supportedTypeIds.filter(typeId => checkPortCompatibility({
                fromPort,
                toPort: { typeId },
                availablePortTypes
            }));
            return compatibleTypeIds.length ? [group, compatibleTypeIds] : null;
        }).filter(Boolean);

        // TODO: NXT-1242 let the user choose the compatible match if its more then one
        if (compatibleMatches.length > 0) {
            [[portGroup, [suggestedTypeId]]] = compatibleMatches;
        }
    }

    return {
        didSnap: Boolean(suggestedTypeId),
        createPortFromPlaceholder: {
            typeId: suggestedTypeId,
            portGroup
        }
    };
};

const checkCompatibleConnectionAndPort = ({
    fromPort,
    toPort,
    availablePortTypes,
    targetPortDirection,
    connections
}) => {
    const isSupportedConnection = checkConnectionSupport({
        toPort,
        connections,
        targetPortDirection
    });

    const isCompatiblePort = checkPortCompatibility({
        fromPort,
        toPort,
        availablePortTypes
    });

    return { didSnap: isSupportedConnection && isCompatiblePort };
};

export default {
    components: {
        Port,
        Connector,
        QuickAddNodeGhost,
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
        nodeKind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
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
        // represents the <Connector> line that can be dragged to other ports
        dragConnector: null,
        didMove: false,
        pointerDown: false,
        didDragToCompatibleTarget: false,
        showAddNodeGhost: false
    }),
    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapGetters('workflow', ['isWritable', 'isDragging']),
        ...mapState('application', ['availablePortTypes']),
        ...mapState('workflow', { connections: state => state.activeWorkflow.connections }),
        /*
         * only in-Ports replace their current connector if a new one is connected
         * only in-Ports that are connected need to indicate connector replacement
         * indicate, if this port is targeted for connection
         * indicate, if this port is the starting point of a new connector
        */
        indicateConnectorReplacement() {
            return (
                this.direction === 'in' &&
                Boolean(this.port.connectedVia.length) &&
                (this.targeted || Boolean(this.dragConnector))
            );
        },
        portTemplate() {
            let template = this.availablePortTypes[this.port.typeId];
            if (!template) {
                throw new Error(`port template ${this.port.typeId} not available in application`);
            }
            return template;
        },
        isFlowVariable() {
            return this.portTemplate.kind === 'flowVariable';
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
            e.target.setPointerCapture(e.pointerId);
        },
        initialPointerMove(e) {
            this.didMove = true;

            this.kanvasElement = document.getElementById('kanvas');

            // set up connector
            this.dragConnector = this.createConnectorFromEvent(e);

            // find compatible nodes
            const validConnectionTargets = circleDetection({
                downstreamConnection: this.direction === 'out',
                startNode: this.nodeId,
                workflow: this.$store.state.workflow.activeWorkflow
            });

            // signal start of connecting phase
            this.$root.$emit('connector-start', {
                validConnectionTargets,
                startNodeId: this.nodeId,
                startPort: this.port
            });
        },
        onPointerMove: throttle(function (e) {
            /* eslint-disable no-invalid-this */
            if (this.pointerDown && !this.didMove) {
                this.initialPointerMove(e);
            }

            // skip pointermove logic when there's no active dragconnector being displayed or
            // when the user is no longer holding down the pointer click
            if (!this.dragConnector || !this.pointerDown) {
                return;
            }

            // find HTML-Element below cursor
            const hitTarget = document.elementFromPoint(e.x, e.y);

            const [absoluteX, absoluteY] = this.screenToCanvasCoordinates([e.x, e.y]);
            const setDragConnectorCoords = (x, y) => {
                this.dragConnector.absolutePoint = [x, y];
            };
            setDragConnectorCoords(absoluteX, absoluteY);

            const targetPortDirection = this.direction === 'out' ? 'in' : 'out';
            // create move event
            const moveEvent = new CustomEvent('connector-move', {
                detail: {
                    x: absoluteX,
                    y: absoluteY,
                    targetPortDirection,
                    onSnapCallback: ({ snapPosition, targetPort, targetPortGroups }) => {
                        const [x, y] = snapPosition;

                        let result = targetPort.isPlaceHolderPort
                            ? findTypeIdFromPlaceholderPort({
                                fromPort: this.port,
                                availablePortTypes: this.availablePortTypes,
                                targetPortDirection,
                                targetPortGroups
                            })
                            : checkCompatibleConnectionAndPort({
                                fromPort: this.port,
                                toPort: targetPort,
                                availablePortTypes: this.availablePortTypes,
                                targetPortDirection,
                                connections: this.connections
                            });

                        this.didDragToCompatibleTarget = result.didSnap;

                        // setting the drag connector coordinates will cause the connector to snap
                        // We prevent that if it's not a compatible target
                        if (this.didDragToCompatibleTarget) {
                            setDragConnectorCoords(x, y);
                        }

                        // The callback should return whether a snapped connection was made to a compatible target
                        // and needs to provide data for the to be added port for placeholder snaps
                        return result;
                    }
                },
                bubbles: true
            });

            let isSameTarget = hitTarget && this.lastHitTarget?.element === hitTarget;

            if (isSameTarget && !this.lastHitTarget.allowsDrop) {
                // same hitTarget as before, but doesn't allow drop
                // just reset state (important for add node ghost)
                this.didDragToCompatibleTarget = false;
            } else if (isSameTarget) {
                // same hitTarget as before and allows connector drop
                hitTarget.dispatchEvent(moveEvent);
            } else {
                // different hitTarget than lastHitTarget, possibly null

                // send 'connector-leave' to last hitTarget, if it exists and has allowed connector dropping
                if (this.lastHitTarget && this.lastHitTarget.allowsDrop) {
                    this.lastHitTarget.element.dispatchEvent(
                        new CustomEvent('connector-leave', {
                            detail: { relatedTarget: hitTarget },
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
                    const allowsDrop = !notCancelled;

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

            if (this.lastHitTarget) {
                // if a hitTarget was found then remember its compatibility
                this.lastHitTarget = {
                    ...this.lastHitTarget,
                    isCompatible: this.didDragToCompatibleTarget
                };
            }

            // show add node ghost for output ports
            if (this.direction === 'out' &&
                !this.isFlowVariable &&
                !['metanode', 'component'].includes(this.nodeKind)) {
                this.showAddNodeGhost = !this.didDragToCompatibleTarget;
            }
            /* eslint-enable no-invalid-this */
        }),
        onPointerUp(e) {
            this.pointerDown = false;

            if (!this.dragConnector) {
                return;
            }

            e.stopPropagation();
            e.target.releasePointerCapture(e.pointerId);

            if (this.lastHitTarget && this.lastHitTarget.allowsDrop) {
                let dropped = this.lastHitTarget.element.dispatchEvent(
                    new CustomEvent(
                        'connector-drop', {
                            detail: {
                                startNode: this.nodeId,
                                startPort: this.port.index,
                                // when connection is dropped we pass in whether the last hit target was compatible.
                                // incompatible targets will be ignored and will not be connected to
                                isCompatible: this.lastHitTarget.isCompatible
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
            this.didMove = false;
            if (this.showAddNodeGhost) {
                this.openQuickAddNodeMenu();
            } else {
                // clear drag connector now; otherwise this happens on close of the menu
                this.dragConnector = null;
            }
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
        },
        openQuickAddNodeMenu() {
            // find the position in coordinates relative to the origin
            let position = {
                x: this.dragConnector.absolutePoint[0],
                y: this.dragConnector.absolutePoint[1]
            };

            // Because of an issue with Vue Portal (https://github.com/LinusBorg/portal-vue/issues/290)
            // We have to make this work like a custom teleport (can probably be replaced by Vue3's teleport)
            // by telling the WorkflowPanel to render a PortTypeMenu with specified props and events
            this.$el.dispatchEvent(new CustomEvent(
                'open-quick-add-node-menu', {
                    detail: {
                        id: `${this.nodeId}-${this.direction}`,
                        props: {
                            position,
                            port: this.port,
                            nodeId: this.nodeId
                        },
                        events: {
                            'menu-close': this.closeQuickAddNodeMenu
                        }
                    },
                    bubbles: true
                }
            ));
        },
        closeQuickAddNodeMenu() {
            // close the menu
            this.$el.dispatchEvent(new CustomEvent(
                'close-quick-add-node-menu', {
                    detail: {
                        id: `${this.nodeId}-${this.direction}`
                    },
                    bubbles: true
                }
            ));
            // remove the ghost
            this.showAddNodeGhost = false;
            // clear the drag connector
            this.dragConnector = null;
        },
        createConnectorFromEvent(e) {
            const relatedNode = this.direction === 'out' ? 'sourceNode' : 'destNode';
            const relatedPort = this.direction === 'out' ? 'sourcePort' : 'destPort';

            return {
                id: 'drag-connector',
                allowedActions: { canDelete: false },
                flowVariableConnection: this.isFlowVariable,
                absolutePoint: this.screenToCanvasCoordinates([e.x, e.y]),
                [relatedNode]: this.nodeId,
                [relatedPort]: this.port.index
            };
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
      <QuickAddNodeGhost
        v-if="showAddNodeGhost"
        class="non-interactive"
        :position="dragConnector.absolutePoint"
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
