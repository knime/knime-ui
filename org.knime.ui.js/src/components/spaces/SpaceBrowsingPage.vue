<script>
import { mapGetters, mapState } from 'vuex';

import Button from 'webapps-common/ui/components/Button.vue';
import ArrowLeftIcon from 'webapps-common/ui/assets/img/icons/arrow-left.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';

import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import { APP_ROUTES } from '@/router';
import PageHeader from '@/components/common/PageHeader.vue';

import SpaceExplorer from './SpaceExplorer.vue';
import SpaceExplorerActions from './SpaceExplorerActions.vue';

export default {
    components: {
        ArrowLeftIcon,
        SpaceExplorer,
        SpaceExplorerActions,
        ComputerDesktopIcon,
        PageHeader,
        Button
    },

    data() {
        return {
            selectedItems: []
        };
    },

    computed: {
        ...mapState('spaces', ['spaceBrowser', 'spaceProviders']),
        ...mapGetters('spaces', ['activeSpaceInfo', 'hasActiveHubSession']),

        spaceInfo() {
            if (this.activeSpaceInfo.local) {
                return {
                    title: 'Your local space',
                    subtitle: 'Local space',
                    icon: ComputerDesktopIcon
                };
            }

            const isPrivateSpace = this.activeSpaceInfo.private;

            return {
                title: this.activeSpaceInfo.name,
                subtitle: isPrivateSpace ? 'Private space' : 'Public space',
                icon: isPrivateSpace ? PrivateSpaceIcon : CubeIcon
            };
        },

        explorerDisabledActions() {
            return {
                uploadToHub: !this.hasActiveHubSession || this.selectedItems.length === 0,
                downloadToLocalSpace: this.selectedItems.length === 0
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
          <div class="toolbar">
            <SpaceExplorerActions
              :disabled-actions="explorerDisabledActions"
              @action:create-workflow="$store.dispatch('spaces/createWorkflow')"
              @action:create-folder="$store.dispatch('spaces/createFolder')"
              @action:import-workflow="$store.dispatch('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' })"
              @action:import-files="$store.dispatch('spaces/importToWorkflowGroup', { importType: 'FILES' })"
              @action:upload-to-hub="$store.dispatch('spaces/uploadToHub', { itemIds: selectedItems })"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="space-explorer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <SpaceExplorer
            @item-changed="onItemChanged"
            @change-selection="selectedItems = $event"
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
    justify-content: flex-end;
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
