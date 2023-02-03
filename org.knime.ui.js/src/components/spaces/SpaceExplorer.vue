<script>
import { mapActions, mapGetters, mapState } from 'vuex';

import PlusButton from 'webapps-common/ui/components/PlusButton.vue';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import FolderPlusIcon from 'webapps-common/ui/assets/img/icons/folder-plus.svg';

import PlusIcon from '@/assets/plus.svg';
import AddFileIcon from '@/assets/add-file.svg';
import ImportWorkflowIcon from '@/assets/import-workflow.svg';
import ToolbarButton from '@/components/common/ToolbarButton.vue';

import LoadingIcon from './LoadingIcon.vue';
import FileExplorer from './FileExplorer/FileExplorer.vue';

import ITEM_TYPES from '@/util/spaceItemTypes';

const DISPLAY_LOADING_DELAY = 100;
const DISPLAY_LOADING_ICON_DELAY = 350;
const DEFAULT_LOADING_INDICATOR_HEIGHT = 76; // px
const ITEM_TYPES_TEXTS = {
    [ITEM_TYPES.WorkflowGroup]: 'folder',
    [ITEM_TYPES.Workflow]: 'workflow',
    [ITEM_TYPES.Component]: 'component',
    [ITEM_TYPES.Metanode]: 'metanode',
    [ITEM_TYPES.Data]: 'data file'
};

export default {
    components: {
        FileExplorer,
        LoadingIcon,
        Breadcrumb,
        PlusButton,
        PlusIcon,
        AddFileIcon,
        ImportWorkflowIcon,
        FolderPlusIcon,
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
            isLoading: false,
            showLoadingIcon: false,
            loadingHeight: DEFAULT_LOADING_INDICATOR_HEIGHT
        };
    },

    computed: {
        ...mapState('spaces', {
            startItemId: state => state.activeSpace?.startItemId,
            activeWorkflowGroup: state => state.activeSpace?.activeWorkflowGroup,
            spaceId: state => state.activeSpace?.spaceId
        }),
        ...mapGetters('spaces', ['openedWorkflowItems', 'openedFolderItems', 'pathToItemId']),

        fileExplorerItems() {
            return this.activeWorkflowGroup.items.map(item => ({
                ...item,
                displayOpenIndicator:
                    this.openedWorkflowItems.includes(item.id) || this.openedFolderItems.includes(item.id),
                canBeDeleted: !this.openedWorkflowItems.includes(item.id) && !this.openedFolderItems.includes(item.id)
            }));
        },

        isLocal() {
            return this.spaceId === 'local';
        },

        breadcrumbItems() {
            if (!this.activeWorkflowGroup) {
                return [{
                    text: 'Home',
                    id: 'root',
                    clickable: false
                }];
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
        activeWorkflowGroup: {
            async handler(newData, oldData) {
                if (newData === null && oldData !== null) {
                    await this.fetchWorkflowGroupContent(this.startItemId || 'root');
                }
            },
            immediate: true
        }
    },

    methods: {
        ...mapActions('spaces', ['importToWorkflowGroup', 'createFolder', 'createWorkflow']),
        // Only display loader after a set waiting time, to avoid making the operations seem longer
        setLoading(value) {
            if (!value) {
                this.showLoadingIcon = false;
                this.isLoading = false;
                this.loadingHeight = DEFAULT_LOADING_INDICATOR_HEIGHT;
                clearTimeout(this.loadingTimer);
                clearTimeout(this.loadingIconTimer);
                return;
            }

            // use file explorers size as height for the loader to avoid jumping
            if (this.$refs.fileExplorer) {
                this.loadingHeight = this.$refs.fileExplorer.$el.getBoundingClientRect().height;
            }

            this.loadingTimer = setTimeout(() => {
                this.isLoading = true;
            }, DISPLAY_LOADING_DELAY);

            this.loadingIconTimer = setTimeout(() => {
                this.showLoadingIcon = true;
            }, DISPLAY_LOADING_ICON_DELAY);
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

        async onOpenFile({ id }) {
            await this.$store.dispatch('spaces/openWorkflow', {
                workflowItemId: id,
                // send in router, so it can be used to navigate to an already open workflow
                $router: this.$router
            });
        },

        onRenameFile({ itemId, newName }) {
            this.$store.dispatch('spaces/renameItem', { itemId, newName })
                .catch(() => {
                    // TODO replace with a better notification alternative when available
                    window.alert(
                        `Could not rename the selected item with the new name "${newName}". Check for duplicates.`
                    );
                });
        },

        onBreadcrumbClick({ id }) {
            this.fetchWorkflowGroupContent(id);
            this.$emit('item-changed', id);
        },

        onDeleteItems({ items }) {
            const itemNameList = items
                .map((item) => `${ITEM_TYPES_TEXTS[item.type]} ${item.name}`)
                .join(', ');
            const message = `Do you want to delete the ${itemNameList}?`;
            // TODO(NXT-1472) use a modal instead of a native dialog
            const result = window.confirm(message);
            if (result) {
                this.$store.dispatch('spaces/deleteItems', { itemIds: items.map(i => i.id) });
            }
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

      <div
        v-if="mode === 'mini' && isLocal"
        class="buttons"
      >
        <ToolbarButton
          title="Create folder"
          @click.native="createFolder"
        >
          <FolderPlusIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Import workflow"
          @click.native="importToWorkflowGroup({importType: 'WORKFLOW'})"
        >
          <ImportWorkflowIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Add file"
          @click.native="importToWorkflowGroup({importType: 'FILES'})"
        >
          <AddFileIcon />
        </ToolbarButton>
        <ToolbarButton
          primary
          class="create-workflow-mini-btn"
          :title="createWorkflowButtonTitle"
          @click.native="createWorkflow"
        >
          <PlusIcon />
        </ToolbarButton>
      </div>
    </div>

    <PlusButton
      v-if="mode === 'normal' && isLocal"
      :title="createWorkflowButtonTitle"
      primary
      class="create-workflow-btn"
      @click="createWorkflow"
    />

    <FileExplorer
      v-if="activeWorkflowGroup && !isLoading"
      ref="fileExplorer"
      :mode="mode"
      :items="fileExplorerItems"
      :is-root-folder="activeWorkflowGroup.path.length === 0"
      :full-path="fullPath"
      @change-directory="onChangeDirectory"
      @open-file="onOpenFile"
      @rename-file="onRenameFile"
      @delete-items="onDeleteItems"
    />

    <div
      v-if="isLoading"
      class="loading"
      :style="`--loading-height: ${loadingHeight}px`"
    >
      <LoadingIcon
        v-show="showLoadingIcon"
      />
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
  justify-content: space-between;
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
    font-size: 16px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  & .buttons {
    display: flex;
  }
}

.mini {
  padding: 5px 15px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: var(--loading-height, 76px); /* two items */
  background: var(--knime-gray-ultra-light);

  & svg {
    @mixin svg-icon-size 30;

    stroke: var(--knime-masala);
  }
}

</style>
