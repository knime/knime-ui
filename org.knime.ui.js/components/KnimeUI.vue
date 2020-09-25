<script>
import { mapState, mapActions } from 'vuex';

import SwitchIcon from '~/webapps-common/ui/assets/img/icons/perspective-switch.svg?inline';
import KnimeIcon from '~assets/knime.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';
import Kanvas from '~/components/Kanvas';

export default {
    components: {
        FunctionButton,
        Kanvas,
        SwitchIcon,
        KnimeIcon
    },
    async fetch() {
        await this.initState();
    },
    computed: {
        ...mapState('workflows', ['workflow'])
    },
    methods: {
        ...mapActions('workflows', ['initState']),
        switchToJavaUI() {
            window.switchToJavaUI();
        }
    }

};
</script>

<template>
  <div id="knime-ui">
    <header>
      <div id="knime-logo">
        <KnimeIcon />
      </div>
      <FunctionButton
        id="switch-classic"
        @click="switchToJavaUI"
      >
        <SwitchIcon />
      </FunctionButton>
    </header>
    <nav id="sidebar" />
    <div id="toolbar" />
    <main>
      <Kanvas v-if="workflow" />
      <div
        v-else
        id="error-no-workflow"
      >
        <h2>
          No workflow opened
        </h2>
      </div>
    </main>
  </div>
</template>

<style lang="postcss" scoped>

#knime-ui {
  --side-bar-width: 40px;
  --ocker: hsl(51, 100%, 30%);

  display: grid;
  grid-template-columns: min-content auto;
  grid-template-rows: min-content min-content auto;
  grid-template-areas: "header header" "sidebar toolbar" "sidebar main";
  height: calc(100vh - 1px);
}

#sidebar {
  border-top: 1px solid var(--ocker);
  grid-area: sidebar;
  height: 100%;
  width: var(--side-bar-width);
  background-color: var(--knime-black);
}

#toolbar {
  border-top: 1px solid var(--ocker);
  height: 50px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

header {
  display: flex;
  grid-area: header;
  height: 80px;
  background-color: var(--knime-masala);
  border-bottom: 3px solid var(--knime-yellow);

  & #knime-logo {
    width: var(--side-bar-width);
    background-color: var(--knime-black);
    text-align: center;

    & svg {
      margin: 26px 0;
    }
  }

  & #switch-classic {
    height: 40px;
    width: 40px;
    margin: 20px;
    margin-left: auto;
    border: 1px solid var(--knime-dove-gray);

    & svg {
      width: 26px;
      height: 26px;
      stroke: var(--knime-white);
      stroke-width: calc(32px / 26); /* get 1px stroke width */
    }
  }
}

main {
  grid-area: main;
  overflow: auto;

  & #error-no-workflow {
    text-align: center;
    color: var(--knime-masala);
  }
}

</style>
