<script>
import { mapGetters, mapState } from 'vuex';

import PlusButton from 'webapps-common/ui/components/PlusButton.vue';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';

import PlusIcon from '@/assets/plus.svg';
import ToolbarButton from '@/components/common/ToolbarButton.vue';

import LoadingIcon from './LoadingIcon.vue';
import FileExplorer from './FileExplorer/FileExplorer.vue';

const DISPLAY_LOADING_DELAY = 1000;

export default {
    components: {
        FileExplorer,
        LoadingIcon,
        Breadcrumb,
        PlusButton,
        PlusIcon,
        ToolbarButton
    },

    props: {
        mode: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'mini'].includes(value)
        }
    },

    data() {
        return {
            isLoading: false
        };
    },

    computed: {
        ...mapState('spaces', {
            startItemId: state => state.activeSpace?.startItemId,
            activeWorkflowGroup: state => state.activeSpace?.activeWorkflowGroup,
            spaceId: state => state.activeSpace?.spaceId
        }),
        ...mapGetters('spaces', ['openedWorkflowItems', 'pathToItemId']),

        fileExplorerItems() {
            return this.activeWorkflowGroup.items.map(item => ({
                ...item,
                displayOpenIndicator: this.openedWorkflowItems.includes(item.id)
            }));
        },

        canCreateWorkflow() {
            return this.spaceId === 'local';
        },

        breadcrumbItems() {
            if (!this.activeWorkflowGroup) {
                return [];
            }

            const { path } = this.activeWorkflowGroup;
            const rootBreadcrumb = {
                text: 'Home',
                id: 'root',
                clickable: path.length > 0
            };
            const lastPathIndex = path.length - 1;

            return [rootBreadcrumb].concat(
                path.map((pathItem, index) => ({
                    text: pathItem.name,
                    id: pathItem.id,
                    clickable: index !== lastPathIndex
                }))
            );
        },

        fullPath() {
            if (!this.activeWorkflowGroup) {
                return '';
            }
            const { path } = this.activeWorkflowGroup;
            return ['home'].concat(path.map(({ name }) => name)).join('/');
        },

        createWorkflowButtonTitle() {
            const { text, hotkeyText } = this.$shortcuts.get('createWorkflow');
            return `${text} (${hotkeyText})`;
        }
    },

    watch: {
        async startItemId(newStartItemId, oldStartItemId) {
            if (newStartItemId && newStartItemId !== oldStartItemId) {
                await this.fetchWorkflowGroupContent(this.startItemId || 'root');
            }
        }
    },

    async created() {
        await this.fetchWorkflowGroupContent(this.startItemId || 'root');
    },

    methods: {
        // Only display loader after a set waiting time, to avoid making the operations seem longer
        setLoading(value) {
            if (!value) {
                this.isLoading = false;
                clearTimeout(this.loadingTimer);
                return;
            }

            this.loadingTimer = setTimeout(() => {
                this.isLoading = true;
            }, DISPLAY_LOADING_DELAY);
        },

        async fetchWorkflowGroupContent(itemId) {
            this.setLoading(true);

            await this.$store.dispatch('spaces/fetchWorkflowGroupContent', { itemId });

            this.setLoading(false);
        },

        async onChangeDirectory(pathId) {
            this.setLoading(true);

            await this.$store.dispatch('spaces/changeDirectory', { pathId });

            this.setLoading(false);

            this.$emit('item-changed', this.pathToItemId(pathId));
        },

        onCreateWorkflow() {
            this.$store.dispatch('spaces/createWorkflow');
        },

        onOpenFile({ id }) {
            this.$store.dispatch('spaces/openWorkflow', {
                workflowItemId: id,
                // send in router so it can be used to navigate to an already open workflow
                $router: this.$router
            });
        },

        onBreadcrumbClick({ id }) {
            this.fetchWorkflowGroupContent(id);
        }
    }
};
</script>

<template>
  <div
    :class="mode"
    class="space-explorer"
  >
    <div class="breadcrumb-wrapper">
      <Breadcrumb
        :items="breadcrumbItems"
        @click-item="onBreadcrumbClick"
      />

      <ToolbarButton
        v-if="mode === 'mini' && canCreateWorkflow"
        primary
        class="create-workflow-mini-btn"
        :title="createWorkflowButtonTitle"
        @click.native="onCreateWorkflow"
      >
        <PlusIcon />
      </ToolbarButton>
    </div>

    <PlusButton
      v-if="mode === 'normal' && canCreateWorkflow"
      :title="createWorkflowButtonTitle"
      primary
      class="create-workflow-btn"
      @click="onCreateWorkflow"
    />

    <FileExplorer
      v-if="activeWorkflowGroup && !isLoading"
      :mode="mode"
      :items="fileExplorerItems"
      :is-root-folder="activeWorkflowGroup.path.length === 0"
      :full-path="fullPath"
      @change-directory="onChangeDirectory"
      @open-file="onOpenFile"
    />

    <div
      v-if="isLoading"
      class="loading"
    >
      <LoadingIcon />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

.space-explorer {
  position: relative;

  & .create-workflow-btn {
    position: absolute;
    right: -76px;
    top: 6px;
  }
}

.breadcrumb-wrapper {
  position: relative;
  display: flex;
  padding-bottom: 5px;
  margin-bottom: 12px;
  width: 100%;
  border-bottom: 1px solid var(--knime-silver-sand);
  overflow-x: auto;
  align-items: center;

  & .create-workflow-mini-btn {
    margin-left: auto;
    margin-right: 5px;
  }

  & .breadcrumb {
    padding-bottom: 0;
    overflow-x: auto;
    white-space: pre;
    -ms-overflow-style: none; /* needed to hide scroll bar in edge */
    scrollbar-width: none; /* for firefox */
    user-select: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

.mini {
  padding: 20px 15px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;

  & svg {
    @mixin svg-icon-size 30;

    stroke: var(--knime-masala);
  }
}

</style>
