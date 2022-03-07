<script>
import { mapState, mapActions } from 'vuex';
import KnimeIcon from '~/webapps-common/ui/assets/img/KNIME_Triangle.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/perspective-switch.svg?inline';
import CloseIcon from '~/assets/cancel-execution.svg?inline';

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
    computed: {
        ...mapState('workflow', ['activeWorkflow'])
    },
    methods: {
        ...mapActions('workflow', ['closeWorkflow']),
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
    <div
      v-if="activeWorkflow"
      id="workflow-title"
    >
      {{ activeWorkflow.info.name }}
      <CloseIcon
        class="icon"
        @click="closeWorkflow"
      />
    </div>
    <FunctionButton
      id="switch-classic"
      @click="switchToJavaUI"
    >
      <SwitchIcon />
    </FunctionButton>
  </header>
</template>

<style lang="postcss" scoped>
header {
  display: flex;
  justify-content: space-between;
  height: 80px;
  background-color: var(--knime-masala);
  border-bottom: 4px solid var(--knime-yellow);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    width: 100%;
    height: 1px;
    background: var(--darkening-mask-color);
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

  & #switch-classic {
    height: 40px;
    width: 40px;
    margin: 20px;
    border: 1px solid var(--knime-dove-gray);

    & svg {
      width: 26px;
      height: 26px;
      stroke: var(--knime-white);
      stroke-width: calc(32px / 26); /* get 1px stroke width */
    }
  }

  & #workflow-title {
    margin-right: auto;
    color: var(--knime-white);
    display: flex;
    align-items: center;
    font-family: "Roboto Condensed", sans-serif;
    font-size: 24px;
    padding: 0 20px;


    & .icon {
      border: 0;
      border-radius: 20px;
      stroke: var(--knime-white);
      width: 30px;
      margin-left: 10px;


      &:hover {
        cursor: pointer;
        background-color: var(--knime-silver-sand-semi);
        stroke: var(--knime-white);
      }
    }
  }
}
</style>
