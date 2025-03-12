<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { isBrowser } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { TABS, type TabValues, usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";

import AppKanvasSkeleton from "./AppKanvasSkeleton.vue";
import AppRightPanelSkeleton from "./AppRightPanelSkeleton.vue";
import AppSidebarSkeletonContent from "./AppSidebarSkeletonContent.vue";
import AppSidebarSkeletonTabs from "./AppSidebarSkeletonTabs.vue";
import AppToolbarSkeleton from "./AppToolbarSkeleton.vue";

const { activeProjectId } = storeToRefs(useApplicationStore());
const { isLoadingApp, isLoadingWorkflow, isChangingProject } = storeToRefs(
  useLifecycleStore(),
);
const { settings } = storeToRefs(useSettingsStore());
const { error: workflowError } = storeToRefs(useWorkflowStore());
const { isSidepanelOpen: isVersionsSidepanelOpen } = storeToRefs(
  useWorkflowVersionsStore(),
);

const splitterWidthPx = 1;

const bottomPanelHeight = computed(() => settings.value.nodeOutputSize);
const topPanelHeight = computed(() => 100 - bottomPanelHeight.value);
const rightPanelWidth = computed(
  () => settings.value.nodeDialogSize + splitterWidthPx,
);

const isLoading = computed(() => isLoadingApp.value || isLoadingWorkflow.value);

const isChangingBetweenWorkflows = computed(() => {
  return Boolean(
    isLoadingWorkflow.value && activeProjectId.value && !isLoadingApp.value,
  );
});

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
      usePanelStore().activeTab[activeProjectId.value!],
    )
  );
});

const isLeftPanelOpen = computed(() => usePanelStore().expanded);

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
          class="kanvas-skeleton"
          :is-logo-shown="isLogoShown"
          :workflow-error="workflowError"
        />

        <AppRightPanelSkeleton
          v-if="isBrowser || isVersionsSidepanelOpen"
          :transparent="isVersionsSidepanelOpen"
          :width="rightPanelWidth"
          with-border
        />
      </div>
      <div class="splitter-skeleton" />
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
  z-index: v-bind("$zIndices.layerAppSkeletonLoader");
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
    height: calc(var(--app-main-content-height) - var(--app-toolbar-height));

    & .top-panel-skeleton {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(
        v-bind("`${topPanelHeight}%`") - v-bind("`${splitterWidthPx}px`")
      );

      & .kanvas-skeleton {
        height: 100%;
        align-items: center;
        background: var(--knime-white);
      }
    }

    & .splitter-skeleton {
      border-top: v-bind("`${splitterWidthPx}px`") solid
        var(--knime-silver-sand);
    }

    & .bottom-panel-skeleton {
      height: calc(v-bind("`${bottomPanelHeight}%`"));
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
      align-items: center;
      background: var(--knime-white);
    }
  }

  & .sidebar-tabs-skeleton {
    grid-area: tabs;
  }
}
</style>
