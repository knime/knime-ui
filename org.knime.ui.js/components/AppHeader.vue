<script>
import { mapGetters, mapActions } from 'vuex';
import KnimeIcon from 'webapps-common/ui/assets/img/KNIME_Triangle.svg';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton.vue';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/perspective-switch.svg?inline';
import CloseIcon from '~/assets/cancel.svg?inline';

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
        SwitchIcon,
        CloseIcon
    },
    data() {
        return {
            windowWidth: 0
        };
    },
    computed: {
        ...mapGetters('application', ['activeProjectName']),
        truncatedProjectName() {
            const maxCharFunction = maxCharSwitch.find(fn => fn(this.windowWidth));
            const maxChars = maxCharFunction(this.windowWidth);
            const name = this.activeProjectName;
            return name.length > maxChars ? `${name.slice(0, maxChars)} …` : name;
        }
    },
    created() {
        window.addEventListener('resize', this.onWindowResize);
        this.onWindowResize();
    },
    methods: {
        ...mapActions('workflow', ['closeWorkflow']),
        onWindowResize() {
            this.windowWidth = window.innerWidth;
        },
        switchToJavaUI() {
            window.switchToJavaUI();
        }
    }
};
</script>

<template>
  <header>
    <div id="knime-logo">
      <KnimeIcon />
    </div>
    <div class="toolbar">
      <!-- Closeable Project Name -->
      <div
        v-if="activeProjectName"
        class="project-name"
      >
        <span class="text">{{ truncatedProjectName }}</span>
        <FunctionButton
          class="icon"
          @click="closeWorkflow"
        >
          <CloseIcon />
        </FunctionButton>
      </div>

      <!-- Or Application Name -->
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
  height: 80px;
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);
  position: relative;

  /* smalish dark spacer */

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    width: 100%;
    height: 1px;
    background: var(--darkening-mask-color);
  }

  & .toolbar {
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;

    /* Application name or project name */
    & .project-name,
    & .application-name {
      padding: 0 20px;
      display: flex;
      min-width: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;

      & .text {
        color: var(--knime-white);
        font-family: "Roboto Condensed", sans-serif;
        font-size: 20px;
        padding: 10px 0;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        min-width: 0;
      }

      /* Close workflow button */

      & .icon {
        border: 0;
        border-radius: 20px;
        flex-shrink: 0;
        margin-left: 5px;
        width: 32px;
        height: 32px;
        align-self: center;
        align-items: center;

        & svg {
          height: 20px;
          width: 20px;
          stroke: var(--knime-white);
          stroke-width: calc(32px / 30); /* get 1px stroke width */
        }

        &:hover,
        &:focus {
          cursor: pointer;
          background-color: var(--knime-silver-sand-semi);
          stroke: var(--knime-white);
        }
      }
    }

    /* Feedback and Switch to classic ui buttons */

    & .buttons {
      display: flex;
      margin-right: 15px;
      flex-shrink: 0;

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
  }

  & #knime-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--side-bar-width);
    background-color: var(--knime-black);
    text-align: center;

    & svg {
      width: 26px;
      height: 26px;
    }
  }
}
</style>
