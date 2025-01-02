<script setup lang="ts">
import { storeToRefs } from "pinia";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";

import WorkflowMonitorContent from "./WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "./WorkflowMonitorMessage.vue";
import { useWorkflowMonitorActivation } from "./useWorkflowMonitorActivation";

const { isLoading } = storeToRefs(useWorkflowMonitorStore());

useWorkflowMonitorActivation();
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>Workflow monitor</h2>
    </template>

    <SidebarPanelScrollContainer>
      <template v-if="isLoading">
        <div class="category">
          <SkeletonItem width="100px" height="24px" />
        </div>
        <WorkflowMonitorMessage v-for="index in 3" :key="index" skeleton />
      </template>

      <WorkflowMonitorContent v-else />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.category {
  text-align: center;
  padding: 20px;
}
</style>
