<script>
import NodeTorsoMissing from '~/components/NodeTorsoMissing';
import NodeTorsoUnknown from '~/components/NodeTorsoUnknown';
import NodeTorsoSubnode from '~/components/NodeTorsoSubnode';

const backgroundPaths = {
    default: 'M0,29.2L0,2.8C0,1.3,1.3,0,2.8,0l26.3,0C30.7,0,32,1.3,32,2.8v26.3c0,1.6-1.3,2.8-2.8,2.8H2.8C1.3,32,0,30.' +
        '7,0,29.2z',
    LoopEnd: 'M32,2.8v26.3c0,1.6-1.3,2.8-2.8,2.8H4L0,16.1L4,0l25.2,0C30.7,0,32,1.3,32,2.8z',
    LoopStart: 'M0,29.2L0,2.8C0,1.3,1.3,0,2.8,0L32,0l-4,15.9L32,32H2.8C1.3,32,0,30.7,0,29.2z',
    ScopeEnd: 'M32,2.8v26.3c0,1.6-1.3,2.8-2.8,2.8H4L0,16.1L4,0l25.2,0C30.7,0,32,1.3,32,2.8z',
    ScopeStart: 'M0,29.2L0,2.8C0,1.3,1.3,0,2.8,0L32,0l-4,15.9L32,32H2.8C1.3,32,0,30.7,0,29.2z',
    VirtualIn: 'M32,2.8v26.3c0,1.6-1.3,2.8-2.8,2.8H6.5L0,25.9l5.2-10L0.7,7.2L6.5,0l22.7,0C30.7,0,32,1.3,32,2.8z',
    VirtualOut: 'M0,29.2L0,2.8C0,1.3,1.3,0,2.8,0L32,0l-5.8,7.2l4.5,8.7l-5.2,10L32,32H2.8C1.3,32,0,30.7,0,29.2z'
};

/**
 * Main part of the node icon.
 * Mostly a rounded square (or for some special nodes like loop nodes, a dedicated shape).
 * Must be embedded in an <svg> element.
 */
export default {
    components: {
        NodeTorsoMissing,
        NodeTorsoSubnode,
        NodeTorsoUnknown
    },
    props: {
        /**
         * Node type, e.g. "Learner", "Visualizer"
         * Is undefined for MetaNodes
         */
        type: { type: String, default: null },
        /**
         * Node variation.
         * @values 'node', 'metanode', 'component'
         */
        kind: { type: String, default: 'node' }
    },
    computed: {
        backgroundPath() {
            return backgroundPaths[this.type] || backgroundPaths.default;
        },
        background() {
            return this.$colors.nodeBackgroundColors[this.type] || this.$colors.nodeBackgroundColors.default;
        }
    }
};
</script>

<template>
  <NodeTorsoUnknown
    v-if="type === 'Unknown'"
    class="bg"
  />
  <NodeTorsoMissing
    v-else-if="type === 'Missing'"
    class="bg"
  />
  <NodeTorsoSubnode
    v-else-if="kind === 'metanode'"
    class="bg"
  />
  <path
    v-else
    class="bg"
    :d="backgroundPath"
    :width="$shapes.nodeSize"
    :height="$shapes.nodeSize"
    :fill="background"
  />
</template>

<style>
.bg {
  cursor: grab;
}
</style>
