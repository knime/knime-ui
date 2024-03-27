<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import Carousel from "webapps-common/ui/components/Carousel.vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import CodeHtmlIcon from "webapps-common/ui/assets/img/icons/code-html.svg";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";
import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";

import { useFloatingContextMenu } from "@/composables/useFloatingContextMenu";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";

import HelpMenu from "./HelpMenu.vue";
import AppMenu from "./AppMenu.vue";
import AppHeaderTab from "./AppHeaderTab.vue";
import { useStore } from "@/composables/useStore";
import { useShortcuts } from "@/plugins/shortcuts";

/**
 * Header Bar containing Logo, Open project tabs, and the 3 buttons Help, Preferences and Menu
 */

const windowWidth = ref(0);
const hoveredTab = ref<string | null>(null);
const activeProjectTab = ref<string | null>(null);

const store = useStore();
const $router = useRouter();
const $route = useRoute();
const $shortcuts = useShortcuts();

const openProjects = computed(() => store.state.application.openProjects);
const activeProjectId = computed(() => store.state.application.activeProjectId);
const isLoadingWorkflow = computed(
  () => store.state.application.isLoadingWorkflow,
);
const devMode = computed(() => store.state.application.devMode);
const dirtyProjectsMap = computed(
  () => store.state.application.dirtyProjectsMap,
);

const isGetStartedPageActive = computed(() => {
  return $route.name === APP_ROUTES.EntryPage.GetStartedPage;
});

const isLogoActive = computed(() => {
  return (
    openProjects.value.length === 0 ||
    (!activeProjectId.value && !isLoadingWorkflow.value) ||
    isGetStartedPageActive.value
  );
});

const createWorkflowTitle = computed(() => {
  const shortcut = $shortcuts.get("createWorkflow");
  return `${shortcut.text} (${shortcut.hotkeyText})`;
});

const hasOpenProjects = computed(() => {
  return openProjects.value.length >= 1;
});

watch(
  activeProjectId,
  () => {
    // prevent tab color flashing when switching workflows
    if (activeProjectId.value) {
      activeProjectTab.value = activeProjectId.value;
    }
  },
  { immediate: true },
);

const setupResizeListener = () => {
  const onResize = () => {
    windowWidth.value = window.innerWidth;
  };

  window.addEventListener("resize", onResize);
  onResize();
};

setupResizeListener();

const reloadApp = () => location.reload();

const openInspector = () => {
  const remoteDebuggingPort =
    import.meta.env.KNIME_CEF_REMOTE_DEBUGGING_PORT || "8888";
  window.open(`http://localhost:${remoteDebuggingPort}/`, "_blank");
};

const setGetStartedPageTab = () => {
  if (isLogoActive.value) {
    return;
  }
  activeProjectTab.value = null;
  $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
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
  store.dispatch("workflow/closeProject", projectId);

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

const contextMenuTab = ref<HTMLElement | null>(null);
const onContextMenuClick = (event: MouseEvent) => {
  const eventTarget = event.target as HTMLElement;
  const closestTab = eventTarget.closest(".project-tab") as HTMLElement | null;

  contextMenuTab.value = closestTab;

  if (!closestTab) {
    hideMenu();
    return;
  }

  displayMenu({ x: event.clientX, y: event.clientY });
};

const contextMenuItems: MenuItem[] = [
  { text: "Reveal in Space Explorer" },
  {
    text: "Close Project",
    metadata: {
      onClick: () => {
        if (!contextMenuTab.value) {
          return;
        }

        closeProject(contextMenuTab.value.dataset.projectId!);
      },
    },
  },
];

const onMenuItemClick = (item: MenuItem) => {
  item.metadata?.onClick();
  hideMenu();
};
</script>

<template>
  <header ref="header" @contextmenu="onContextMenuClick">
    <div
      id="knime-logo"
      :class="[isLogoActive ? 'active-logo' : null]"
      @click="setGetStartedPageTab()"
    >
      <div class="text"><HouseIcon /> Home</div>
    </div>
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
          <div class="wrapper">
            <AppHeaderTab
              v-for="{
                name,
                projectId,
                origin = { providerId: '', projectType: null },
              } in openProjects"
              :key="projectId"
              class="project-tab"
              :name="name"
              :data-project-id="projectId"
              :project-id="projectId"
              :provider="origin.providerId"
              :project-type="origin.projectType"
              :window-width="windowWidth"
              :is-active="activeProjectTab === projectId"
              :has-unsaved-changes="Boolean(dirtyProjectsMap[projectId])"
              :is-hovered-over="hoveredTab === projectId"
              @hover="hoveredTab = $event"
              @switch-workflow="onProjectTabChange"
              @close-project="closeProject($event)"
            />
          </div>
        </Carousel>

        <div
          v-show="menuPosition"
          ref="menuWrapper"
          :style="{ ...floatingStyles, zIndex: 3 }"
        >
          <MenuItems
            v-if="menuPosition"
            class="context-menu"
            menu-aria-label="Tab context menu"
            :items="contextMenuItems"
            @item-click="(_, item) => onMenuItemClick(item)"
          />
        </div>
      </div>

      <div v-if="hasOpenProjects" class="create-worflow-container">
        <button
          class="create-workflow-btn"
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
          data-testid="dev-mode-only"
          title="Inspect Code (DEV MODE ONLY)"
          @click="openInspector()"
        >
          <CodeHtmlIcon />
        </FunctionButton>

        <FunctionButton
          v-if="devMode"
          class="header-button no-text"
          data-testid="dev-mode-only"
          title="Reload App (DEV MODE ONLY)"
          @click="reloadApp()"
        >
          <ReloadIcon />
        </FunctionButton>

        <HelpMenu data-testid="app-header-help-menu" />

        <FunctionButton
          class="header-button"
          title="Open preferences"
          data-testid="open-preferences"
          @click="openKnimeUIPreferencePage"
        >
          <CogIcon />
          Preferences
        </FunctionButton>

        <AppMenu data-testid="app-header-app-menu" />
      </div>
    </div>
  </header>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

header {
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
    }

    & .create-worflow-container {
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
        height: 26px;
        padding: 10px;

        & svg {
          @mixin svg-icon-size 18;

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

  & #knime-logo {
    display: flex;
    align-items: center;
    justify-content: left;
    width: auto;
    background-color: var(--knime-masala);
    height: 100%;
    margin-right: 25px;
    padding: 0 10px;
    cursor: default;
    user-select: none;

    & .text {
      display: flex;
      border: 1px solid var(--knime-dove-gray);
      border-radius: var(--theme-button-function-border-radius, 9999px);
      height: 26px;
      align-self: center;
      vertical-align: middle;
      font-size: 13px;
      font-weight: 500;
      padding-left: 10px;
      padding-right: 10px;
      min-width: 45px;
      line-height: 26px;
      text-align: left;
      color: var(--knime-white);

      & svg {
        margin-right: 3px;
        margin-top: 2px;

        @mixin svg-icon-size 18;

        stroke: var(--knime-white);
      }
    }

    &.active-logo .text {
      color: var(--knime-black);
      background-color: var(--knime-yellow);
      border: 1px solid var(--knime-yellow);

      & svg {
        stroke: var(--knime-black);
      }
    }

    &:hover,
    &:focus {
      & .text {
        color: var(--knime-black);
        background-color: var(--knime-yellow);
        border: 1px solid var(--knime-yellow);

        & svg {
          stroke: var(--knime-black);
        }
      }

      &:not(.active-logo) {
        & .text {
          cursor: pointer;
        }
      }
    }
  }
}

.context-menu {
  position: absolute;
}
</style>
