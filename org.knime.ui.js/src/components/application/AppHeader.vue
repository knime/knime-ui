<script>
import { mapActions, mapState } from 'vuex';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import Carousel from 'webapps-common/ui/components/Carousel.vue';
import KnimeIcon from 'webapps-common/ui/assets/img/KNIME_Triangle.svg';
import CloseIcon from 'webapps-common/ui/assets/img/icons/close.svg';
import SwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';
import InfoIcon from '@/assets/info.svg';

import { APP_ROUTES } from '@/router';

import AppHeaderTab from './AppHeaderTab.vue';

/**
 * Header Bar containing Logo, Open project tabs, and switch to Info page Button
 */
export default {
    components: {
        AppHeaderTab,
        KnimeIcon,
        FunctionButton,
        Carousel,
        InfoIcon,
        SwitchIcon,
        CloseIcon
    },
    data() {
        return {
            windowWidth: 0,
            hoveredTab: null,
            activeProjectTab: null,
            lastActiveProject: null
        };
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId', 'isLoadingWorkflow']),

        isInfoPageActive() {
            return this.$route.name === APP_ROUTES.InfoPage.name;
        },
        
        isEntryPageActive() {
            return this.$route.name === APP_ROUTES.EntryPage.name;
        },

        isLogoActive() {
            if (this.isInfoPageActive) {
                return false;
            }

            return (
                this.openProjects.length === 0 ||
                (!this.activeProjectId && !this.isLoadingWorkflow) ||
                this.isEntryPageActive
            );
        }
    },
    watch: {
        activeProjectId() {
            // prevent tab color flashing when switching workflows
            if (this.activeProjectId) {
                this.activeProjectTab = this.activeProjectId;
            }
        }
    },
    created() {
        this.setupResizeListener();
    },
    methods: {
        ...mapActions('workflow', ['closeWorkflow']),
        
        setupResizeListener() {
            const onResize = () => {
                this.windowWidth = window.innerWidth;
            };

            window.addEventListener('resize', onResize);
            onResize();
        },

        switchToJavaUI() {
            window.switchToJavaUI();
        },

        switchToInfoPage() {
            if (this.isInfoPageActive) {
                this.$router.back();
            } else {
                this.activeProjectTab = null;
                this.$router.push({ name: APP_ROUTES.InfoPage.name });
            }
        },

        setEntryPageTab() {
            this.activeProjectTab = null;
            this.$router.push({ name: APP_ROUTES.EntryPage.name });
        },

        onProjectTabChange(projectId) {
            this.$router.push({
                name: APP_ROUTES.WorkflowPage.name,
                params: { projectId, workflowId: 'root' }
            });
        }
    }
};
</script>

<template>
  <header>
    <div
      id="knime-logo"
      :class="[ isLogoActive ? 'active-logo' : null ]"
      @click="setEntryPageTab()"
    >
      <KnimeIcon />
    </div>
    <div class="toolbar">
      <ul
        v-if="openProjects.length >= 1"
        class="project-tabs"
      >
        <Carousel>
          <div class="wrapper">
            <AppHeaderTab
              v-for="{ name, projectId } in openProjects"
              :key="projectId"
              :name="name"
              :project-id="projectId"
              :window-width="windowWidth"
              :is-active="activeProjectTab === projectId"
              :is-hovered-over="hoveredTab === projectId"
              @hover="hoveredTab = $event"
              @switch-workflow="onProjectTabChange"
              @close-workflow="closeWorkflow($event)"
            />
          </div>
        </Carousel>
      </ul>
      <div
        v-else
        class="application-name"
      >
        <span class="text">KNIME Modern UI Preview</span>
      </div>

      <div class="buttons">
        <FunctionButton
          v-if="!isInfoPageActive"
          class="switch-classic"
          title="Open KNIME Modern UI Preview"
          @click="switchToJavaUI"
        >
          <SwitchIcon />
        </FunctionButton>

        <FunctionButton
          class="switch-info-page"
          title="Go to info page"
          @click="switchToInfoPage"
        >
          <CloseIcon v-if="isInfoPageActive" />
          <InfoIcon v-else />
        </FunctionButton>
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
    background: var(--darkening-mask-color);
  }

  & .toolbar {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    align-content: center;

    /* Switch to info page button */
    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 30px;

      & .switch-info-page,
      & .switch-classic {
        border: 1px solid var(--knime-dove-gray);
        display: flex;
        margin-right: 10px;
        align-items: center;
        justify-content: center;

        & svg {
          @mixin svg-icon-size 18;

          stroke: var(--knime-white);
        }
      }
    }

    & .application-name {
      display: flex;
      margin-left: -10px;

      & .text {
        color: var(--knime-white);
        font-family: "Roboto Condensed", sans-serif;
        font-size: 18px;
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
        background-image: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-masala) 100%);
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
    justify-content: center;
    width: var(--app-side-bar-width);
    background-color: var(--knime-black);
    text-align: center;
    height: 100%;
    margin-right: 25px;

    & svg {
      width: 26px;
      height: 26px;
    }

    &:hover,
    &:focus {
      cursor: pointer;
      background-color: var(--knime-masala);
    }
  }

  & #knime-logo.active-logo {
    background-color: var(--knime-yellow);

    & svg {
      fill: var(--knime-black);
    }

    &:hover,
    &:focus {
      background-color: var(--knime-yellow);
    }
  }
}
</style>
