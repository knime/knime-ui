import { mapActions } from 'vuex';

/**
 * This mixin used for components that have ports to allow the user to snap and drop connectors
 *
 * Requires component to implement the following interface:
 *
 * Interface snapConnector {
 *   portPositions: {
 *      in?: Array<[x, y]>
 *      out?: Array<[x, y]>
 *   },
 *   position: {x, y},
 *   isOutsideConnectorHoverRegion?: (mouseX, mouseY, 'in' | 'out') -> Boolean,
 * }
 *
 * Requires component to register the following event handlers
 *
 *   @connector-enter -> onConnectorEnter
 *   @connector-leave -> onConnectorLeave
 *   @connector-move  -> onConnectorMove
 *   @connector-drop  -> onConnectorDrop
 *
 */
export const snapConnector = {
    data: () => ({
        connectorHover: false, // connector is hovering above component
        targetPort: null, // the port the connector is snapped to, or null
        connectionForbidden: false,
        isConnectionSource: false
    }),
    computed: {
        /**
         * Divides the height of the component into partitions
         * that divide the space between ports by half
         * @returns {{
         *   in: (Array<Number> | undefined),
         *   out: (Array<Number> | undefined)
         * }} List of bottom boundaries of partitions.
         * List is empty if only one port exists
         * List is undefined if no port exists
         */
        snapPartitions() {
            let makePartitions = positions => {
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
        this.$root.$on('connector-start', this.onConnectorStart);
        this.$root.$on('connector-end', this.onConnectorEnd);
    },
    methods: {
        ...mapActions('workflow', ['connectNodes']),
        onConnectorStart({ compatibleNodes, nodeId }) {
            if (this.containerId) {
                // metanodes can always be connected to
                return;
            }

            this.connectionForbidden = !compatibleNodes.has(this.id);
            this.isConnectionSource = this.id === nodeId;
        },
        onConnectorEnd() {
            this.connectionForbidden = false;
            this.isConnectionSource = false;
        },
        onConnectorEnter(e) {
            consola.trace('connector-enter');
            if (this.connectionForbidden) {
                return;
            }

            this.connectorHover = true;
            // enable this element as a drop target
            e.preventDefault();
        },
        onConnectorLeave() {
            consola.trace('connector-leave');

            this.connectorHover = false;
            this.targetPort = null;
        },
        onConnectorMove(e) {
            consola.trace('connector-move');
            let { y: mouseY, x: mouseX, targetPortDirection } = e.detail;

            // find mouse position relative to components position on workflow
            let relativeY = mouseY - this.position.y;
            let relativeX = mouseX - this.position.x;

            // component can abort snapping
            if (this.isOutsideConnectorHoverRegion &&
                this.isOutsideConnectorHoverRegion(relativeX, relativeY, targetPortDirection)) {
                this.targetPort = null;
                return;
            }

            let snapPartitions = this.snapPartitions[targetPortDirection];
            let portPositions = this.portPositions[targetPortDirection];

            // no port, no snap, assumes partitions don't change while dragging connector
            if (!snapPartitions) {
                return;
            }

            // find index of port to snap to
            let partitionIndex = snapPartitions.findIndex(boundary => relativeY <= boundary);
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

            if (this.targetPort?.index !== snapPortIndex) {
                // set the target port's side and index
                // for performance: only replace observed object if targeted port changes
                this.targetPort = {
                    side: targetPortDirection,
                    index: snapPortIndex
                };
            }

            let [relPortX, relPortY] = portPositions[snapPortIndex];
            let absolutePortPosition = [relPortX + this.position.x, relPortY + this.position.y];

            // position connector end
            e.detail.overwritePosition(absolutePortPosition);
        },
        onConnectorDrop(e) {
            if (isNaN(this.targetPort?.index)) {
                // dropped on component, but no port is targeted
                e.preventDefault();
                return;
            }

            let { destNode, destPort, sourceNode, sourcePort } = e.detail;

            let newConnector = this.targetPort.side === 'in'
                ? {
                    sourceNode,
                    sourcePort,
                    destNode: this.id || this.containerId, // either node or metanode
                    destPort: this.targetPort.index
                }
                : {
                    sourceNode: this.id || this.containerId, // either node or metanode
                    sourcePort: this.targetPort.index,
                    destNode,
                    destPort
                };

            // TODO NXT-571: Is this check still needed?
            let alreadyConnected = Object
                .values(this.$store.state.workflow.activeWorkflow.connections)
                .some(connector => newConnector.sourceNode === connector.sourceNode &&
                    newConnector.sourcePort === connector.sourcePort &&
                    newConnector.destNode === connector.destNode &&
                    newConnector.destPort === connector.destPort);

            if (alreadyConnected) {
                e.preventDefault();
            } else {
                this.connectNodes(newConnector);
            }
        }
    }
};
