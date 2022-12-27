<script>
import { applyStyleRanges } from '@/util/styleRanges';
import AutoSizeForeignObject from '@/components/common/AutoSizeForeignObject.vue';

export default {
    components: { AutoSizeForeignObject },
    props: {
        value: {
            type: String,
            default: 'Node label'
        },
        editable: {
            type: Boolean,
            default: false
        },
        isSelected: {
            type: Boolean,
            default: false
        },
        kind: {
            type: String,
            default: ''
        },
        nodeId: {
            type: String,
            default: ''
        },
        annotation: {
            type: Object,
            required: false,
            default: () => ({
                textAlign: 'center',
                backgroundColor: 'transparent',
                styleRanges: []
            })
        }
    },
    emits: ['requestEdit'],
    data() {
        return {
            textAlign: this.annotation?.textAlign,
            backgroundColor:
            this.annotation?.backgroundColor === '#FFFFFF' ? 'transparent' : this.annotation?.backgroundColor
        };
    },
    computed: {
        isMetanode() {
            return this.kind === 'metanode';
        },
        styledText() {
            const styleRanges = this.annotation ? this.annotation.styleRanges : [];
            let { textRanges, isValid } = applyStyleRanges(styleRanges, this.value);
            if (!isValid) {
                consola.warn(`Invalid styleRanges: 
                ${JSON.stringify(this.annotation.styleRanges)}. Using default style.`);
            }

            return textRanges;
        }
    },
    methods: {
        getTextStyles(styledTextPart) {
            const lineHeight = 1.1;
            return {
                fontSize: styledTextPart.fontSize
                    ? `${styledTextPart.fontSize * this.$shapes.annotationsFontSizePointToPixelFactor}px`
                    : null,
                color: styledTextPart.color,
                fontWeight: styledTextPart.bold ? 'bold' : null,
                fontStyle: styledTextPart.italic ? 'italic' : null,
                lineHeight: styledTextPart.fontSize ? lineHeight : null
            };
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
        @dblclick.left="editable ? $emit('requestEdit') : null"
      >
        <span
          v-for="(part, i) in styledText"
          :key="i"
          class="text"
          :style="getTextStyles(part)"
        >
          <slot :on="on">{{ part.text }}</slot>
        </span>
        <span
          v-if="!value && editable"
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
