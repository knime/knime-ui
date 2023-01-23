<script>
import { mapGetters, mapState } from 'vuex';
import Button from 'webapps-common/ui/components/Button.vue';
import ArrowLeftIcon from 'webapps-common/ui/assets/img/icons/arrow-left.svg';
import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';
import { APP_ROUTES } from '@/router';
import PageHeader from '@/components/common/PageHeader.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import AddFileIcon from '@/assets/add-file.svg';
import ImportWorkflowIcon from '@/assets/import-workflow.svg';
import SpaceExplorer from './SpaceExplorer.vue';


export default {
    components: {
        ArrowLeftIcon,
        SpaceExplorer,
        ComputerDesktopIcon,
        AddFileIcon,
        ImportWorkflowIcon,
        PageHeader,
        Button
    },
    computed: {
        ...mapState('spaces', ['spaceBrowser']),
        ...mapGetters('spaces', ['activeSpaceInfo']),
        spaceInfo() {
            if (this.activeSpaceInfo.local) {
                return {
                    title: 'Your local space',
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
          <div class="toolbar">
            <div class="toolbar-buttons">
              <Button
                with-border
                compact
              >
                <ImportWorkflowIcon />
                Import workflow
              </Button>
              <Button
                with-border
                compact
              >
                <AddFileIcon />
                Add files
              </Button>
            </div>
          </div>
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
    justify-content: flex-end;

    & .toolbar-buttons {
      & .button {
        margin-left: 5px;
        border-color: var(--knime-silver-sand);
        color: var(--knime-masala);

        & svg {
          @mixin svg-icon-size 18;

          stroke: var(--knime-masala);
          margin-right: 4px;
        }

        &:hover {
          cursor: pointer;
          color: var(--knime-white);
          background-color: var(--knime-masala);
          border-color: var(--knime-masala);

          & svg {
            stroke: var(--knime-white);
          }
        }
      }
    }
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
