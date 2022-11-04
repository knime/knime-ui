<script>
import { mapActions, mapState } from 'vuex';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import Carousel from 'webapps-common/ui/components/Carousel.vue';
import KnimeIcon from 'webapps-common/ui/assets/img/KNIME_Triangle.svg';
import SwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';

import AppHeaderTab from './AppHeaderTab.vue';

/**
 * Header Bar containing Logo, Open project tabs, Feedback button and Switch to Java UI Button
 */
export default {
    components: {
        AppHeaderTab,
        KnimeIcon,
        FunctionButton,
        Carousel,
        SwitchIcon
    },
    data() {
        return {
            windowWidth: 0,
            isLoadingWorkflow: false,
            isEntryPageActive: null,
            hoveredTab: null,
            activeTab: null
        };
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId'])
    },
    watch: {
        openProjects: {
            handler() {
                if (this.openProjects.length === 0) {
                    this.isEntryPageActive = true;
                }
            },
            immediate: true
        },
        activeProjectId() {
            if (this.activeProjectId) {
                this.activeTab = this.activeProjectId;
                this.isEntryPageActive = false;
            }
        }
    },
    created() {
        this.setupResizeListener();
    },
    methods: {
        ...mapActions('workflow', ['closeWorkflow']),
        ...mapActions('application', ['switchWorkflow']),
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
        setEntryPageTab() {
            this.isEntryPageActive = true;
            this.switchWorkflow(null);
            this.activeTab = null;
        }
    }
};
</script>

<template>
  <header>
    <div
      id="knime-logo"
      :class="[ isEntryPageActive ? 'active-logo' : null ]"
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
              :is-active="activeTab === projectId"
              :is-hovered-over="hoveredTab === projectId"
              @hover="hoveredTab = $event"
              @switch-workflow="switchWorkflow({ projectId: $event })"
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
        <a
          href="https://knime.com/modern-ui-feedback?src=knimeapp?utm_source=knimeapp"
          class="feedback"
        >
          Provide feedback via the forum
        </a>
        <FunctionButton
          class="switch-classic"
          @click="switchToJavaUI"
        >
          <SwitchIcon />
        </FunctionButton>
      </div>
    </div>
  </header>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

header {
  display: flex;
  height: var(--app-header-height);
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);
  position: relative;

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

    /* Feedback and Switch to classic ui buttons */
    & .buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      flex-shrink: 0;
      margin-left: 30px;

      & .feedback {
        margin-right: 10px;
        border: 1px solid var(--knime-dove-gray);
        line-height: 18px;
        font-size: 13px;
        font-family: "Roboto Condensed", sans-serif;
        color: white;
        padding: 6px 15px;
        border-radius: 40px;
        text-decoration: none;
        font-weight: 500;

        &:hover,
        &:focus {
          outline: none;
          background-color: var(--knime-dove-gray);
        }
      }

      & .switch-classic {
        border: 1px solid var(--knime-dove-gray);
        display: flex;
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

      & >>> .shadow-wrapper::before {
        background-image: none;
      }

      & >>> .shadow-wrapper::after {
        background-image: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-masala) 100%);
      }

      & .wrapper {
        display: inline-flex;
        padding-left: -20px;
        margin-left: -24px;
        margin-right: -20px;
      }
    }
  }

  & #knime-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--side-bar-width);
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
    pointer-events: none;

    & svg {
      fill: var(--knime-black);
    }

    &:hover,
    &:focus {
      cursor: inherit;
      background-color: var(--knime-yellow);
    }
  }
}
</style>
