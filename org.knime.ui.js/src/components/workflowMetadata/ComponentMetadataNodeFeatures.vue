<script lang="ts">
import { defineComponent } from "vue";
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";

export default defineComponent({
  components: {
    NodeFeatureList,
  },
  props: {
    nodeFeatures: {
      type: Object,
      required: true,
    },
  },
});
</script>

<template>
  <NodeFeatureList
    :in-ports="nodeFeatures.inPorts"
    :dyn-in-ports="nodeFeatures.dynInPorts"
    :out-ports="nodeFeatures.outPorts"
    :dyn-out-ports="nodeFeatures.dynOutPorts"
    :views="nodeFeatures.views"
    :options="nodeFeatures.options"
    sanitize-content
    class="node-feature-list"
  />
</template>

<style lang="postcss" scoped>
.node-feature-list {
  margin-bottom: 40px;

  & :deep(.shadow-wrapper::after),
  & :deep(.shadow-wrapper::before) {
    display: none;
  }

  & :deep(h6) {
    font-size: 16px;
    margin-bottom: 0;
  }

  & :deep(.description) {
    font-size: 16px;
  }

  /* Style refinement for Options */
  & :deep(.options .panel) {
    padding-left: 0;
    margin-left: 52px;

    & li > * {
      margin-left: 8px;
    }

    & .option-field-name {
      margin-bottom: 5px;
    }
  }

  /* Style refinement for Views */
  & :deep(.views-list) {
    & .content {
      margin-top: 5px;
      margin-left: 30px;
    }

    & svg {
      margin-right: 8px;
    }
  }

  /* Style refinement for Ports */
  & :deep(.ports-list) {
    & .content {
      & ol {
        margin-left: 28px;
        margin-top: 22px;
      }

      & .dyn-ports-description {
        margin-top: 10px;
      }
    }
  }
}
</style>
