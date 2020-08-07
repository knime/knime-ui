<script>
import { mapState } from 'vuex';
import portShift from '~/util/portShift';

/**
 * A curved line, connecting one node's output with another node's input port.
 * Must be embedded in an `<svg>` element.
 */
export default {
    props: {
        /**
         * Node ID of the connector's source node
         */
        sourceNode: { type: String, required: true },
        /**
         * Node ID of the connector's target node
         */
        destNode: { type: String, required: true },
        /**
         * Index of the source node's output port that this connector is attached to
         */
        sourcePort: { type: Number, required: true },
        /**
         * Index of the target node's input port that this connector is attached to
         */
        destPort: { type: Number, required: true }
    },
    computed: {
        ...mapState('workflows', ['workflow']),
        source() {
            return this.workflow.nodes[this.sourceNode];
        },
        target() {
            return this.workflow.nodes[this.destNode];
        },
        start() {
            const [dx, dy] = portShift(this.sourcePort, this.source.outPorts.length, true);
            let { x, y } = this.source.position;
            return [
                x + dx,
                y + dy
            ];
        },
        end() {
            const [dx, dy] = portShift(this.destPort, this.target.inPorts.length);
            let { x, y } = this.target.position;
            return [
                x + dx,
                y + dy
            ];
        },
        path() {
            const { start: [x1, y1], end: [x2, y2] } = this;
            const width = Math.abs(x1 - x2 + this.$shapes.portSize);
            const height = Math.abs(y1 - y2);
            // TODO: include bendpoints NXT-78 NXT-191
            // Currently, this is creates just an arbitrary curve that seems to work in most cases
            return `M${x1},${y1} h${this.$shapes.portSize / 2} ` + // eslint-disable-line no-magic-numbers
                `C${x1 + width / 2 + height / 3},${y1} ` + // eslint-disable-line no-magic-numbers
                `${x2 - width / 2 - height / 3},${y2} ` + // eslint-disable-line no-magic-numbers
                `${x2 - this.$shapes.portSize / 2},${y2} h${this.$shapes.portSize / 2}`; // eslint-disable-line no-magic-numbers
        }
    }
};
</script>

<template>
  <path
    :d="path"
    :stroke="$colors.connectorColors.default"
    :stroke-width="$shapes.connectorWidth"
    fill="none"
  />
</template>

<style scoped>
path {
  transition: stroke-width 0.1s linear, stroke 0.1s linear;
  cursor: grab;
}

path:hover {
  stroke-width: 2.5;
  stroke: var(--knime-dove-gray);
}
</style>
