<script lang="ts">
import { defineComponent } from "vue";
import { mapActions, mapState } from "vuex";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import Carousel from "webapps-common/ui/components/Carousel.vue";
import HelpMenu from "./HelpMenu.vue";
import AppMenu from "./AppMenu.vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import CodeHtmlIcon from "webapps-common/ui/assets/img/icons/code-html.svg";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";
import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";

import AppHeaderTab from "./AppHeaderTab.vue";

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
    ValueSwitch,
  },
  data() {
    return {
      windowWidth: 0,
      hoveredTab: null,
      activeProjectTab: null,
      lastActiveProject: null,
      activeMode: "light",
      modes: [
        { id: "light", text: "Light" },
        { id: "dark", text: "Dark" },
      ],
    };
  },
  computed: {
    ...mapState("application", [
      "openProjects",
      "activeProjectId",
      "isLoadingWorkflow",
      "devMode",
      "dirtyProjectsMap",
      "mode",
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
    mode: {
      handler(next, prev) {
        if (prev) {
          document.body.classList.remove(prev);
        }

        document.body.classList.add(next);
      },
      immediate: true,
    },
  },
  created() {
    this.setupResizeListener();
  },
  methods: {
    ...mapActions("workflow", ["closeWorkflow"]),

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
      this.activeProjectTab = null;
      this.$router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
    },

    onProjectTabChange(projectId) {
      this.$router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: "root" },
      });
    },

    openKnimeUIPreferencePage() {
      API.desktop.openWebUIPreferencePage();
    },

    onModeChange(mode) {
      this.$store.commit("application/setMode", mode);
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
        <Carousel>
          <div class="wrapper">
            <AppHeaderTab
              v-for="{ name, projectId } in openProjects"
              :key="projectId"
              :name="name"
              :project-id="projectId"
              :window-width="windowWidth"
              :is-active="activeProjectTab === projectId"
              :has-unsaved-changes="Boolean(dirtyProjectsMap[projectId])"
              :is-hovered-over="hoveredTab === projectId"
              @hover="hoveredTab = $event"
              @switch-workflow="onProjectTabChange"
              @close-workflow="closeWorkflow($event)"
            />
          </div>
        </Carousel>
      </ul>
      <div v-else class="application-name">
        <span class="text">KNIME Analytics Platform 5</span>
      </div>

      <div class="buttons">
        <ValueSwitch
          v-model="activeMode"
          compact
          class="mode-switcher"
          :possible-values="modes"
          @update:model-value="onModeChange"
        />

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
    grid-template-columns: 1fr auto;
    align-items: center;
    align-content: center;

    /* right button bar: help, preferences and menu */
    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 30px;

      & .mode-switcher {
        --theme-value-switch-background-color: var(--knime-masala);

        --theme-value-switch-background-color-hover: var(
          --knime-gray-light-semi
        );

        --theme-value-switch-background-color-checked: var(--knime-white);
      }

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
        cursor: pointer;
        color: var(--knime-black);
        background-color: var(--knime-yellow);
        border: 1px solid var(--knime-yellow);

        & svg {
          stroke: var(--knime-black);
        }
      }
    }
  }
}
</style>
