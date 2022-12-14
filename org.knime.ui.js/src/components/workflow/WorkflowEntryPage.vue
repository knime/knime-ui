<script>
import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';

export default {
    components: {
        SpaceExplorer,
        ComputerDesktopIcon
    }
};
</script>

<template>
  <main>
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
  </main>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

main {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--knime-white);
  flex-direction: column;
  height: 100vh;
}

header {
  font-family: Roboto, sans-serif;
  height: 200px;

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
  }
}

.space-explorer-wrapper {
  background: var(--knime-porcelain);
  height: 100%;
  padding-top: 50px;
}
</style>
