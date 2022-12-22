<script>
import { mapGetters } from 'vuex';
import { applyStyleRanges } from '@/util/styleRanges';
import AutoSizeForeignObject from '@/components/common/AutoSizeForeignObject.vue';

export default {
    components: { AutoSizeForeignObject },
    props: {
        value: {
            type: String,
            default: 'Node label'
        },
        kind: {
            type: String,
            default: ''
        },
        nodeId: {
            type: String,
            default: ''
        },
        /**
         * @values "left", "center", "right"
         */
        textAlign: {
            type: String,
            default: 'center',
            validator: val => ['left', 'center', 'right'].includes(val)
        },
        backgroundColor: {
            type: String,
            default: null
        },
        styleRanges: {
            type: Array,
            default: () => []
        }
    },
    computed: {
        ...mapGetters('selection', ['singleSelectedNode']),
        ...mapGetters('workflow', ['isWritable']),
        isMetanode() {
            return this.kind === 'metanode';
        },
        isSelected() {
            return this.nodeId === this.singleSelectedNode?.id;
        },
        textStyle() {
            return {
                textAlign: this.textAlign,
                backgroundColor: this.backgroundColor === '#FFFFFF' ? 'transparent' : this.backgroundColor
            };
        },
        styledText() {
            let { textRanges, isValid } = applyStyleRanges(this.styleRanges, this.value);
            if (!isValid) {
                consola.warn(`Invalid styleRanges: ${JSON.stringify(this.styleRanges)}. Using default style.`);
            }

            return textRanges;
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    v-if="value || isSelected"
    class="node-label-text-container"
    :y-offset="isMetanode ? $shapes.metanodeLabelOffsetY : $shapes.nodeLabelOffsetY"
    :parent-width="$shapes.nodeSize"
    :style="{ backgroundColor }"
    :max-width="99999"
  >
    <template #default="{ on }">
      <div
        class="node-label"
        :style="{ textAlign }"
        @contextmenu="$emit('contextmenu', $event)"
        @dblclick.left="isWritable ? $emit('request-edit') : null"
      >
        <span
          v-for="(part, i) in styledText"
          :key="i"
          class="text"
          :style="{
            fontSize: part.fontSize ? `${part.fontSize * $shapes.annotationsFontSizePointToPixelFactor}px` : null,
            color: part.color,
            fontWeight: part.bold ? 'bold': null,
            fontStyle: part.italic ? 'italic' : null,
            lineHeight: part.fontSize ? 1.1 : null
          }"
        >
          <slot :on="on">{{ part.text }}</slot>
        </span>
        <span
          v-if="!value && isWritable"
          class="text placeholder"
        >
          <slot :on="on">Add comment</slot>
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

  & .node-label {
    padding: calc(var(--node-name-padding-shape) * 1px);
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    white-space: pre-wrap;
  }

  & .text.placeholder {
    color: var(--knime-dove-gray);
    font-style: italic;
  }
}
</style>
