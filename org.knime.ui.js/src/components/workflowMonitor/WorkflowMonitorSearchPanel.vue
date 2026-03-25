<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";
import { storeToRefs } from "pinia";

import WorkflowMonitorContent from "./WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "./WorkflowMonitorMessage.vue";

const workflowMonitorStore = useWorkflowMonitorStore();
const { isLoading } = storeToRefs(workflowMonitorStore);

onMounted(() => workflowMonitorStore.activateWorkflowMonitor());
onBeforeUnmount(() => workflowMonitorStore.deactivateWorkflowMonitor());
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>Monitor</h2>
    </template>

    <SidebarPanelScrollContainer>
      <template v-if="isLoading">
        <div class="loading-category">
          <SkeletonItem width="100px" height="24px" />
        </div>
        <WorkflowMonitorMessage v-for="i in 3" :key="i" skeleton />
      </template>
      <WorkflowMonitorContent v-else />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.loading-category {
  text-align: center;
  padding: 20px;
}
</style>
