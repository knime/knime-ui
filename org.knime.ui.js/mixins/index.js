import { metaNodeBarWidth } from '~/style/shapes';

export const portBar = {
    methods: {
        /**
         * Get the horizontal position of a metanode's port bar from the store.
         * This assumes that the `workflowBounds` store getter is present, and the workflow bounds have been calculated
         * correctly in the workflow store's load action.
         * @param {Object} ports as returned from the API
         * @param {Boolean} isOut `true` if the `ports` input represents the input ports, `false` for the output ports.
         * @returns {Number} The horizontal position
         */
        portBarXPos(ports, isOut) {
            if (ports.xPos) {
                return ports.xPos;
            }
            if (isOut) {
                return this.workflowBounds.right - metaNodeBarWidth;
            }
            return Math.min(this.workflowBounds.left, 0) + metaNodeBarWidth;
        },
        /**
         * Get the vertical position one of a metanode's port items, either relative to the port bar, or absolute.
         * This assumes that the `svgBounds` store getter is present, and the svg bounds have been calculated
         * correctly in the workflow store's load action.
         * @param {Number} index Index of the port
         * @param {Array} ports List of ports
         * @param {Boolean} absolute `true` for absoulte coordinate, `false` for relative.
         * @returns {Number} The vertical position
         */
        portBarItemYPos(index, ports, absolute) {
            let total = ports.length;
            return this.portBarHeight * (index + 1) / (total + 1) + (absolute ? this.svgBounds.y : 0);
        }
    },
    computed: {
        portBarHeight() {
            return this.workflowBounds.bottom - this.workflowBounds.top;
        }
    }
};
