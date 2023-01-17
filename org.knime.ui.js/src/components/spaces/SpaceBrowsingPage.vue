<script>
import PageHeader from '@/components/common/PageHeader.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import SpaceExplorer from './SpaceExplorer.vue';
import { mapState } from 'vuex';

export default {
    components: {
        SpaceExplorer,
        ComputerDesktopIcon,
        PageHeader
    },
    computed: {
        ...mapState('spaces', ['spaceBrowser'])
    },
    beforeMount() {
        if (this.spaceBrowser.spaceId) {
            this.$store.commit('spaces/loadSpaceBrowserState');
        }
        // TODO: clear on back: this.$store.commit('spaces/clearSpaceBrowserState');
    },
    methods: {
        onItemChanged(id) {
            // remember current path
            this.$store.dispatch('spaces/saveSpaceBrowserState');
        }
    }
};
</script>

<template>
  <main ref="main">
    <PageHeader
      title="Your Local Space"
      subtitle="Local space"
    >
      <template #icon>
        <ComputerDesktopIcon />
      </template>
    </PageHeader>

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
          <SpaceExplorer
            @item-changed="onItemChanged"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
  overflow-y: scroll;
  height: 100%;
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
</style>
