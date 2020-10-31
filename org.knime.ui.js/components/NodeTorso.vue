<script>
import NodeTorsoMissing from '~/components/NodeTorsoMissing';
import NodeTorsoUnknown from '~/components/NodeTorsoUnknown';
import NodeTorsoMetanode from '~/components/NodeTorsoMetanode';

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
        NodeTorsoMetanode,
        NodeTorsoUnknown
    },
    inject: ['writeProtected'],
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
        kind: {
            type: String,
            required: true,
            validator: kind => ['node', 'metanode', 'component'].includes(kind)
        },
        
        /**
         * data-url containing Base64-encoded icon
         */
        icon: {
            type: String,
            default: null,
            validator: url => url.startsWith('data:image/')
        },
        
        /**
         * Execution state (only for meta nodes). Passed through to NodeTorsoMetanode
         */
        executionState: {
            type: String,
            default: null
        }
    },
    computed: {
        backgroundPath() {
            return backgroundPaths[this.type] || backgroundPaths.default;
        },
        background() {
            return this.$colors.nodeBackgroundColors[this.type];
        },
        componentBackgroundTransformation() {
            let offset = this.$shapes.nodeSize / 2;
            let scaleFactor = this.$shapes.componentBackgroundPortion;
            return `translate(${offset}, ${offset}) scale(${scaleFactor}) translate(-${offset}, -${offset})`;
        },
        // Returns false for broken nodes, which can occur during development, but should not occur in production.
        isKnownNode() {
            if (this.kind === 'component') {
                return !this.type || Reflect.has(this.$colors.nodeBackgroundColors, this.type);
            }
            return this.kind === 'metanode' || Reflect.has(this.$colors.nodeBackgroundColors, this.type);
        }
    }
};
</script>

<template>
  <NodeTorsoMissing
    v-if="type === 'Missing'"
    :class="{ 'grabbable': !writeProtected }"
  />
  <NodeTorsoMetanode
    v-else-if="kind === 'metanode'"
    :class="{ 'grabbable': !writeProtected }"
    :execution-state="executionState"
  />
  <g
    v-else-if="isKnownNode"
    :class="{ 'grabbable': !writeProtected }"
  >
    <path
      class="bg"
      :d="backgroundPath"
      :fill="kind === 'component' ? $colors.nodeBackgroundColors.Component : background"
    />
    <!-- components may have two layers of background. This is the inner part, a shrunk version of the outer frame -->
    <path
      v-if="kind === 'component' && type"
      class="bg"
      :d="backgroundPath"
      :fill="background"
      :transform="componentBackgroundTransformation"
    />
    <image
      v-if="icon"
      :href="icon"
      x="8"
      y="8"
      width="16"
      height="16"
      pointer-events="none"
    />
  </g>
  <NodeTorsoUnknown
    v-else
    :class="[{ 'write-protected': writeProtected }]"
  />
</template>

<style lang="postcss" scoped>
.grabbable {
  cursor: grab;
}
</style>
