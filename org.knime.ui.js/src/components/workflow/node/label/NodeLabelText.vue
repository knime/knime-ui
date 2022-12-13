<script>
import AutoSizeForeignObject from '@/components/common/AutoSizeForeignObject.vue';

/**
 * Renders the node label and takes care of styling and clipping it when the contents are too large.
 * It wraps around AutoSizeForeignObject to render custom elements inside svg and forwards its events
 * and slot props
 */
export default {
    components: { AutoSizeForeignObject },
    props: {
        /**
         * The node's label text itself
         */
        value: {
            type: String,
            default: ''
        },
        /**
         * Forwarded to the AutoSizeForeignObject component
         */
        startWidth: {
            type: Number,
            default: null
        },
        /**
         * Forwarded to the AutoSizeForeignObject component
         */
        startHeight: {
            type: Number,
            default: null
        },
        kind: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            resizeKey: '0'
        };
    },
    computed: {
        textStyle() {
            return {
                textAlign: this.textAlign,
                backgroundColor: this.backgroundColor === '#FFFFFF' ? 'transparent' : this.backgroundColor,
                padding: `${this.$shapes.nodeAnnotationPadding}px`,
                fontSize: `${this.defaultFontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`
            };
        },
        isMetanode() {
            return this.kind === 'metanode';
        }
    },
    watch: {
        textAlign() {
            this.updateResizeKey();
        },
        defaultFontSize() {
            this.updateResizeKey();
        },
        text() {
            this.updateResizeKey();
        },
        styleRanges() {
            this.updateResizeKey();
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="node-label-text-container"
    class="node-label-text-container"
    :resize-key="resizeKey"
    :y-offset="isMetanode ? $shapes.metanodeLabelOffsetY : $shapes.nodeLabelOffsetY"
    :parent-width="$shapes.nodeSize"
    :max-width="$shapes.maxNodeAnnotationWidth"
  >
    <template #default="{ on }">
      <div
        class="node-label"
        @click.prevent="$emit('click', $event)"
        @contextmenu="$emit('contextmenu', $event)"
        @mouseleave="$emit('mouseleave', $event)"
        @mouseenter="$emit('mouseenter', $event)"
        @dblclick.left="$emit('request-edit')"
      >
        <span
          :style="{ 'max-width': `${$shapes.maxNodeNameWidth}px` }"
          :title="value"
          class="text"
        >
          <slot :on="on">{{ value }}</slot>
        </span>
      </div>
    </template>
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.node-label-text-container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &:hover {
    cursor: pointer;
    outline: 1px solid var(--knime-silver-sand);
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    text-align: inherit;
  }

  & .node-label {
    text-align: center;
    padding: calc(var(--node-name-padding-shape) * 1px);
    overflow: hidden;
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
