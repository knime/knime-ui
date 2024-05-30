<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatTimeAgo } from "@vueuse/core";
import { isEqual } from "lodash-es";

import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import NodeWorkflowIcon from "webapps-common/ui/assets/img/icons/node-workflow.svg";
import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";

import { API } from "@api";
import type { RecentWorkflow } from "@/api/custom-types";
import { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";

type RecentWorkflowItem = FileExplorerItem<{ recentWorkflow: RecentWorkflow }>;

const items = ref<RecentWorkflowItem[]>([]);
const store = useStore();
const $router = useRouter();
const $toast = getToastsProvider();

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

const openRecentWorkflow = async (item: FileExplorerItem) => {
  const {
    recentWorkflow: { origin },
  } = (item as RecentWorkflowItem).meta!;

  try {
    await store.dispatch("spaces/openProject", {
      ...origin,
      $router,
    });
  } catch (error) {
    consola.log("could not open recent workflow", error);

    $toast.show({
      type: "warning",
      headline: "Workflow not found",
      message: "The workflow you tried to open was not found",
    });

    items.value = items.value.filter(
      (item) => !isEqual(item.meta?.recentWorkflow.origin, origin),
    );

    API.desktop.removeMostRecentlyUsedProject({
      spaceProviderId: origin.providerId,
      ...origin,
    });
  }
};

const getIcon = (recentWorkflow: RecentWorkflow) => {
  const icons = {
    [SpaceItemReference.ProjectTypeEnum.Workflow]: WorkflowIcon,
    [SpaceItemReference.ProjectTypeEnum.Component]: NodeWorkflowIcon,
  };

  return recentWorkflow.origin.projectType
    ? icons[recentWorkflow.origin.projectType]
    : WorkflowIcon;
};
</script>

<template>
  <div class="recent-workflows">
    <div class="title">Recent used workflows and components</div>

    <div class="list" data-test-id="recent-workflows">
      <FileExplorer
        :items="items"
        disable-context-menu
        disable-multi-select
        disable-dragging
        empty-folder-message="No recent workflows to display"
        @open-file="openRecentWorkflow"
      >
        <template #emptyFolder> There are no recent workflows </template>

        <template #itemIcon="{ item }">
          <Component :is="getIcon(item.meta!.recentWorkflow)" />
        </template>

        <template #itemContent="{ item }">
          <div class="item-content">
            <span data-test-id="recent-workflow-name">{{ item.name }}</span>

            <div class="item-meta">
              <span data-test-id="recent-workflow-provider">
                {{ getSpaceProviderName(item.meta!.recentWorkflow) }}
              </span>
              <span data-test-id="recent-workflow-time">
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
