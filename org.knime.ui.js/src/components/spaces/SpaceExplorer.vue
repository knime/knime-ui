<script>
import { mapGetters, mapState } from 'vuex';
import { getNameCollisionStrategy } from '@api';

import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';

import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import ITEM_TYPES from '@/util/spaceItemTypes';
import { APP_ROUTES } from '@/router';
import SmartLoader from '@/components/common/SmartLoader.vue';

import SpaceExplorerActions from './SpaceExplorerActions.vue';
import FileExplorer from './FileExplorer/FileExplorer.vue';

const ITEM_TYPES_TEXTS = {
    [ITEM_TYPES.WorkflowGroup]: 'folder',
    [ITEM_TYPES.Workflow]: 'workflow',
    [ITEM_TYPES.Component]: 'component',
    [ITEM_TYPES.Metanode]: 'metanode',
    [ITEM_TYPES.Data]: 'data file'
};

export default {
    components: {
        SpaceExplorerActions,
        FileExplorer,
        Breadcrumb,
        SmartLoader
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
            selectedItems: []
        };
    },

    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('canvas', ['getScrollContainerElement']),
        ...mapState('application', ['openProjects']),
        ...mapState('spaces', {
            activeSpace: state => state.activeSpace,
            activeSpaceProvider: state => state.activeSpaceProvider,
            startItemId: state => state.activeSpace?.startItemId,
            activeWorkflowGroup: state => state.activeSpace?.activeWorkflowGroup,
            spaceId: state => state.activeSpace?.spaceId,
            isLoading: state => state.isLoading
        }),
        ...mapGetters('spaces', [
            'openedWorkflowItems',
            'openedFolderItems',
            'pathToItemId',
            'hasActiveHubSession',
            'activeSpaceInfo'
        ]),

        fileExplorerItems() {
            return this.activeWorkflowGroup.items.map(item => ({
                ...item,
                displayOpenIndicator:
                  this.openedWorkflowItems.includes(item.id) || this.openedFolderItems.includes(item.id),

                canBeDeleted:
                  !this.openedWorkflowItems.includes(item.id) && !this.openedFolderItems.includes(item.id)
            }));
        },

        isLocal() {
            return this.spaceId === 'local';
        },

        homeBreadcrumbItem() {
            if (this.mode !== 'mini') {
                return {
                    text: 'Home',
                    id: 'root'
                };
            }

            // use icons for mini mode
            let icon = ComputerDesktopIcon;
            if (!this.activeSpaceInfo.local) {
                icon = this.activeSpaceInfo.private ? PrivateSpaceIcon : CubeIcon;
            }
            return {
                title: this.activeSpaceInfo.name,
                icon,
                id: 'root'
            };
        },

        breadcrumbItems() {
            if (!this.activeWorkflowGroup) {
                return [{
                    ...this.homeBreadcrumbItem,
                    clickable: false
                }];
            }

            const { path } = this.activeWorkflowGroup;
            const rootBreadcrumb = {
                ...this.homeBreadcrumbItem,
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

        explorerDisabledActions() {
            return {
                uploadToHub: !this.hasActiveHubSession || this.selectedItems.length === 0,
                downloadToLocalSpace: this.isLocal || this.selectedItems.length === 0
            };
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
        async fetchWorkflowGroupContent(itemId) {
            await this.$store.dispatch('spaces/fetchWorkflowGroupContent', { itemId });
        },

        onSelectionChange(selectedItems) {
            this.selectedItems = selectedItems;
            this.$emit('change-selection', selectedItems);
        },

        async onChangeDirectory(pathId) {
            await this.$store.dispatch('spaces/changeDirectory', { pathId });

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
        },

        /**
         * @typedef Payload
         * @property {Array<string>} sourceItems
         * @property {String} targetItem
         * @property {(success: boolean) => void} onComplete
        */
        /**
         * @param {Payload} eventPayload
         * @returns {Void}
         */
        async onMoveItems({ sourceItems, targetItem, onComplete }) {
            const openedWorkflows = this.openProjects.filter(workflow => sourceItems.includes(workflow.origin.itemId));
            const isInsideFolder = this.openProjects.filter(
                (project) => project.origin.ancestorItemIds
                    .some((ancestorId) => sourceItems.includes(ancestorId))
            );

            if (openedWorkflows.length || isInsideFolder.length) {
                const openedWorkflowsNames = openedWorkflows.map(workflow => workflow.name);
                const isInsideFolderNames = isInsideFolder.map(workflow => workflow.name);
                const extraSpace = openedWorkflows.length && isInsideFolder.length ? '\n' : '';

                alert(`Following workflows are opened:\n
                 ${openedWorkflowsNames.map(name => `• ${name}`).join('\n') + extraSpace +
                 isInsideFolderNames.map(name => `• ${name}`).join('\n')}
                \nTo move your selected items, they have to be closed first`);

                onComplete(false);

                return;
            }

            if (this.isLocal) {
                const destWorkflowGroupItemId = this.pathToItemId(targetItem);
                const collisionStrategy = await getNameCollisionStrategy({
                    itemIds: sourceItems,
                    destWorkflowGroupItemId
                });

                if (collisionStrategy === 'CANCEL') {
                    onComplete(false);

                    return;
                }

                try {
                    this.$store.dispatch(
                        'spaces/moveItems',
                        { itemIds: sourceItems, destWorkflowGroupItemId, collisionStrategy }
                    );
                
                    onComplete(true);
                } catch (error) {
                    consola.error(`There was a problem moving the items`, { error });
                    onComplete(false);
                }
            }
        },

        /**
         * @typedef Payload
         * @property {MouseEvent} event
         * @property {{ id: string }} sourceItem
         * @property {(success: boolean) => void} onComplete
        */
        /**
         * @param {Payload} eventPayload
         * @returns {Void}
         */
        async onDragEnd({ event, sourceItem, onComplete }) {
            const screenX = event.clientX - this.$shapes.nodeSize / 2;
            const screenY = event.clientY - this.$shapes.nodeSize / 2;

            const el = document.elementFromPoint(screenX, screenY);

            // skip behavior when not on the workflow
            if (this.$route.name !== APP_ROUTES.WorkflowPage) {
                onComplete(false);
                return;
            }

            const kanvas = this.getScrollContainerElement();

            if (!kanvas.contains(el)) {
                onComplete(false);
                return;
            }

            try {
                const [x, y] = this.screenToCanvasCoordinates([screenX, screenY]);
                await this.$store.dispatch('workflow/addNode', {
                    position: { x, y },
                    spaceItemReference: {
                        itemId: sourceItem.id,
                        providerId: this.activeSpaceProvider.id,
                        spaceId: this.activeSpace.spaceId
                    }
                });
                onComplete(true);
            } catch (error) {
                onComplete(false);
                consola.error({ message: 'Error adding node via file to workflow', error });
                throw error;
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

      <SpaceExplorerActions
        v-if="mode === 'mini'"
        mode="mini"
        :is-local="isLocal"
        :disabled-actions="explorerDisabledActions"
        @action:create-workflow="$store.dispatch('spaces/createWorkflow')"
        @action:create-folder="$store.dispatch('spaces/createFolder')"
        @action:import-workflow="$store.dispatch('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' })"
        @action:import-files="$store.dispatch('spaces/importToWorkflowGroup', { importType: 'FILES' })"
        @action:upload-to-hub="$store.dispatch('spaces/copyBetweenSpaces', { itemIds: selectedItems })"
        @action:download-to-local-space="$store.dispatch('spaces/copyBetweenSpaces', { itemIds: selectedItems })"
      />
    </div>

    <SmartLoader
      class="smart-loader"
      :loading="isLoading"
      :config="{
        initialDimensions: { height: '76px' },
        staggerStageCount: 1,
      }"
    >
      <FileExplorer
        v-if="activeWorkflowGroup"
        :mode="mode"
        :items="fileExplorerItems"
        :is-root-folder="activeWorkflowGroup.path.length === 0"
        :full-path="fullPath"
        @change-directory="onChangeDirectory"
        @change-selection="onSelectionChange"
        @open-file="onOpenFile"
        @rename-file="onRenameFile"
        @delete-items="onDeleteItems"
        @move-items="onMoveItems"
        @dragend="onDragEnd"
      />
    </SmartLoader>
  </div>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

.space-explorer {
  position: relative;

  & .create-workflow-btn {
    position: absolute;
    right: 0;
    top: -34px;
  }

  @media only screen and (min-width: 1600px) {
    & .create-workflow-btn {
      position: absolute;
      right: -76px;
      top: 6px;
    }
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
    margin-right: 8px;

    &::-webkit-scrollbar {
      display: none;
    }

    & >>> ul > li > span {
      color: var(--knime-dove-gray);

      &:last-child,
      &:hover {
        color: var(--knime-masala);
      }
    }
  }
}

.mini {
  padding: 5px 15px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.smart-loader {
  --smartloader-overlay-bg: var(--knime-gray-ultra-light);
  --smartloader-icon-size: 30;
}
</style>
