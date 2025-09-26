<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { formatTimeAgo } from "@vueuse/core";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { FileExplorer } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";
import CloudComponentIcon from "@knime/styles/img/icons/cloud-component.svg";
import CloudWorkflowIcon from "@knime/styles/img/icons/cloud-workflow.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import TimeIcon from "@knime/styles/img/icons/time.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import type { RecentWorkflow, SpaceProviderNS } from "@/api/custom-types";
import { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { formatSpaceProviderName, isLocalProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

import RecentWorkflowContextMenu from "./RecentWorkflowContextMenu.vue";

type Props = {
  filterQuery?: string;
  disableContextMenu?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  filterQuery: "",
  disableContextMenu: false,
});

const emit = defineEmits<{
  onOpen: [RecentWorkflow];
}>();

type RecentWorkflowItem = FileExplorerItem<{ recentWorkflow: RecentWorkflow }>;

const items = ref<RecentWorkflowItem[]>([]);
const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
const { connectProvider } = useSpaceAuthStore();
const { openProject } = useSpaceOperationsStore();

const $router = useRouter();
const { toastPresets } = getToastPresets();

const getProvider = (recentWorkflow: RecentWorkflow) => {
  return (spaceProviders.value ?? {})[recentWorkflow.origin.providerId];
};

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

const isLoading = ref(false);
const getRecentWorkflows = async () => {
  isLoading.value = true;
  const recentWorkflows =
    await API.desktop.updateAndGetMostRecentlyUsedProjects();

  items.value = recentWorkflows.map(toFileExplorerItem);
  isLoading.value = false;
};

const filteredItems = computed(() =>
  items.value.filter((item) =>
    item.name.toLowerCase().includes(props.filterQuery.toLowerCase()),
  ),
);

const getSpaceProviderName = (recentWorkflow: RecentWorkflow) => {
  const provider = getProvider(recentWorkflow);
  return provider ? formatSpaceProviderName(provider) : "…";
};

onMounted(() => {
  getRecentWorkflows();
});

const tryConnectToProvider = async (
  provider: SpaceProviderNS.SpaceProvider,
) => {
  try {
    const { isConnected } = await connectProvider({
      spaceProviderId: provider.id,
    });

    return isConnected;
  } catch (error) {
    toastPresets.spaces.auth.connectFailed({
      error,
      providerName: provider.name,
    });

    return false;
  }
};

const openRecentWorkflow = async (item: RecentWorkflowItem) => {
  const {
    recentWorkflow: { origin },
  } = (item as RecentWorkflowItem).meta!;
  const provider = getProvider(
    (item as RecentWorkflowItem).meta!.recentWorkflow,
  );

  if (!provider.connected) {
    const isConnected = await tryConnectToProvider(provider);

    if (!isConnected) {
      return;
    }
  }

  try {
    await openProject({ ...origin, $router });
    emit("onOpen", item.meta!.recentWorkflow);
  } catch (error) {
    consola.error("Could not open recent workflow:", error);

    toastPresets.app.openProjectFailed({ error });
  }
};

const getIcon = (recentWorkflow: RecentWorkflow) => {
  const provider = getProvider(recentWorkflow);

  const icons = {
    [SpaceItemReference.ProjectTypeEnum.Workflow]: isLocalProvider(
      provider || {},
    )
      ? WorkflowIcon
      : CloudWorkflowIcon,
    [SpaceItemReference.ProjectTypeEnum.Component]: isLocalProvider(
      provider || {},
    )
      ? NodeWorkflowIcon
      : CloudComponentIcon,
  };

  return recentWorkflow.origin.projectType
    ? icons[recentWorkflow.origin.projectType]
    : WorkflowIcon;
};

const emptyMessage = computed(() => {
  const hasNoItems =
    items.value.length === 0 && filteredItems.value.length === 0;

  const title = hasNoItems
    ? "You don't have any recent workflows yet"
    : "No matching results";

  const subtitle = hasNoItems
    ? "Once you open a workflow or a component you will be able to quickly find it here."
    : "Change your filter query to get different results.";

  return { title, subtitle };
});
</script>

<template>
  <FileExplorer
    :items="filteredItems"
    class="recent-workflows-list"
    disable-multi-select
    disable-dragging
    :disable-context-menu="disableContextMenu"
    @open-file="(e) => openRecentWorkflow(e as RecentWorkflowItem)"
  >
    <template v-if="!isLoading" #emptyFolder>
      <div
        data-test-id="no-recent-workflows"
        class="no-recent-workflows-wrapper"
      >
        <div class="no-recent-workflows">
          <TimeIcon />
          <h3>{{ emptyMessage.title }}</h3>
          <p>
            {{ emptyMessage.subtitle }}
          </p>
        </div>
      </div>
    </template>

    <template #itemIcon="{ item }">
      <Component :is="getIcon(item.meta!.recentWorkflow as RecentWorkflow)" />
    </template>

    <template #itemContent="{ item }">
      <div class="item-content">
        <span data-test-id="recent-workflow-name">{{ item.name }}</span>

        <div class="item-meta">
          <span class="provider-name" data-test-id="recent-workflow-provider">
            {{
              getSpaceProviderName(item.meta!.recentWorkflow as RecentWorkflow)
            }}
          </span>
          <span data-test-id="recent-workflow-time">
            {{
              formatTimeAgo(
                new Date(
                  (item.meta!.recentWorkflow as RecentWorkflow).timeUsed,
                ),
              )
            }}
          </span>
        </div>
      </div>
    </template>

    <template #contextMenu="{ anchor, onItemClick, closeContextMenu }">
      <RecentWorkflowContextMenu
        :anchor="anchor"
        :on-item-click="onItemClick"
        :close-context-menu="closeContextMenu"
      />
    </template>
  </FileExplorer>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.recent-workflows-list {
  overflow-y: auto;

  & .item-content {
    display: flex;
    width: 100%;
    justify-content: space-between;

    & .item-meta {
      width: 50%;
      display: flex;
      gap: 20px;
      justify-content: space-between;

      & .provider-name {
        @mixin truncate;
      }
    }
  }
}

.no-recent-workflows-wrapper {
  display: flex;
  justify-content: center;

  & .no-recent-workflows {
    padding: 20px;
    margin-top: 220px;
    color: var(--knime-dove-gray);
    font-size: 12px;
    text-align: center;

    & svg {
      stroke: var(--knime-dove-gray);

      @mixin svg-icon-size 60;
    }
  }
}
</style>
