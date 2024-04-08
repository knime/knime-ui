<script setup lang="ts">
import { computed, ref, watch } from "vue";

import KnimeIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";
import { useStore } from "@/composables/useStore";
import SkeletonItem from "@/components/common/SkeletonItem.vue";
import { isBrowser } from "@/environment";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { TABS } from "@/store/panel";

const store = useStore();

const activeProjectId = computed(() => store.state.application.activeProjectId);
const isLoadingApp = computed(() => store.state.application.isLoadingApp);
const isLoadingWorkflow = computed(
  () => store.state.application.isLoadingWorkflow,
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
  return (
    isLoadingWorkflow.value && activeProjectId.value && !isLoadingApp.value
  );
});

// If the node repository is visible we don't show the skeleton over it
// when changing between workflows
const isSidebarVisible = computed(() => {
  return (
    isChangingBetweenWorkflows.value &&
    store.state.panel.activeTab[activeProjectId.value!] === TABS.NODE_REPOSITORY
  );
});

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
      'main-content',
      'skeleton',
      { transparent: isChangingBetweenWorkflows },
    ]"
  >
    <div
      class="toolbar-skeleton"
      :class="{ transparent: isChangingBetweenWorkflows }"
    >
      <template v-if="!isChangingBetweenWorkflows">
        <SkeletonItem
          width="30px"
          height="30px"
          type="icon-button"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
        <SkeletonItem
          width="30px"
          height="30px"
          type="icon-button"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
        <SkeletonItem
          width="100px"
          type="button"
          class="button-skeleton-normal"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
        <SkeletonItem
          width="100px"
          type="button"
          class="button-skeleton-normal"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
      </template>
    </div>

    <div
      :class="{ transparent: isChangingBetweenWorkflows }"
      class="sidebar-tabs-skeleton"
    >
      <template v-if="!isChangingBetweenWorkflows">
        <SkeletonItem
          width="40px"
          height="50px"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
        <SkeletonItem
          width="40px"
          height="50px"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
        <SkeletonItem
          width="40px"
          height="50px"
          :style="{ border: '1px solid var(--knime-silver-sand)' }"
        />
      </template>
    </div>

    <div
      class="sidebar-content-skeleton"
      :class="{ transparent: isSidebarVisible }"
    >
      <template v-if="!isSidebarVisible">
        <SkeletonItem height="16px" width="70%" />
        <SkeletonItem height="16px" />
        <SkeletonItem height="16px" />
        <SkeletonItem height="16px" width="30%" />
      </template>
    </div>

    <div class="workflow-skeleton">
      <div class="top-panel-skeleton">
        <div class="canvas-skeleton">
          <KnimeIcon v-if="isLogoShown" class="elastic-spin" />
        </div>
        <div v-if="isBrowser" class="right-panel-skeleton">
          <SkeletonItem height="32px" />

          <div class="form-skeleton">
            <SkeletonItem width="50%" />
            <SkeletonItem width="50%" />
          </div>

          <div class="buttons-skeleton">
            <SkeletonItem width="100px" type="button" />
            <SkeletonItem width="100px" type="button" />
          </div>
        </div>
      </div>

      <div class="bottom-panel-skeleton">
        <SkeletonItem width="50%" height="16px" />
        <SkeletonItem width="50%" height="16px" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.transparent {
  background: transparent !important;
}

.main-content {
  grid-area: workflow;
  width: 100vw;
  height: 100vh;
  cursor: progress;

  /* Make sure nothing will be on top of this skeleton */
  z-index: calc(infinity);
}

.skeleton {
  background: var(--knime-white);
  display: grid;
  grid-template:
    "toolbar toolbar toolbar" min-content
    "tabs sidebar workflow" auto / min-content min-content auto;

  & .toolbar-skeleton {
    grid-area: toolbar;
    background: var(--knime-porcelain);
    border-bottom: 1px solid var(--knime-silver-sand);
    min-height: var(--app-toolbar-height);
    display: flex;
    gap: 10px;
    padding: 10px;
    align-items: center;
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

      & .canvas-skeleton {
        display: flex;
        flex: 1;
        justify-content: center;

        & svg {
          @mixin svg-icon-size 50;
        }

        & .elastic-spin {
          transform-origin: 50% 65%;
          animation: elastic-spin 3.8s infinite ease;
        }
      }

      & .right-panel-skeleton {
        background: var(--sidebar-background-color);
        border-left: 1px solid var(--knime-silver-sand);
        height: 100%;
        margin-left: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: calc(calc(v-bind("rightPanelWidth + 12") * 1px));

        & .form-skeleton {
          display: flex;
          height: 150px;
          gap: 8px;
          margin-top: 12px;
        }

        & .buttons-skeleton {
          margin-top: auto;
          height: 40px;
          display: flex;
          justify-content: space-between;
        }
      }
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
    background: var(--knime-black);
    min-width: 40px;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  & .sidebar-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 370px;
    padding: 20px;
    border-right: 1px solid var(--knime-silver-sand);
    background: var(--sidebar-background-color);
  }
}
</style>
