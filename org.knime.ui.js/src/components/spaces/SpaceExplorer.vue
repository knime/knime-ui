<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';
import { API } from '@api';

import CubeIcon from 'webapps-common/ui/assets/img/icons/cube.svg';
import TrashIcon from 'webapps-common/ui/assets/img/icons/trash.svg';
import PrivateSpaceIcon from 'webapps-common/ui/assets/img/icons/private-space.svg';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import Modal from 'webapps-common/ui/components/Modal.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import MenuItems from 'webapps-common/ui/components/MenuItems.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import type { MenuItem } from 'webapps-common/ui/components/MenuItemsBase.vue';

import { SpaceItem, type WorkflowGroupContent } from '@/api/gateway-api/generated-api';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import { APP_ROUTES } from '@/router/appRoutes';
import SmartLoader from '@/components/common/SmartLoader.vue';

import SpaceExplorerActions from './SpaceExplorerActions.vue';
import FileExplorer from './FileExplorer/FileExplorer.vue';
import type { FileExplorerItem, FileExplorerContextMenu } from './FileExplorer/types';

const ITEM_TYPES_TEXTS = {
    [SpaceItem.TypeEnum.WorkflowGroup]: 'folder',
    [SpaceItem.TypeEnum.Workflow]: 'workflow',
    [SpaceItem.TypeEnum.Component]: 'component',
    [SpaceItem.TypeEnum.WorkflowTemplate]: 'metanode',
    [SpaceItem.TypeEnum.Data]: 'data file'
} as const;

export default defineComponent({
    components: {
        SpaceExplorerActions,
        FileExplorer,
        MenuItems,
        NodePreview,
        Breadcrumb,
        SmartLoader,
        Modal,
        Button,
        TrashIcon
    },

    props: {
        mode: {
            type: String as PropType<'normal' | 'mini'>,
            default: 'normal',
            validator: (value: string) => ['normal', 'mini'].includes(value)
        }
    },

    emits: ['changeSelection', 'itemChanged'],

    data() {
        return {
            selectedItems: [],
            isAboveCanvas: false,
            fileNodeTemplate: null,
            deleteModal: {
                deleteModalActive: false,
                modalMessage: null,
                items: []
            },
            nodeTemplate: null,
            shouldShowPreview: false
        };
    },

    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates']),
        ...mapState('canvas', ['getScrollContainerElement']),
        ...mapState('application', ['openProjects', 'fileExtensionToNodeTemplateId']),
        ...mapState('spaces', {
            activeSpace: state => state.activeSpace,
            activeSpaceProvider: state => state.activeSpaceProvider,
            startItemId: state => state.activeSpace?.startItemId as string,
            activeWorkflowGroup: state => state.activeSpace?.activeWorkflowGroup as WorkflowGroupContent,
            spaceId: state => state.activeSpace?.spaceId as string,
            isLoading: state => state.isLoading as boolean
        }),
        ...mapState('nodeRepository', ['nodesPerCategory']),
        ...mapGetters('spaces', [
            'openedWorkflowItems',
            'openedFolderItems',
            'pathToItemId',
            'hasActiveHubSession',
            'activeSpaceInfo'
        ]),

        fileExplorerItems(): Array<FileExplorerItem> {
            return this.activeWorkflowGroup.items.map(item => {
                const isOpen = this.openedWorkflowItems.includes(item.id) || this.openedFolderItems.includes(item.id);

                return {
                    ...item,
                    isOpen,
                    canBeRenamed: !isOpen,
                    canBeDeleted: !this.openedFolderItems.includes(item.id)
                };
            });
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
        ...mapActions('nodeRepository', ['getNodeTemplate']),
        ...mapActions('application', ['forceCloseProjects']),
        async fetchWorkflowGroupContent(itemId) {
            await this.$store.dispatch('spaces/fetchWorkflowGroupContent', { itemId });
        },

        onSelectionChange(selectedItems) {
            this.selectedItems = selectedItems;
            this.$emit('changeSelection', selectedItems);
        },

        async onChangeDirectory(pathId) {
            await this.$store.dispatch('spaces/changeDirectory', { pathId });

            this.$emit('itemChanged', this.pathToItemId(pathId));
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

        async onBreadcrumbClick({ id }) {
            await this.fetchWorkflowGroupContent(id);
            this.$emit('itemChanged', id);
        },

        onDeleteItems({ items }) {
            const itemNameList = items
                .map((item) => `${ITEM_TYPES_TEXTS[item.type]} “${item.name}”`)
                .join(', ');

            this.deleteModal.modalMessage = `Do you want to delete the ${itemNameList}?`;

            this.deleteModal.items = items;
            this.deleteModal.deleteModalActive = true;
        },

        async deleteItems() {
            this.deleteModal.deleteModalActive = false;

            const itemIds = this.deleteModal.items.map(item => item.id);
            const relevantProjects = this.openProjects.filter(({ origin }) => itemIds.includes(origin.itemId));
            const projectIds = relevantProjects.map(({ projectId }) => projectId);
            let nextProjectId;
            if (projectIds.length) {
                nextProjectId = await this.forceCloseProjects({ projectIds });
            }

            await this.$store.dispatch('spaces/deleteItems', { itemIds });
            if (nextProjectId) {
                await this.$router.push({
                    name: APP_ROUTES.WorkflowPage,
                    params: { projectId: nextProjectId, workflowId: 'root' }
                });
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

            const destWorkflowGroupItemId = this.pathToItemId(targetItem);
            const collisionStrategy = API.desktop.getNameCollisionStrategy({
                spaceProviderId: this.activeSpaceProvider.id,
                spaceId: this.activeSpace.spaceId,
                itemIds: sourceItems,
                destinationItemId: destWorkflowGroupItemId
            });

            if (collisionStrategy === 'CANCEL') {
                onComplete(false);

                return;
            }

            try {
                await this.$store.dispatch(
                    'spaces/moveItems',
                    { itemIds: sourceItems, destWorkflowGroupItemId, collisionStrategy }
                );

                onComplete(true);
            } catch (error) {
                consola.error(`There was a problem moving the items`, { error });
                onComplete(false);
            }
        },

        /**
         * @typedef Payload
         * @property {MouseEvent} event
         * @property {item} sourceItem
         * @property {isAboveCanvas: boolean, nodeTemplate: object) => void} onUpdate
        */
        /**
         * @param {Payload} eventPayload
         * @returns {Void}
         */
        async onDrag({ event, item }) {
            const nodeTemplateId = this.getNodeTemplateId(item);
            if (!nodeTemplateId) {
                return;
            }

            // check if item is above canvas
            const screenX = event.clientX - this.$shapes.nodeSize / 2;
            const screenY = event.clientY - this.$shapes.nodeSize / 2;

            const el = document.elementFromPoint(screenX, screenY);

            const kanvas = this.getScrollContainerElement();

            if (!this.nodeTemplate) {
                this.nodeTemplate = await this.getNodeTemplate(nodeTemplateId);
            }

            this.isAboveCanvas = kanvas.contains(el);
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
            this.nodeTemplate = null;

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

            const nodeTemplateId = this.getNodeTemplateId(sourceItem);
            if (!nodeTemplateId) {
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
                    },
                    nodeFactory: {
                        className: nodeTemplateId
                    }
                });
                onComplete(true);
            } catch (error) {
                onComplete(false);
                consola.error({ message: 'Error adding node via file to workflow', error });
                throw error;
            }
        },

        getNodeTemplateId(sourceItem: FileExplorerItem) {
            const sourceFileExtension = Object
                .keys(this.fileExtensionToNodeTemplateId)
                .find(extension => sourceItem.name.endsWith(extension));

            return this.fileExtensionToNodeTemplateId[sourceFileExtension];
        },

        fileExplorerContextMenuItems(
            getRenameOption: FileExplorerContextMenu.GetDefaultMenuOption,
            getDeleteOption: FileExplorerContextMenu.GetDefaultMenuOption,
            anchorItem: FileExplorerItem
        ): MenuItem[] {
            const openFileType = anchorItem.type === SpaceItem.TypeEnum.Workflow
                ? 'workflows'
                : 'folders';

            const renameOptionTitle = anchorItem.isOpen
                ? `Open ${openFileType} cannot be renamed`
                : '';

            return [
                {
                    id: 'another option',
                    text: 'Export',
                    title: 'Export',
                    disabled: false
                },
                getRenameOption(anchorItem, { title: renameOptionTitle }),
                getDeleteOption(anchorItem, {
                    title: anchorItem.canBeDeleted ? '' : 'Open folders cannot be deleted'
                })
            ];
        }
    }
});
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
        :has-active-hub-session="hasActiveHubSession"
        @action:create-workflow="$store.commit('spaces/setIsCreateWorkflowModalOpen', true)"
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
        @drag="onDrag"
        @dragend="onDragEnd"
      >
        <template
          v-if="nodeTemplate && isAboveCanvas"
          #customDragPreview
        >
          <NodePreview
            :type="nodeTemplate.type"
            :in-ports="nodeTemplate.inPorts"
            :out-ports="nodeTemplate.outPorts"
            :icon="nodeTemplate.icon"
          />
        </template>

        <template #contextMenu="{ getRenameOption, getDeleteOption, anchorItem, onItemClick }">
          <MenuItems
            menu-aria-label="Space explorer context menu"
            :items="fileExplorerContextMenuItems(getRenameOption, getDeleteOption, anchorItem.item)"
            @item-click="(_, item) => onItemClick(item)"
          />
        </template>
      </FileExplorer>
    </SmartLoader>
    <div>
      <Modal
        :active="deleteModal.deleteModalActive && Boolean(deleteModal.modalMessage)"
        title="Delete"
        style-type="info"
        @cancel="deleteModal.deleteModalActive = false"
      >
        <template #icon><TrashIcon /></template>
        <template #confirmation>{{ deleteModal.modalMessage }}</template>
        <template #controls>
          <Button
            with-border
            @click="deleteModal.deleteModalActive = false"
          >
            Cancel
          </Button>
          <Button
            primary
            @click="deleteItems"
          >
            Ok
          </Button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

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

    & :deep(ul > li > span) {
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
  --smartloader-bg: var(--knime-gray-ultra-light);
  --smartloader-icon-size: 30;
}
</style>
