<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useStore } from "@/composables/useStore";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { isBrowser } from "@/environment";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { TABS, type TabValues } from "@/store/panel";

import AppRightPanelSkeleton from "./AppRightPanelSkeleton.vue";
import AppToolbarSkeleton from "./AppToolbarSkeleton.vue";
import AppSidebarSkeletonContent from "./AppSidebarSkeletonContent.vue";
import AppSidebarSkeletonTabs from "./AppSidebarSkeletonTabs.vue";
import AppKanvasSkeleton from "./AppKanvasSkeleton.vue";

const store = useStore();

const activeProjectId = computed(() => store.state.application.activeProjectId);

const isLoadingApp = computed(() => store.state.application.isLoadingApp);
const isLoadingWorkflow = computed(
  () => store.state.application.isLoadingWorkflow,
);
const isChangingProject = computed(
  () => store.state.application.isChangingProject,
);
const bottomPanelHeight = computed(
  () => store.state.settings.settings.nodeOutputSize,
);
const topPanelHeight = computed(() => 100 - bottomPanelHeight.value);
const rightPanelWidth = computed(() =>
  isBrowser ? store.state.settings.settings.nodeDialogSize : 0,
);

const isLoading = computed(() => isLoadingApp.value || isLoadingWorkflow.value);

const isChangingBetweenWorkflows = computed(() => {
  return Boolean(
    isLoadingWorkflow.value && activeProjectId.value && !isLoadingApp.value,
  );
});

const workflowError = computed(() => store.state.workflow.error);

const isSkeletonTransparentForTab = (currentTab: TabValues) => {
  if (currentTab === TABS.NODE_REPOSITORY) {
    return true;
  }

  // make it transparent when switching across projects (tabs)
  // but not when switching in the same workflow (eg: enter/exit components)
  if (currentTab === TABS.WORKFLOW_MONITOR) {
    return !isChangingProject.value;
  }

  return false;
};

const isSidebarTransparent = computed(() => {
  return (
    isChangingBetweenWorkflows.value &&
    isSkeletonTransparentForTab(
      store.state.panel.activeTab[activeProjectId.value!],
    )
  );
});

const isLeftPanelOpen = computed(() => store.state.panel.expanded);

const isLogoShown = ref(false);
const setLogoVisible = createStaggeredLoader({
  firstStageCallback: () => {
    isLogoShown.value = true;
  },
  resetCallback: () => {
    isLogoShown.value = false;
  },
});

watch(isLoading, (value) => {
  setLogoVisible(value);
});
</script>

<template>
  <div
    v-if="isLoading"
    :class="[
      'app-skeleton',
      {
        transparent: isChangingBetweenWorkflows,
        'with-left-panel': isLeftPanelOpen,
        'no-left-panel': !isLeftPanelOpen,
      },
    ]"
  >
    <AppToolbarSkeleton
      :is-changing-between-workflows="isChangingBetweenWorkflows"
      class="toolbar-skeleton"
      :class="{ transparent: isChangingBetweenWorkflows }"
    />

    <AppSidebarSkeletonTabs
      class="sidebar-tabs-skeleton"
      :is-changing-between-workflows="isChangingBetweenWorkflows"
      :class="{ transparent: isChangingBetweenWorkflows }"
    />

    <AppSidebarSkeletonContent
      :is-left-panel-open="isLeftPanelOpen"
      :is-sidebar-transparent="isSidebarTransparent"
      :class="{ transparent: isSidebarTransparent }"
    />

    <div class="workflow-skeleton">
      <div class="top-panel-skeleton">
        <AppKanvasSkeleton
          :is-logo-shown="isLogoShown"
          :workflow-error="workflowError"
        />

        <AppRightPanelSkeleton
          v-if="isBrowser"
          :width="rightPanelWidth"
          with-border
        />
      </div>

      <div class="bottom-panel-skeleton">
        <SkeletonItem width="50%" height="16px" />
        <SkeletonItem width="50%" height="16px" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.transparent {
  background: transparent !important;
}

.app-skeleton {
  grid-area: workflow;
  width: 100vw;
  height: 100vh;
  cursor: progress;
  z-index: 9;
  background: var(--knime-white);
  display: grid;

  &.no-left-panel {
    grid-template:
      "toolbar toolbar" min-content
      "tabs workflow" auto / 40px auto;
  }

  &.with-left-panel {
    grid-template:
      "toolbar toolbar toolbar" min-content
      "tabs sidebar workflow" auto / min-content min-content auto;
  }

  & .toolbar-skeleton {
    grid-area: toolbar;
  }

  & .workflow-skeleton {
    grid-area: workflow;
    background: var(--knime-white);

    & .top-panel-skeleton {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(50% - var(--app-toolbar-height));
      height: calc(v-bind("`${topPanelHeight}%`") - var(--app-toolbar-height));
    }

    & .bottom-panel-skeleton {
      height: calc(
        v-bind("`${bottomPanelHeight}%`") - var(--app-toolbar-height)
      );
      border-top: 3px solid var(--knime-silver-sand);
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
      align-items: center;
    }
  }

  & .sidebar-tabs-skeleton {
    grid-area: tabs;
  }
}
</style>
