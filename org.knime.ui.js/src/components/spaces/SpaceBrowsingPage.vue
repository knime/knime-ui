<script>
import { mapGetters, mapState } from 'vuex';
import ArrowLeftIcon from 'webapps-common/ui/assets/img/icons/arrow-left.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';
import { APP_ROUTES } from '@/router';
import PageHeader from '@/components/common/PageHeader.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import SpaceExplorer from './SpaceExplorer.vue';


export default {
    components: {
        ArrowLeftIcon,
        SpaceExplorer,
        ComputerDesktopIcon,
        PageHeader
    },
    computed: {
        ...mapState('spaces', ['spaceBrowser']),
        ...mapGetters('spaces', ['activeSpaceInfo']),
        spaceInfo() {
            if (this.activeSpaceInfo.local) {
                return {
                    title: 'Your Local Space',
                    subtitle: 'Local space',
                    icon: ComputerDesktopIcon
                };
            }

            return this.activeSpaceInfo.private
                ? {
                    title: this.activeSpaceInfo.name,
                    subtitle: 'Private space',
                    icon: PrivateSpaceIcon
                }
                : {
                    title: this.activeSpaceInfo.name,
                    subtitle: 'Public space',
                    icon: CubeIcon
                };
        }
    },
    async created() {
        if (this.spaceBrowser.spaceId) {
            await this.$store.dispatch('spaces/loadSpaceBrowserState');
        }
    },
    methods: {
        async onItemChanged(itemId) {
            // remember current path
            await this.$store.dispatch('spaces/saveSpaceBrowserState', { itemId });
        },
        onBackButtonClick() {
            this.$store.commit('spaces/clearSpaceBrowserState');
            this.$router.push({ name: APP_ROUTES.EntryPage.SpaceSelectionPage });
        }
    }
};
</script>

<template>
  <main ref="main">
    <PageHeader
      :title="spaceInfo.title"
      :subtitle="spaceInfo.subtitle"
    >
      <template #button>
        <ArrowLeftIcon
          class="back-button"
          @click="onBackButtonClick"
        />
      </template>
      <template #icon>
        <Component :is="spaceInfo.icon" />
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
@import "@/assets/mixins.css";

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

.back-button {
  @mixin svg-icon-size 30;

  stroke: var(--knime-dove-gray);
  border-right: 1px solid var(--knime-silver-sand);
  padding-right: 10px;
  width: 40px;
  height: 60px;

  &:hover {
    cursor: pointer;
    stroke: var(--knime-masala);
  }
}

</style>
