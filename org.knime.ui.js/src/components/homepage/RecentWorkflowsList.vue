<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { formatTimeAgo } from "@vueuse/core";
import { isEqual } from "lodash-es";
import { useRouter } from "vue-router";

import { Button, FileExplorer } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";
import TimeIcon from "@knime/styles/img/icons/time.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import { API } from "@/api";
import type { RecentWorkflow } from "@/api/custom-types";
import { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";
import { cachedLocalSpaceProjectId } from "@/store/spaces";
import { formatSpaceProviderName } from "../spaces/formatSpaceProviderName";

import PageTitle from "./PageTitle.vue";

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
  if (!provider) {
    return "…";
  }
  return formatSpaceProviderName(provider);
};

onMounted(() => {
  getRecentWorkflows();
});

const openRecentWorkflow = async (item: FileExplorerItem) => {
  const {
    recentWorkflow: { origin },
  } = (item as RecentWorkflowItem).meta!;
  const provider = spaceProviders.value[origin.providerId];

  if (!provider.connected) {
    const { isConnected } = await store.dispatch("spaces/connectProvider", {
      spaceProviderId: provider.id,
    });

    // If login was cancelled don't continue
    if (!isConnected) {
      return;
    }
  }

  try {
    await store.dispatch("spaces/openProject", {
      ...origin,
      $router,
    });
  } catch (error) {
    consola.error("Could not open recent workflow:", error);

    $toast.show({
      type: "warning",
      headline: "Could not open workflow",
      message: `${error}`,
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

const createWorkflowLocally = async () => {
  await store.dispatch("spaces/fetchWorkflowGroupContent", {
    projectId: cachedLocalSpaceProjectId,
  });

  store.commit("spaces/setCreateWorkflowModalConfig", {
    isOpen: true,
    projectId: cachedLocalSpaceProjectId,
  });
};
</script>

<template>
  <div class="recent-workflows">
    <PageTitle title="Recently used workflows and components">
      <template #append>
        <Button
          compact
          primary
          class="create-workflow-button"
          title="Create new workflow"
          @click="createWorkflowLocally"
        >
          <PlusIcon />
          <span>Create new workflow</span>
        </Button>
      </template>
    </PageTitle>

    <div class="list" data-test-id="recent-workflows">
      <FileExplorer
        :items="items"
        disable-context-menu
        disable-multi-select
        disable-dragging
        @open-file="openRecentWorkflow"
      >
        <template #emptyFolder>
          <div
            data-test-id="no-recent-workflows"
            class="no-recent-workflows-wrapper"
          >
            <div class="no-recent-workflows">
              <TimeIcon />
              <h3>You don't have any recent workflows yet</h3>
              <p>
                Once you open a workflow or a component you will be able to
                quickly find it here.
              </p>
            </div>
          </div>
        </template>

        <template #itemIcon="{ item }">
          <Component :is="getIcon(item.meta!.recentWorkflow)" />
        </template>

        <template #itemContent="{ item }">
          <div class="item-content">
            <span data-test-id="recent-workflow-name">{{ item.name }}</span>

            <div class="item-meta">
              <span
                class="provider-name"
                data-test-id="recent-workflow-provider"
              >
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
@import url("@/assets/mixins.css");

.recent-workflows {
  padding: 24px;
  container: wrapper / inline-size;

  & .item-content {
    display: flex;
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

.create-workflow-button {
  & svg {
    margin-right: 4px;
  }
}

@container wrapper (max-width: 580px) {
  .create-workflow-button {
    width: 30px;
    height: 30px;

    & span {
      display: none;
    }

    & svg {
      margin-right: 0;
      padding-left: 1px;
      top: 0;
    }

    &.compact {
      min-width: auto;
      padding: 5px;
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
