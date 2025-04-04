<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { Carousel, FunctionButton, useHint } from "@knime/components";
import CodeHtmlIcon from "@knime/styles/img/icons/code-html.svg";
import CogIcon from "@knime/styles/img/icons/cog.svg";
import HouseIcon from "@knime/styles/img/icons/house.svg";
import PlusIcon from "@knime/styles/img/icons/plus-small.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import { useFloatingContextMenu } from "@/composables/useFloatingContextMenu";
import { useTabDrag } from "@/composables/useTabDrag";
import { HINTS } from "@/hints/hints.config";
import { useShortcuts } from "@/plugins/shortcuts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { AppHeaderContextMenu } from "./AppHeaderContextMenu";
import AppHeaderTab from "./AppHeaderTab.vue";
import AppMenu from "./AppMenu.vue";
import CommunityHubSignButton from "./CommunityHubSignButton.vue";
import HelpMenu from "./HelpMenu.vue";

/**
 * Header Bar containing Home, Open project tabs, and the 3 buttons Help, Preferences and Menu
 */

const windowWidth = ref(0);
const hoveredTab = ref<string | null>(null);

const $router = useRouter();
const $route = useRoute();
const $shortcuts = useShortcuts();

const activeProjectTab = computed(() => {
  if ($route.name === APP_ROUTES.WorkflowPage) {
    return $route.params.projectId;
  }

  return null;
});

const { isLoadingWorkflow } = storeToRefs(useLifecycleStore());
const { openProjects, activeProjectId } = storeToRefs(useApplicationStore());
const { dirtyProjectsMap } = storeToRefs(useDirtyProjectsTrackingStore());
const { devMode } = storeToRefs(useApplicationSettingsStore());
const devServer = import.meta.env.DEV;
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());

const hasWorkflowLoadingError = computed(() =>
  Boolean(useWorkflowStore().error),
);

const isHomePageActive = computed(() => {
  return $route.name !== APP_ROUTES.WorkflowPage;
});

const isHomeButtonActive = computed(() => {
  return (
    openProjects.value.length === 0 ||
    (!activeProjectId.value && !isLoadingWorkflow.value) ||
    isHomePageActive.value
  );
});

const createWorkflowTitle = computed(() => {
  const shortcut = $shortcuts.get("createWorkflow");
  return `${shortcut.text} (${shortcut.hotkeyText})`;
});

const hasOpenProjects = computed(() => {
  return openProjects.value.length >= 1;
});

const setupResizeListener = () => {
  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  window.addEventListener("resize", onResize);
  onResize();
};

setupResizeListener();

const reloadApp = () => (window.location.href = "/");

const openInspector = async () => {
  const remoteDebuggingPort =
    import.meta.env.KNIME_CEF_REMOTE_DEBUGGING_PORT || "8888";
  const remoteDebuggingUrl = `http://localhost:${remoteDebuggingPort}`;
  const response = await fetch(`${remoteDebuggingUrl}/json`);
  const targets = await response.json();
  targets.forEach((target) => {
    if (target.type === "page" && target.title === "KNIME Analytics Platform") {
      window.open(
        `${remoteDebuggingUrl}${target.devtoolsFrontendUrl}`,
        "_blank",
      );
    }
  });
};

const setGetStartedPageTab = () => {
  $router.push({ name: APP_ROUTES.Home.GetStarted });
};

const onProjectTabChange = (projectId: string) => {
  $router.push({
    name: APP_ROUTES.WorkflowPage,
    params: { projectId, workflowId: "root" },
  });
};

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};

const closeProject = (projectId: string) =>
  useDesktopInteractionsStore().closeProject(projectId);

const carousel = ref<InstanceType<typeof Carousel> | null>(null);
const onWheelScroll = (event: WheelEvent) => {
  event.preventDefault();
  const delta = Math.abs(event.deltaX) === 0 ? event.deltaY : event.deltaX;
  const scrollContainer = carousel.value!.$el.querySelector(".carousel");
  scrollContainer.scrollLeft += delta;
};

const header = ref<HTMLElement | null>(null);
const menuWrapper = ref<HTMLElement | null>(null);

const { menuPosition, displayMenu, hideMenu, floatingStyles } =
  useFloatingContextMenu({
    anchorElement: computed(() => header.value!),
    menuElement: computed(() => menuWrapper.value!),
  });

const contextMenuProjectId = ref<string | null>(null);
const displayContextMenu = (event: MouseEvent) => {
  const eventTarget = event.target as HTMLElement;
  const closestTab = eventTarget.closest(".project-tab") as HTMLElement | null;

  contextMenuProjectId.value = closestTab
    ? closestTab.dataset.projectId!
    : null;

  if (!closestTab) {
    hideMenu();
    return;
  }

  displayMenu({ x: event.clientX, y: event.clientY });
};

onClickOutside(menuWrapper, hideMenu);

const tabWrapper = ref<HTMLElement | null>(null);

watch(
  activeProjectTab,
  async () => {
    await nextTick();

    const activeTab = tabWrapper.value?.querySelector(".active");

    if (activeTab) {
      activeTab.scrollIntoView();
    }
  },
  { immediate: true },
);

const { createHint } = useHint();

const helpMenu = ref<InstanceType<typeof HelpMenu>>();

const { totalNodes } = storeToRefs(useWorkflowStore());

const helpIsVisibleCondition = computed(() => totalNodes.value >= 10);

onMounted(() => {
  createHint({
    hintId: HINTS.HELP,
    referenceElement: helpMenu,
    isVisibleCondition: helpIsVisibleCondition,
  });
});

const { onDragStart, onDrag, onDragEnd } = useTabDrag(tabWrapper, openProjects);

// overwrite drag handling from Carousel,
// i.e. if more tabs are open than fit in window, drag won't move all of them,
// but instead can be used to reorder them
const onMouseDown = (e: MouseEvent) => {
  e.stopPropagation();
};
</script>

<template>
  <header ref="header" @contextmenu="displayContextMenu">
    <FunctionButton
      class="home-button"
      title="Home"
      data-test-id="Home"
      :active="isHomeButtonActive"
      @click="setGetStartedPageTab()"
    >
      <HouseIcon />
      Home
    </FunctionButton>
    <div
      :class="[
        'toolbar',
        {
          'with-projects': hasOpenProjects,
          'without-projects': !hasOpenProjects,
        },
      ]"
    >
      <div v-if="hasOpenProjects" class="project-tabs">
        <Carousel ref="carousel" @wheel="onWheelScroll">
          <div ref="tabWrapper" class="wrapper">
            <AppHeaderTab
              v-for="(
                {
                  name,
                  projectId,
                  origin = { providerId: '', projectType: null },
                },
                index
              ) in openProjects"
              :key="projectId"
              :class="[
                'project-tab',
                'draggable-item',
                { loading: isLoadingWorkflow && !hasWorkflowLoadingError },
              ]"
              :name="name"
              :data-project-id="projectId"
              :project-id="projectId"
              :provider="origin.providerId"
              :project-type="origin.projectType"
              :window-width="windowWidth"
              :is-active="activeProjectTab === projectId"
              :disabled="isLoadingWorkflow && !hasWorkflowLoadingError"
              :has-unsaved-changes="Boolean(dirtyProjectsMap[projectId])"
              :is-hovered-over="hoveredTab === projectId"
              draggable="true"
              @hover="hoveredTab = $event"
              @switch-workflow="onProjectTabChange"
              @close-project="closeProject($event)"
              @dragstart.stop="onDragStart($event, index)"
              @drag="onDrag($event)"
              @dragend="onDragEnd"
              @mousedown="onMouseDown($event)"
            />
          </div>
        </Carousel>

        <div
          v-show="menuPosition"
          ref="menuWrapper"
          :style="{ ...floatingStyles, zIndex: $zIndices.layerExpandedMenus }"
        >
          <AppHeaderContextMenu
            v-if="menuPosition"
            :position="menuPosition"
            :project-id="contextMenuProjectId!"
            @item-click="hideMenu"
          />
        </div>
      </div>

      <div v-if="hasOpenProjects" class="create-workflow-container">
        <button
          class="create-workflow-btn"
          data-test-id="create-workflow-btn"
          :title="createWorkflowTitle"
          @click="$shortcuts.dispatch('createWorkflow')"
        >
          <PlusIcon />
        </button>
      </div>

      <div v-if="openProjects.length === 0" class="application-name">
        <span class="text">KNIME Analytics Platform 5</span>
      </div>

      <div class="buttons">
        <FunctionButton
          v-if="devMode"
          class="header-button no-text"
          data-test-id="dev-mode-only"
          title="Inspect Code (DEV MODE ONLY)"
          @click="openInspector()"
        >
          <CodeHtmlIcon />
        </FunctionButton>

        <FunctionButton
          v-if="devMode && devServer"
          class="header-button no-text"
          data-test-id="dev-mode-only"
          title="Reload App (DEV MODE ONLY)"
          @click="reloadApp()"
        >
          <ReloadIcon />
        </FunctionButton>

        <HelpMenu ref="helpMenu" data-test-id="app-header-help-menu" />

        <FunctionButton
          class="header-button"
          title="Open preferences"
          data-test-id="open-preferences"
          @click="openKnimeUIPreferencePage"
        >
          <CogIcon />
          Preferences
        </FunctionButton>

        <AppMenu data-test-id="app-header-app-menu" />

        <CommunityHubSignButton
          v-if="getCommunityHubInfo.isOnlyCommunityHubMounted"
        />
      </div>
    </div>
  </header>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

header {
  --header-button-height: 24px;

  display: flex;
  height: var(--app-header-height);
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);
  position: relative;

  /* override padding set by webapps-common grid */
  padding: initial;

  /* smallish dark spacer */

  &::after {
    content: "";
    position: absolute;
    bottom: -4px;
    width: 100%;
    height: 1px;
    background: v-bind("$colors.darkeningMask");
  }

  & .home-button {
    --theme-button-function-foreground-color-active: var(--knime-masala);
    --theme-button-function-background-color-active: var(--knime-yellow);
    --theme-button-function-foreground-color-focus: var(--knime-masala);
    --theme-button-function-background-color-focus: var(--knime-yellow);
    --theme-button-function-foreground-color-hover: var(--knime-masala);
    --theme-button-function-background-color-hover: var(--knime-yellow);

    border: 1px solid var(--knime-dove-gray);
    display: flex;
    gap: 4px;
    align-items: center;
    align-self: center;
    color: var(--knime-white);
    height: var(--header-button-height);
    padding: 10px;
    margin: 0 35px 0 10px;

    & svg {
      @mixin svg-icon-size 16;

      margin-right: 5px;
      stroke: var(--knime-white);
    }
  }

  & .toolbar {
    width: 100%;
    height: 100%;
    display: grid;
    align-items: center;
    align-content: center;

    &.without-projects {
      grid-template-columns: 1fr auto;
    }

    &.with-projects {
      grid-template-columns: auto 1fr auto;
    }

    & .project-tabs {
      padding: 0;
      min-width: 0;
      white-space: nowrap;
      list-style: none;

      & :deep(.shadow-wrapper) {
        margin-right: 0;
      }

      & :deep(.shadow-wrapper::before),
      & :deep(.shadow-wrapper::after) {
        background-image: none;
      }

      & :deep(.carousel) {
        padding-left: 0;
        padding-right: 0;
      }

      & .wrapper {
        display: inline-flex;
      }

      & .project-tab.loading {
        cursor: progress;
      }
    }

    & .create-workflow-container {
      height: 100%;
      display: flex;

      & .separator {
        width: 1px;
        border-left: 2px solid var(--knime-silver-sand-semi);
        margin: 10px 8px;
      }

      & .create-workflow-btn {
        border: 0;
        background-color: var(--knime-masala);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-bottom: 2px;
        margin-left: 5px;
        height: 100%;

        &:hover {
          outline: none;
          background: var(--knime-black-semi);
        }

        &:focus-visible {
          outline: none;
          background: var(--knime-black-semi);
        }

        & svg {
          @mixin svg-icon-size 24;

          padding-right: 2px;
          stroke: var(--knime-white);
        }
      }
    }

    /* right button bar: help, preferences and menu */

    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 15px;

      & .header-button,
      &:deep(.submenu-toggle) {
        border: 1px solid var(--knime-dove-gray);
        display: flex;
        margin-left: 0;
        margin-right: 5px;
        align-items: center;
        justify-content: center;
        color: var(--knime-white);
        height: var(--header-button-height);
        padding: 10px;

        & svg {
          @mixin svg-icon-size 16;

          margin-right: 5px;
          stroke: var(--knime-white);
        }

        &.no-text {
          width: 26px;
          padding: 4px;

          & svg {
            margin: 0;
          }
        }
      }
    }

    & .application-name {
      display: flex;
      margin-left: -10px;

      & .text {
        color: var(--knime-white);
        font-size: 13px;
        font-weight: 500;
      }
    }
  }
}

.dragged-tab {
  opacity: 0;
}

.drag-image {
  position: fixed;
  pointer-events: none;
  transition: transform 0.2s ease;
  z-index: v-bind("$zIndices.layerPriorityElevation");
  will-change: transform;
}
</style>
