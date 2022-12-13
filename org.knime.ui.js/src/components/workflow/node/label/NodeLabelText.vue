<script>
import AutoSizeForeignObject from '@/components/common/AutoSizeForeignObject.vue';

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
        kind: {
            type: String,
            default: ''
        }
    },
    computed: {
        isMetanode() {
            return this.kind === 'metanode';
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="node-label-text-container"
    class="node-label-text-container"
    :y-offset="isMetanode ? $shapes.metanodeLabelOffsetY : $shapes.nodeLabelOffsetY"
    :parent-width="$shapes.nodeSize"
  >
    <template #default="{ on }">
      <div
        class="node-label"
        @click.prevent="$emit('click', $event)"
        @contextmenu="$emit('contextmenu', $event)"
        @dblclick.left="$emit('request-edit')"
      >
        <span class="text">
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
    text-align: center;
  }

  & .node-label {
    text-align: center;
    padding: calc(var(--node-name-padding-shape) * 1px);
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
