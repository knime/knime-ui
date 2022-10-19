<script>
import { mapActions } from 'vuex';

/**
 * Renderless component that provides all the computed/data/methods necessary for the connector snapping logic.
 * Exposes through the default slot information that may be required on the parent to use said behavior.
 *
 * A connection can happen to "valid" and "compatible" ports. `Valid` ports are defined as ports that can be connected to
 * without causing an invalid workflow state (e.g. cycle connections), and `Compatible` connections are defined as
 * ports of the same type (or compatible types) that can be connected together
 */
export default {
    props: {
        /**
         * Id of the port container. Will be used to identify the different connector events
         */
        id: {
            type: [String, null],
            required: true
        },

        disableValidTargetCheck: {
            type: Boolean,
            default: false
        },

        disableHoverBoundaryCheck: {
            type: Boolean,
            default: false
        },

        /**
         * The root position of port container. It's an object with an x and a y property
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },

        /**
         * The positions of each of the ports on the port container
         */
        portPositions: {
            type: Object,
            required: true,
            validator: value => Array.isArray(value.in) && Array.isArray(value.out)
        },

        portGroups: {
            type: Object,
            default: null
        }
    },

    data: () => ({
        connectorHover: false, // connector is hovering above container
        targetPort: null, // the port the connector has snapped to, or null
        isConnectionSource: false,
        connectionForbidden: false, // whether connection can be made (e.g.: target is valid)
        validConnectionTargets: null // list of valid connection targets
    }),

    computed: {
        /**
         * Divides the height of the container into partitions
         * that divide the space between ports by half
         * @returns {{
         *   in: (Array<Number> | undefined),
         *   out: (Array<Number> | undefined)
         * }} List of bottom boundaries of partitions.
         * List is empty if only one port exists
         * List is undefined if no port exists
         */
        snapPartitions() {
            const makePartitions = positions => {
                if (!positions.length) {
                    return null;
                }

                let partitions = [];
                for (let i = 0; i < positions.length - 1; i++) {
                    partitions.push(
                        (positions[i] + positions[i + 1]) / 2
                    );
                }

                return partitions;
            };

            let partitions = {};
            if (this.portPositions.in) {
                partitions.in = makePartitions(this.portPositions.in.map(([, y]) => y));
            }
            if (this.portPositions.out) {
                partitions.out = makePartitions(this.portPositions.out.map(([, y]) => y));
            }
            return partitions;
        }
    },

    mounted() {
        this.$bus.on('connector-start', this.onConnectorStart);
        this.$bus.on('connector-end', this.onConnectorEnd);
    },

    methods: {
        ...mapActions('workflow', ['connectNodes', 'addNodePort']),
        onConnectorStart({ validConnectionTargets, startNodeId }) {
            // Don't set the `connectionForbidden` state when the checks are disabled for all "valid" targets
            // e.g.: Metanode portbar ports can always be connected to (provided they're "compatible")
            if (this.disableValidTargetCheck) {
                return;
            }

            this.validConnectionTargets = validConnectionTargets;
            this.connectionForbidden = !validConnectionTargets.has(this.id);
            this.isConnectionSource = this.id === startNodeId;
        },
        onConnectorEnd() {
            this.connectionForbidden = false;
            this.isConnectionSource = false;
            this.connectorHover = false;
            this.targetPort = null;
            this.validConnectionTargets = null;
        },
        onConnectorEnter(e) {
            consola.trace('connector-enter');
            if (this.connectionForbidden) {
                return;
            }

            this.connectorHover = true;
            // Preventing the event's default will signal that this element is to be considered
            // as a drop target for a connection
            e.preventDefault();
        },
        onConnectorLeave() {
            consola.trace('connector-leave');

            this.connectorHover = false;
            this.targetPort = null;
        },
        onConnectorMove(e, ports) {
            consola.trace('connector-move');
            let { y: mouseY, x: mouseX, targetPortDirection } = e.detail;

            // find mouse position relative to container position on workflow
            const relativeX = mouseX - this.position.x;
            const relativeY = mouseY - this.position.y;

            // component can abort snapping
            if (
                !this.disableHoverBoundaryCheck &&
                this.isOutsideConnectorHoverRegion(relativeX, relativeY, targetPortDirection)
            ) {
                this.targetPort = null;
                return;
            }

            const snapPartitions = this.snapPartitions[targetPortDirection];

            const portPositions = this.portPositions[targetPortDirection];

            // no port, no snap. assumes partitions don't change while dragging connector
            if (!snapPartitions) {
                return;
            }

            // find index of port to snap to
            const partitionIndex = snapPartitions.findIndex(boundary => relativeY <= boundary);
            let snapPortIndex;

            if (snapPartitions.length === 0) {
                // only one port
                snapPortIndex = 0;
            } else if (partitionIndex === -1) {
                // below last partition boundary, select last port
                snapPortIndex = portPositions.length - 1;
            } else {
                // port index matches partition index
                snapPortIndex = partitionIndex;
            }

            const [relPortX, relPortY] = portPositions[snapPortIndex];
            const absolutePortPosition = [relPortX + this.position.x, relPortY + this.position.y];

            const possibleTargetPorts = ports[`${targetPortDirection}Ports`];
            let targetPortData;

            // If the snapPortIndex is smaller than the port list then a regular port is being targeted,
            // otherwise it’s most likely the placeholder port that is being targeted
            if (snapPortIndex < possibleTargetPorts.length) {
                targetPortData = possibleTargetPorts[snapPortIndex];
            } else {
                targetPortData = { isPlaceHolderPort: true };
            }

            // Position connector's end. A move event will provide an `onSnapCallback`
            // which will determine whether the snapping can happen for the given target
            // for placeholder snaps it will also return the data required to add the port
            const { didSnap, createPortFromPlaceholder } = e.detail.onSnapCallback({
                targetPort: targetPortData,
                targetPortGroups: this.portGroups,
                snapPosition: absolutePortPosition
            });

            if (didSnap && this.targetPort?.index !== snapPortIndex) {
                // set the target port's side and index
                // for performance: only replace observed object if targeted port changes
                this.targetPort = {
                    side: targetPortDirection,
                    index: snapPortIndex
                };
                // add data to targetPort if we need to create that port before we connect to it
                if (createPortFromPlaceholder) {
                    this.targetPort = { ...this.targetPort, ...createPortFromPlaceholder, isPlaceHolderPort: true };
                }
            }
        },
        addPort({ side, typeId, portGroup }) {
            return this.addNodePort({
                nodeId: this.id,
                side: side === 'in' ? 'input' : 'output',
                typeId,
                portGroup
            });
        },
        createConnectorObject({ startNode, startPort, targetNode, targetPort, side }) {
            return side === 'in'
                ? {
                    sourceNode: startNode,
                    sourcePort: startPort,
                    destNode: targetNode,
                    destPort: targetPort
                }
                : {
                    sourceNode: targetNode,
                    sourcePort: targetPort,
                    destNode: startNode,
                    destPort: startPort
                };
        },
        async onConnectorDrop({ preventDefault, detail: { startNode, startPort, isCompatible } }) {
            // copy over the target port as the async backend calls might come after it has been set to null by
            // onConnectorEnd()
            let targetPort = { ...this.targetPort };

            // dropped on component, but no port is targeted
            if (isNaN(targetPort?.index)) {
                preventDefault();
                return;
            }

            // A drop event defines whether the target is compatible for connection. Regardless of validity,
            // a connection target can be compatible or incompatible; e.g.: A port that doesn't create a connection
            // circle would be "valid" but if it has a different type than the initial port then it's "incompatible"
            if (!isCompatible) {
                preventDefault();
                return; // end here
            }

            // create the port if the targetPort is marked as a placeholder port
            if (targetPort.isPlaceHolderPort) {
                const { newPortIdx } = await this.addPort(targetPort);
                // update target port index: the backend might have added the port
                // above the others while the placeholder is always the last one
                targetPort.index = newPortIdx;
                targetPort.isPlaceHolderPort = false;
            }

            this.connectNodes(this.createConnectorObject({
                startNode,
                startPort,
                targetPort: targetPort.index,
                targetNode: this.id,
                side: targetPort.side
            }));
        },
        isOutsideConnectorHoverRegion(x, y, targetPortDirection) {
            const upperBound = -20;

            return (
                y < upperBound ||
                (targetPortDirection === 'in' && x > this.$shapes.nodeSize) ||
                (targetPortDirection === 'out' && x < 0)
            );
        }
    },

    render() {
        return this.$slots.default({
            targetPort: this.targetPort,
            connectorHover: this.connectorHover,
            connectionForbidden: this.connectionForbidden,
            isConnectionSource: this.isConnectionSource,

            on: {
                onConnectorStart: this.onConnectorStart,
                onConnectorEnd: this.onConnectorEnd,
                onConnectorEnter: this.onConnectorEnter,
                onConnectorLeave: this.onConnectorLeave,
                onConnectorMove: this.onConnectorMove,
                onConnectorDrop: this.onConnectorDrop
            }
        });
    }
};
</script>
