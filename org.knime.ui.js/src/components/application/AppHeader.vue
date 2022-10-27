<script>
import { mapActions, mapState } from 'vuex';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import Carousel from 'webapps-common/ui/components/Carousel.vue';
import KnimeIcon from 'webapps-common/ui/assets/img/KNIME_Triangle.svg';
import SwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';
import CloseIcon from '@/assets/cancel.svg';

/* eslint-disable no-magic-numbers */
const maxCharSwitch = [
    (width) => width < 600 ? 10 : false,
    (width) => width < 900 ? 20 : false,
    (width) => width < 1280 ? 50 : false,
    (width) => width < 1680 ? 100 : false,
    (width) => width < 2180 ? 150 : false,
    (width) => width < 2800 ? 200 : false,
    (width) => width >= 2800 ? 256 : false
];
/* eslint-enable no-magic-numbers */

/**
 * Header Bar containing Logo, project name and Switch to Java UI Button
 */
export default {
    components: {
        KnimeIcon,
        FunctionButton,
        Carousel,
        SwitchIcon,
        CloseIcon
    },
    data() {
        return {
            windowWidth: 0,
            isHoveredOver: null,
            isEntryPageActive: null
        };
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId'])
    },
    watch: {
        activeProjectId: {
            immediate: true,
            handler() {
                if (this.activeProjectId) {
                    this.isEntryPageActive = false;
                }
            }
        }
    },
    created() {
        window.addEventListener('resize', this.onWindowResize);
        this.onWindowResize();
    },
    methods: {
        ...mapActions('workflow', ['closeWorkflow']),
        ...mapActions('application', ['switchWorkflow']),
        onWindowResize() {
            this.windowWidth = window.innerWidth;
        },
        switchToJavaUI() {
            window.switchToJavaUI();
        },
        truncateProjectName(name) {
            const maxCharFunction = maxCharSwitch.find(fn => fn(this.windowWidth));
            const maxChars = maxCharFunction(this.windowWidth);

            return name.length > maxChars ? `${name.slice(0, maxChars)} …` : name;
        },
        setEntryPageTab() {
            this.isEntryPageActive = true;
            this.switchWorkflow(null);
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
            <li
              v-for="{ name, projectId } in openProjects"
              :key="projectId"
              :class="[ activeProjectId === projectId ? 'active' : null ]"
              @click.stop="activeProjectId === projectId ? null : switchWorkflow({ projectId })"
              @mouseover="isHoveredOver = projectId"
              @mouseleave="isHoveredOver = null"
            >
              <span class="text">{{ truncateProjectName(name) }}</span>
              <FunctionButton
                :class="[ isHoveredOver === projectId ? 'visible' : null ]"
                class="icon"
                @click.stop="closeWorkflow(projectId)"
              >
                <CloseIcon />
              </FunctionButton>
            </li>
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
      margin-right: 15px;
      flex-shrink: 0;
      margin-left: 30px;

      & .feedback {
        margin-right: 10px;
        border: 1px solid var(--knime-dove-gray);
        line-height: 16px;
        font-size: 16px;
        font-family: "Roboto Condensed", sans-serif;
        color: white;
        padding: 11px 20px;
        border-radius: 40px;
        text-decoration: none;
        font-weight: 500;
        height: 40px;

        &:hover,
        &:focus {
          outline: none;
          background-color: var(--knime-dove-gray);
        }
      }

      & .switch-classic {
        height: 40px;
        width: 40px;
        border: 1px solid var(--knime-dove-gray);

        & svg {
          width: 26px;
          height: 26px;
          stroke: var(--knime-white);
          stroke-width: calc(32px / 26); /* get 1px stroke width */
        }
      }
    }

    & .application-name {
      padding: 0 20px;
      display: flex;

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

      & :deep(.shadow-wrapper::before) {
        background-image: none;
      }

      & :deep(.shadow-wrapper::after) {
        background-image: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-masala) 100%);
      }

      & .wrapper {
        display: inline-flex;
        padding-left: -20px;
        margin-left: -24px;
        margin-right: -20px;

        & li {
          height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 1px;
          padding-left: 10px;
          padding-bottom: 1px;
          text-align: center;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
          border-radius: 1px 1px 0 0;
          background-color: var(--knime-black);
          color: var(--knime-white);
          max-width: 300px;

          &:hover {
            background-color: var(--knime-masala);
          }

          & .text {
            color: var(--knime-white);
            font-family: "Roboto Condensed", sans-serif;
            font-size: 18px;
            padding: 10px 0;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            min-width: 0;
          }

          /* Close workflow button */

          & .icon {
            margin-left: -20px;
            width: 32px;
            align-self: center;
            align-items: center;
            border-radius: 0;

            & svg {
              display: none;
            }
          }

          & .visible {
            height: 49px;
            background: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-masala) 30%);

            & svg {
              display: block;
              height: 20px;
              width: 20px;
              stroke: var(--knime-white);
              stroke-width: calc(32px / 30); /* get 1px stroke width */
            }
          }
        }

        & .active {
          background-color: var(--knime-yellow);
          color: var(--knime-black);
          cursor: inherit;

          & .text {
            color: var(--knime-black);
          }

          & .visible {
            height: 49px;
            background: linear-gradient(90deg, hsl(0deg 0% 100% / 0%) 0%, var(--knime-yellow) 30%);

            & svg {
              stroke: var(--knime-black);
            }
          }

          &:hover,
          &:focus {
            cursor: inherit;
            background-color: var(--knime-yellow);
          }
        }
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
