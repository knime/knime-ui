<script>
import { openInstallExtensionsDialog } from '@api';
import Button from 'webapps-common/ui/components/Button.vue';
import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';

export default {
    components: {
        Button,
        SpaceExplorer,
        ComputerDesktopIcon
    },
    methods: {
        openInstallExtensionsDialog
    }
};
</script>

<template>
  <main ref="main">
    <header>
      <div class="grid-container">
        <div class="grid-item-12 space-info">
          <span class="space-type">
            <ComputerDesktopIcon class="space-icon" />
            Local space
          </span>
          <span class="space-name">Your Local Space</span>
        </div>
      </div>
    </header>

    <section class="toolbar-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <div class="toolbar" />
        </div>
      </div>
    </section>

    <section class="space-explorer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <SpaceExplorer />
        </div>
      </div>
    </section>

    <section class="footer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12 update-bar">
          <span class="text">
            There are updates for 2 extensions available.
          </span>
          <Button
            with-border
            @click="openInstallExtensionsDialog"
          >
            Update now
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
  overflow-y: scroll;
  align-items: stretch;
  height: 100%;
}

header {
  font-family: Roboto, sans-serif;
  min-height: 150px;

  & .grid-container {
    height: 100%;
  }

  & .space-info {
    display: flex !important;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
  }

  & .space-type {
    font-size: 16px;
    color: var(--knime-masala);
    display: flex;

    & .space-icon {
      @mixin svg-icon-size 18;

      margin-right: 5px;
      stroke: var(--knime-masala);
    }
  }

  & .space-name {
    font-size: 36px;
    font-weight: 700;
    color: var(--knime-masala);
  }
}

.toolbar-wrapper {
  min-height: 60px;
  background: var(--knime-gray-light-semi);

  & .grid-container,
  & .grid-item-12,
  & .toolbar {
    height: 100%;
  }

  & .toolbar {
    display: flex;
    align-items: center;
  }
}

.space-explorer-wrapper {
  background: var(--knime-porcelain);
  padding-top: 50px;
  padding-bottom: 80px;
  flex: 1;
}

.footer-wrapper {
  background-color: var(--knime-yellow);

  & .grid-container {
    & .update-bar {
      height: 100px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: "Roboto Condensed", sans-serif;
      font-size: 22px;
      color: var(--knime-masala);
      font-weight: 700;
    }
  }
}
</style>
