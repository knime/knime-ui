<script>
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import MetadataPlaceholder from './MetadataPlaceholder.vue';

export default {
    components: {
        MetadataPlaceholder,
        NodePreview
    },
    props: {
        title: {
            type: String,
            default: null
        },
        nodePreview: {
            type: Object,
            default: null
        }
    }
};
</script>

<template>
  <div>
    <h2 :class="['title', { 'with-node-preview': nodePreview }]">
      <div
        v-if="nodePreview"
        class="node-preview"
      >
        <NodePreview v-bind="nodePreview" />
      </div>

      <span v-if="title">{{ title }}</span>
      <MetadataPlaceholder
        v-else
        text="No title has been set yet"
      />
    </h2>
    <hr v-if="!nodePreview">
  </div>
</template>

<style lang="postcss" scoped>
h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px; /* TODO: NXT-1164 maybe make line height smaller */
}

hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
}

.title {
  display: flex;
  align-items: center;
  margin-bottom: 5px;

  & .node-preview {
    height: 80px;
    width: 80px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
  }

  &.with-node-preview {
    margin-bottom: 20px;
  }
}
</style>
