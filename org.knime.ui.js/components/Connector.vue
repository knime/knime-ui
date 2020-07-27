<script>
/* eslint-disable vue/require-default-prop */ // TODO: reevaluate after API-change NXT-228
import { mapState } from 'vuex';
import portShift from '~/util/portPosition';

export default {
    props: {
        type: String,
        source: String,
        dest: String,
        sourcePort: Number,
        destPort: Number,
        deletable: Boolean,
        bendPoints: Array,
        flowVariablePortConnection: Boolean,
        destCoordinates: Array
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
            // eslint-disable-next-line max-len, no-magic-numbers
            return `M${x1},${y1} C${x1 + width / 2 + height / 3},${y1} ${x2 - width / 2 - height / 3},${y2}, ${x2},${y2}`;
        }
    }
};
</script>

<template>
  <path
    :d="path"
    stroke="#c8c8c9"
    fill="none"
    stroke-width="1"
  />
</template>

<style scoped>

</style>
