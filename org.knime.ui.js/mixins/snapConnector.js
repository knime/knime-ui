import { mapActions, mapState } from 'vuex';

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
        ...mapState('application', ['availablePortTypes']),
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
        },
        selectedPortGroup() {
            // TODO: move to helper or store ??!!
            // TODO: temporary until multiple port groups can be handled
            if (!this.portGroups) {
                return null;
            }

            return Object.entries(this.portGroups)
                .find(([name, { canAddInPort, canAddOutPort }]) => canAddInPort || canAddOutPort);
        },
        addablePortTypes() {
            if (['metanode', 'component'].includes(this.nodeKind)) {
                return Object.keys(this.availablePortTypes);
            }

            // TODO: are those typeIds a object or array?
            return this.selectedPortGroup?.[1].supportedPortTypeIds;
        }
    },
    mounted() {
        this.$root.$on('connector-start', this.onConnectorStart);
        this.$root.$on('connector-end', this.onConnectorEnd);
    },
    methods: {
        ...mapActions('workflow', ['connectNodes', 'addNodePort']),
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

            let [relPortX, relPortY] = portPositions[snapPortIndex];
            let absolutePortPosition = [relPortX + this.position.x, relPortY + this.position.y];

            const possibleTargetPorts = ports[`${targetPortDirection}Ports`];
            let targetPortData;
            // if the port index is bigger than our port list this is most likely a placeholder port
            if (possibleTargetPorts.length > snapPortIndex) {
                targetPortData = possibleTargetPorts[snapPortIndex];
            } else {
                targetPortData = { isPlaceHolderPort: true };
            }

            // position connector end
            const { didSnap, suggestedTypeId } = e.detail.onSnapCallback({
                targetPort: targetPortData,
                addablePortTypes: this.addablePortTypes,
                snapPosition: absolutePortPosition
            });

            if (didSnap && this.targetPort?.index !== snapPortIndex) {
                // set the target port's side and index
                // for performance: only replace observed object if targeted port changes
                this.targetPort = {
                    side: targetPortDirection,
                    index: snapPortIndex
                };
                if (targetPortData.isPlaceHolderPort) {
                    this.targetPort.isPlaceHolderPort = true;
                    this.targetPort.typeId = suggestedTypeId;
                }
            }
        },
        addPort({ side, typeId }) {
            this.addNodePort({
                nodeId: this.id,
                side: side === 'in' ? 'input' : 'output',
                typeId,
                portGroup: this.selectedPortGroup?.[0] // is null for composite nodes
            });
        },
        createConnectorObject({ startNode, startPort }) {
            return this.targetPort.side === 'in'
                ? {
                    sourceNode: startNode,
                    sourcePort: startPort,
                    destNode: this.id || this.containerId, // either node or metanode
                    destPort: this.targetPort.index
                }
                : {
                    sourceNode: this.id || this.containerId, // either node or metanode
                    sourcePort: this.targetPort.index,
                    destNode: startNode,
                    destPort: startPort
                };
        },
        onConnectorDrop(e) {
            if (isNaN(this.targetPort?.index)) {
                // dropped on component, but no port is targeted
                e.preventDefault();
                return;
            }

            if (e.detail.isCompatible) {
                // create the port if this was a placeholder port
                if (this.targetPort.isPlaceHolderPort) {
                    this.addPort(this.targetPort);
                    // TODO: set this.targetPort.index to the newly added index - its currently just based on the
                    //       hope that the backend already finished to add the port (and it has the index+1)
                }
                this.connectNodes(this.createConnectorObject(e.detail));
            } else {
                e.preventDefault();
            }
        }
    }
};
