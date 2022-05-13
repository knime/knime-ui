<script>
import { mapState, mapActions } from 'vuex';
import KnimeIcon from '~/webapps-common/ui/assets/img/KNIME_Triangle.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/perspective-switch.svg?inline';
import CloseIcon from '~/assets/cancel.svg?inline';

/**
 * Header Bar containing Logo, workflow title and Switch to Java UI Button
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
        ...mapState('workflow', ['activeWorkflow']),

        truncatedWorkflowName() {
            /* eslint-disable no-magic-numbers */
            const name = this.activeWorkflow.info.name;

            const sizeFunctionsMap = [
                (width) => width < 600 ? 10 : false,
                (width) => width >= 600 && width < 900 ? 20 : false,
                (width) => width >= 900 && width < 1280 ? 50 : false,
                (width) => width >= 1200 ? 100 : false
            ];
            const defaultSizeFn = () => 20;
            
            const sizeFn = sizeFunctionsMap.find(sizeFn => sizeFn(this.windowWidth)) || defaultSizeFn;
            const maxChars = sizeFn(this.windowWidth);

            return name.length > maxChars ? `${name.slice(0, maxChars)}...` : name;
            /* eslint-enable no-magic-numbers */
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
      <div
        v-if="activeWorkflow"
        class="workflow-title"
      >
        <span class="text">{{ truncatedWorkflowName }}</span>
        <FunctionButton
          class="icon"
          @click="closeWorkflow"
        >
          <CloseIcon />
        </FunctionButton>
      </div>
      <div
        v-else
        class="app-title"
      >
        <span class="text">KNIME Modern UI Preview</span>
      </div>
      <div class="buttons">
        <a
          href="https://knime.com/modern-ui-feedback"
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

  /* Smalish dark spacer */

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

    /* Application name or workflow name */
    & .workflow-title,
    & .app-title {
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
