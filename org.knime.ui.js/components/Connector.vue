<script>
import { mapState } from 'vuex';
import portShift from '~/util/portShift';

export default {
    props: {
        source: { type: String, required: true },
        dest: { type: String, required: true },
        sourcePort: { type: Number, required: true },
        destPort: { type: Number, required: true }
    },
    computed: {
        ...mapState('workflows', ['workflow']),
        sourceNode() {
            return this.workflow.nodes[this.source];
        },
        targetNode() {
            return this.workflow.nodes[this.dest];
        },
        start() {
            const [dx, dy] = portShift(this.sourcePort, this.sourceNode.outPorts.length);
            let { x, y } = this.sourceNode.uIInfo.bounds;
            return [
                x + this.$shapes.nodeSize + dx,
                y + dy
            ];
        },
        end() {
            const [dx, dy] = portShift(this.destPort, this.targetNode.inPorts.length);
            let { x, y } = this.targetNode.uIInfo.bounds;
            return [
                x - dx,
                y + dy
            ];
        },
        path() {
            const { start: [x1, y1], end: [x2, y2] } = this;
            const width = Math.abs(x1 - x2);
            const height = Math.abs(y1 - y2);
            return `M${x1},${y1} C${x1 + width / 2 + height / 3},` + // eslint-disable-line no-magic-numbers
                `${y1} ${x2 - width / 2 - height / 3},${y2} ${x2},${y2}`; // eslint-disable-line no-magic-numbers
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

</style>
