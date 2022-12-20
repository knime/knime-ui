<script>
import { mapGetters } from 'vuex';
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
        editable: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        ...mapGetters('selection', ['singleSelectedNode']),
        isMetanode() {
            return this.kind === 'metanode';
        },
        isSelected() {
            return this.nodeId === this.singleSelectedNode?.id;
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
  >
    <template #default="{ on }">
      <div
        class="node-label"
        @contextmenu="$emit('contextmenu', $event)"
        @dblclick.left="editable ? $emit('request-edit') : null"
      >
        <span :class="['text', {'placeholder': !value}]">
          <slot
            v-if="!value && editable"
            :on="on"
          >Add comment</slot>
          <slot
            v-else
            :on="on"
          >{{ value }}</slot>
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
    text-align: center;
    white-space: pre-wrap;
  }

  & .text.placeholder {
    color: var(--knime-dove-gray);
    font-style: italic;
  }

  & .node-label {
    text-align: center;
    padding: calc(var(--node-name-padding-shape) * 1px);
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
