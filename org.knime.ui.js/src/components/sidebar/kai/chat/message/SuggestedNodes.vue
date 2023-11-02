<script setup lang="ts">
import { computed } from "vue";
import { isEmpty } from "lodash";
import NodeIcon from "webapps-common/ui/assets/img/icons/node.svg";
import NodeList from "@/components/nodeRepository/NodeList.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import useNodeDescriptionPanel from "../../useNodeDescriptionPanel";

const props = defineProps<{ nodeTemplates: [] }>();

const { toggleNodeDescription } = useNodeDescriptionPanel();

const hasNodeTemplates = computed(() => !isEmpty(props.nodeTemplates));
</script>

<template>
  <div v-if="hasNodeTemplates" class="nodes">
    <div class="title"><NodeIcon /> Nodes</div>
    <NodeList :nodes="nodeTemplates" class="node-list">
      <template #item="slotProps">
        <DraggableNodeTemplate
          v-bind="slotProps"
          @show-node-description="toggleNodeDescription(slotProps)"
        />
      </template>
    </NodeList>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .nodes {
  margin-top: 30px;

  & .title {
    display: flex;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;

    & svg {
      @mixin svg-icon-size 20;
      margin-top: -1px;
      margin-right: 5px;
    }
  }
  & .node-list {
    margin-left: -10px;
  }
}
</style>
