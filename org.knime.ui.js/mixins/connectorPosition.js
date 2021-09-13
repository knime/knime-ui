import { mapState } from 'vuex';
import portShift from '~/util/portShift';

export const connectorPosition = {
    props: {
        /**
         * Node ID of the connector's source node
         */
        sourceNode: { type: String, default: null },
        /**
         * Node ID of the connector's target node
         */
        destNode: { type: String, default: null },
        /**
         * Index of the source node's output port that this connector is attached to
         */
        sourcePort: { type: Number, default: null },
        /**
         * Index of the target node's input port that this connector is attached to
         */
        destPort: { type: Number, default: null },
        /**
         * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
         */
        absolutePoint: { type: Array, default: null }
    },
    methods: {
        /**
         * Determine the end point coordinates of the start point ('source') or end point ('dest') of the connector
         * @param {String} type One of 'source' / 'dest'. Defaults to 'dest'
         * @returns {Array} The coordinates
         */
        getEndPointCoordinates(type = 'dest') {
            let sourceNodeIndex = this[`${type}Port`];
            let node = this[`${type}NodeObject`];
            if (node) {
                // connected to a node
                return this.getRegularNodePortPos({ sourceNodeIndex, type, node });
            } else {
                // connected to a metanode port bar
                return this.getMetaNodePortPos({ sourceNodeIndex, type });
            }
        },
        getRegularNodePortPos({ sourceNodeIndex, type, node }) {
            let allPorts = type === 'source' ? node.outPorts : node.inPorts;
            const [dx, dy] = portShift(
                sourceNodeIndex, allPorts.length, node.kind === 'metanode', type === 'source'
            );
            let { x, y } = node.position;
            return [
                x + dx,
                y + dy
            ];
        },
        getMetaNodePortPos({ sourceNodeIndex, type }) {
            let allPorts = type === 'source' ? this.workflow.metaInPorts : this.workflow.metaOutPorts;
            let x = this.portBarXPos(allPorts, type === 'dest');
            let delta = this.$shapes.portSize / 2;
            x += type === 'source' ? delta : -delta;
            let y = this.portBarItemYPos(sourceNodeIndex, allPorts.ports, true);
            return [x, y];
        }
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        /**
         * The start coordinates of this connector
         * If sourceNode is unspecified the absolute point is used
         * @returns {Array} coordinates containing `x` and `y` properties
         */
        start() {
            return (this.sourceNode && this.getEndPointCoordinates('source')) || this.absolutePoint;
        },
        /**
         * The end coordinates of this connector
         * If destNode is unspecified the absolute point is used
         * @returns {Array} coordinates containing `x` and `y` properties
         */
        end() {
            return (this.destNode && this.getEndPointCoordinates('dest')) || this.absolutePoint;
        },
        sourceNodeObject() {
            return this.$store.state.workflow.activeWorkflow.nodes[this.sourceNode];
        },
        destNodeObject() {
            return this.$store.state.workflow.activeWorkflow.nodes[this.destNode];
        }
    }
};
