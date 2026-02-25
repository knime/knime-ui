<script setup lang="ts">
import { onMounted, ref } from "vue";
import { formatTimeAgo } from "@vueuse/core";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { Button, FileExplorer, useHint } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";
import CloudComponentIcon from "@knime/styles/img/icons/cloud-component.svg";
import CloudWorkflowIcon from "@knime/styles/img/icons/cloud-workflow.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";
import TimeIcon from "@knime/styles/img/icons/time.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import type { RecentWorkflow, SpaceProviderNS } from "@/api/custom-types";
import { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { HINTS } from "@/hints/hints.config";
import { getToastPresets } from "@/services/toastPresets";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { cachedLocalSpaceProjectId } from "@/store/spaces/common";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { formatSpaceProviderName, isLocalProvider } from "@/store/spaces/util";

import PageTitle from "./PageTitle.vue";
import RecentWorkflowContextMenu from "./RecentWorkflowContextMenu.vue";

type RecentWorkflowItem = FileExplorerItem<{ recentWorkflow: RecentWorkflow }>;

const items = ref<RecentWorkflowItem[]>([]);
const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
const { connectProvider } = useSpaceAuthStore();
const { openProject, fetchWorkflowGroupContent } = useSpaceOperationsStore();
const { setCreateWorkflowModalConfig } = useSpacesStore();
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

const getRecentWorkflows = async () => {
  const recentWorkflows =
    await API.desktop.updateAndGetMostRecentlyUsedProjects();

  items.value = recentWorkflows.map(toFileExplorerItem);
};

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

const openRecentWorkflow = async (item: FileExplorerItem) => {
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
  } catch (error) {
    consola.error("Could not open recent workflow:", error);

    toastPresets.app.openProjectFailed({ error });
  }
};

const createNewWorkflowButton = ref<InstanceType<typeof Button>>();

const { createHint } = useHint();

onMounted(() => {
  createHint({
    hintId: HINTS.NEW_WORKFLOW,
    referenceElement: createNewWorkflowButton,
  });
});

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

const createWorkflowLocally = async () => {
  await fetchWorkflowGroupContent({
    projectId: cachedLocalSpaceProjectId,
  });

  setCreateWorkflowModalConfig({
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
          ref="createNewWorkflowButton"
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
        disable-multi-select
        disable-dragging
        disable-options-menu
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
          <Component
            :is="getIcon(item.meta!.recentWorkflow as RecentWorkflow)"
          />
        </template>

        <template #dynamicColumnProvider="{ item }">
          <span
            class="dynamic-column provider-name"
            data-test-id="recent-workflow-provider"
          >
            {{
              getSpaceProviderName(item.meta!.recentWorkflow as RecentWorkflow)
            }}
          </span>
        </template>

        <template #dynamicColumnTimeUsed="{ item }">
          <span
            class="dynamic-column time-used"
            data-test-id="recent-workflow-time"
          >
            {{
              formatTimeAgo(
                new Date(
                  (item.meta!.recentWorkflow as RecentWorkflow).timeUsed,
                ),
              )
            }}
          </span>
        </template>

        <template #contextMenu="{ anchor, onItemClick, closeContextMenu }">
          <RecentWorkflowContextMenu
            :anchor="anchor"
            :on-item-click="onItemClick"
            :close-context-menu="closeContextMenu"
          />
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
}

.list {
  --file-explorer-item-grid: 2fr 1fr 100px;
}

.dynamic-column {
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-used {
  text-align: right;
  width: 100%;
}

.create-workflow-button {
  & svg {
    margin-right: 4px;
  }
}

@container wrapper (max-width: 580px) {
  .list {
    --file-explorer-item-grid: 4fr 1fr 0;

    & .time-used {
      display: none;
    }
  }

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

@container wrapper (max-width: 380px) {
  .list {
    --file-explorer-item-grid: 1fr 0 0;

    & .provider-name,
    & .time-used {
      display: none;
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
