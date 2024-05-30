<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { formatTimeAgo } from "@vueuse/core";

import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";

import { API } from "@api";
import type { RecentWorkflow } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";

type RecentWorkflowItem = FileExplorerItem<{ recentWorkflow: RecentWorkflow }>;

const items = ref<RecentWorkflowItem[]>([]);
const store = useStore();
const spaceProviders = computed(() => store.state.spaces.spaceProviders ?? {});

const toFileExplorerItem = (
  recentWorkflow: RecentWorkflow,
  id: number,
): RecentWorkflowItem => ({
  id: id.toString(),
  name: recentWorkflow.name,
  isDirectory: false,
  isOpenableFile: true,
  isOpen: false,
  canBeDeleted: false,
  canBeRenamed: false,
  meta: { recentWorkflow },
});

const getRecentWorkflows = async () => {
  const recentWorkflows =
    await API.desktop.updateAndGetMostRecentlyUsedProjects();

  items.value = recentWorkflows.map(toFileExplorerItem);
};

const getSpaceProviderName = (recentWorkflow: RecentWorkflow) => {
  const { origin } = recentWorkflow;
  const provider = spaceProviders.value[origin.providerId];

  return provider?.name;
};

onMounted(() => {
  getRecentWorkflows();
});
</script>

<template>
  <div class="recent-workflows">
    <div class="title">Recent used workflows and components</div>

    <div class="list">
      <FileExplorer
        is-root-folder
        :items="items"
        disable-context-menu
        disable-multi-select
        disable-dragging
        empty-folder-message="No recent workflows to display"
      >
        <template #itemIcon><WorkflowIcon /></template>
        <template #itemContent="{ item }">
          <div class="item-content">
            <span>{{ item.name }}</span>

            <div class="item-meta">
              <span class="provider">{{
                getSpaceProviderName(item.meta!.recentWorkflow)
              }}</span>
              <span class="date">
                {{
                  formatTimeAgo(new Date(item.meta!.recentWorkflow.timeUsed))
                }}
              </span>
            </div>
          </div>
        </template>
      </FileExplorer>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.recent-workflows {
  padding: 30px 50px;

  & .title {
    font-weight: 700;
    font-size: 20px;
    line-height: 28px;
    padding-bottom: 20px;
  }

  & .item-content {
    display: flex;
    justify-content: space-between;

    & .item-meta {
      width: 50%;
      display: flex;
      gap: 20px;
      justify-content: space-between;
    }
  }
}
</style>
