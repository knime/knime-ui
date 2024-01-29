<script lang="ts">
import { defineComponent } from "vue";
import { mapActions, mapState } from "vuex";

import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import Carousel from "webapps-common/ui/components/Carousel.vue";
import HelpMenu from "./HelpMenu.vue";
import AppMenu from "./AppMenu.vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import CodeHtmlIcon from "webapps-common/ui/assets/img/icons/code-html.svg";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";
import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";

import AppHeaderTab from "./AppHeaderTab.vue";

type ComponentData = {
  windowWidth: number;
  hoveredTab: string | null;
  activeProjectTab: string | null;
  lastActiveProject: string | null;
};

/**
 * Header Bar containing Logo, Open project tabs, and the 3 buttons Help, Preferences and Menu
 */
export default defineComponent({
  components: {
    AppHeaderTab,
    FunctionButton,
    Carousel,
    HelpMenu,
    AppMenu,
    HouseIcon,
    ReloadIcon,
    CodeHtmlIcon,
    CogIcon,
    PlusIcon,
  },
  data(): ComponentData {
    return {
      windowWidth: 0,
      hoveredTab: null,
      activeProjectTab: null,
      lastActiveProject: null,
    };
  },
  computed: {
    ...mapState("application", [
      "openProjects",
      "activeProjectId",
      "isLoadingWorkflow",
      "devMode",
      "dirtyProjectsMap",
    ]),

    isGetStartedPageActive() {
      return this.$route.name === APP_ROUTES.EntryPage.GetStartedPage;
    },

    isLogoActive() {
      return (
        this.openProjects.length === 0 ||
        (!this.activeProjectId && !this.isLoadingWorkflow) ||
        this.isGetStartedPageActive
      );
    },

    createWorkflowTitle() {
      const shortcut = this.$shortcuts.get("createWorkflow");
      return `${shortcut.text} (${shortcut.hotkeyText})`;
    },
  },
  watch: {
    activeProjectId: {
      handler() {
        // prevent tab color flashing when switching workflows
        if (this.activeProjectId) {
          this.activeProjectTab = this.activeProjectId;
        }
      },
      immediate: true,
    },
  },
  created() {
    this.setupResizeListener();
  },
  methods: {
    ...mapActions("workflow", ["closeProject"]),

    setupResizeListener() {
      const onResize = () => {
        this.windowWidth = window.innerWidth;
      };

      window.addEventListener("resize", onResize);
      onResize();
    },

    reloadApp() {
      location.reload();
    },

    openInspector() {
      const remoteDebuggingPort =
        import.meta.env.KNIME_CEF_REMOTE_DEBUGGING_PORT || "8888";
      window.open(`http://localhost:${remoteDebuggingPort}/`, "_blank");
    },

    setGetStartedPageTab() {
      if (this.isLogoActive) {
        return;
      }
      this.activeProjectTab = null;
      this.$router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
    },

    onProjectTabChange(projectId: string) {
      this.$router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: "root" },
      });
    },

    openKnimeUIPreferencePage() {
      API.desktop.openWebUIPreferencePage();
    },

    onWheelScroll(event: WheelEvent) {
      event.preventDefault();
      const delta = Math.abs(event.deltaX) === 0 ? event.deltaY : event.deltaX;
      const carouselComponent = this.$refs.carousel as InstanceType<
        typeof Carousel
      >;
      const scrollContainer = carouselComponent.$el.querySelector(".carousel");
      scrollContainer.scrollLeft += delta;
    },
  },
});
</script>

<template>
  <header>
    <div
      id="knime-logo"
      :class="[isLogoActive ? 'active-logo' : null]"
      @click="setGetStartedPageTab()"
    >
      <div class="text"><HouseIcon /> Home</div>
    </div>
    <div class="toolbar">
      <ul v-if="openProjects.length >= 1" class="project-tabs">
        <Carousel ref="carousel" @wheel="onWheelScroll">
          <div class="wrapper">
            <AppHeaderTab
              v-for="{
                name,
                projectId,
                origin = { providerId: '', projectType: null },
              } in openProjects"
              :key="projectId"
              :name="name"
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
            <button
              class="create-workflow-btn"
              :title="createWorkflowTitle"
              @click="$shortcuts.dispatch('createWorkflow')"
            >
              <PlusIcon />
            </button>
          </div>
        </Carousel>
      </ul>

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
    grid-template-columns: 1fr auto auto;
    align-items: center;
    align-content: center;

    & .create-workflow-btn {
      border: 0;
      background-color: var(--knime-masala);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: 2px;
      margin-left: 2px;

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

    /* right button bar: help, preferences and menu */
    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 30px;

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

    & .project-tabs {
      padding: 0;
      min-width: 0;
      white-space: nowrap;
      list-style: none;

      & :deep(.shadow-wrapper) {
        margin-left: -24px;
      }

      & :deep(.shadow-wrapper::before) {
        background-image: none;
      }

      & :deep(.shadow-wrapper::after) {
        background-image: linear-gradient(
          90deg,
          hsl(0deg 0% 100% / 0%) 0%,
          var(--knime-masala) 100%
        );
      }

      & :deep(.carousel) {
        padding-left: 24px;
      }

      & .wrapper {
        display: inline-flex;
        margin-left: -24px;
        margin-right: -20px;
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
</style>
