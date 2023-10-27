<script lang="ts">
/* eslint-disable max-lines */
import { defineComponent, type PropType } from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import { API } from "@api";

import TrashIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";
import SpaceSelectionDropdown from "./SpaceSelectionDropdown.vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import Modal from "webapps-common/ui/components/Modal.vue";
import Button from "webapps-common/ui/components/Button.vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FolderIcon from "webapps-common/ui/assets/img/icons/folder.svg";
import FileTextIcon from "webapps-common/ui/assets/img/icons/file-text.svg";
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import NodeWorkflowIcon from "webapps-common/ui/assets/img/icons/node-workflow.svg";
import WorkflowNodeStackIcon from "webapps-common/ui/assets/img/icons/workflow-node-stack.svg";
import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";

import type { PathTriplet, SpacesState } from "@/store/spaces";
import {
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import SmartLoader from "@/components/common/SmartLoader.vue";
import SpaceExplorerContextMenu from "@/components/spaces/SpaceExplorerContextMenu.vue";

import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import DeploymentsModal from "./DeploymentsModal/DeploymentsModal.vue";

type FileExplorerItemWithMeta = FileExplorerItem<{ type: SpaceItem.TypeEnum }>;

const isComponent = (nodeTemplateId: string | null, item: FileExplorerItem) => {
  return !nodeTemplateId && item.meta.type === SpaceItem.TypeEnum.Component;
};

const itemIconRenderer = (item: FileExplorerItemWithMeta) => {
  const typeIcons = {
    [SpaceItem.TypeEnum.WorkflowGroup]: FolderIcon,
    [SpaceItem.TypeEnum.Workflow]: WorkflowIcon,
    [SpaceItem.TypeEnum.Component]: NodeWorkflowIcon,
    [SpaceItem.TypeEnum.WorkflowTemplate]: WorkflowNodeStackIcon,
    [SpaceItem.TypeEnum.Data]: FileTextIcon,
  };

  return typeIcons[item.meta.type];
};

export default defineComponent({
  components: {
    SpaceExplorerContextMenu,
    SpaceExplorerActions,
    FileExplorer,
    NodePreview,
    SpaceSelectionDropdown,
    Breadcrumb,
    SmartLoader,
    Modal,
    Button,
    TrashIcon,
    DeploymentsModal,
  },

  props: {
    mode: {
      type: String as PropType<"normal" | "mini">,
      default: "normal",
      validator: (value: string) => ["normal", "mini"].includes(value),
    },
    projectId: {
      type: [String, null],
      required: true,
    },
  },

  emits: ["changeSelection", "itemChanged"],

  data() {
    return {
      selectedItemIds: [],
      isAboveCanvas: false,
      fileNodeTemplate: null,
      deleteModal: {
        deleteModalActive: false,
        items: [],
      },
      nodeTemplate: null,
      shouldShowPreview: false,
      itemIconRenderer,
    };
  },

  computed: {
    ...mapGetters("canvas", ["screenToCanvasCoordinates"]),
    ...mapState("canvas", ["getScrollContainerElement"]),
    ...mapState("application", [
      "openProjects",
      "fileExtensionToNodeTemplateId",
    ]),
    ...mapState("spaces", {
      projectPath: (state: SpacesState) => state.projectPath,
      isLoadingContent: (state: SpacesState) => state.isLoadingContent,
      spaceProviders: (state: SpacesState) => state.spaceProviders,
      activeRenamedItemId: (state: SpacesState) => state.activeRenamedItemId,
    }),
    ...mapState("nodeRepository", ["nodesPerCategory"]),
    ...mapGetters("spaces", [
      "getOpenedWorkflowItems",
      "getOpenedFolderItems",
      "pathToItemId",
      "getWorkflowGroupContent",
    ]),
    ...mapGetters("workflow", ["isWritable"]),

    activeSpacePath(): PathTriplet {
      return this.projectPath[this.projectId];
    },

    activeWorkflowGroup(): WorkflowGroupContent {
      return this.getWorkflowGroupContent(this.projectId);
    },

    openedWorkflowItems() {
      return this.getOpenedWorkflowItems(this.projectId);
    },
    openedFolderItems() {
      return this.getOpenedFolderItems(this.projectId);
    },

    fileExplorerItems(): Array<FileExplorerItemWithMeta> {
      return this.activeWorkflowGroup.items.map((item) => {
        const isOpen =
          this.openedWorkflowItems.includes(item.id) ||
          this.openedFolderItems.includes(item.id);

        return {
          ...item,
          isOpen,
          isDirectory: item.type === SpaceItem.TypeEnum.WorkflowGroup,
          isOpenableFile:
            item.type === SpaceItem.TypeEnum.Workflow ||
            item.type === SpaceItem.TypeEnum.Component,
          canBeRenamed: !isOpen,
          canBeDeleted: !this.openedFolderItems.includes(item.id),
          meta: {
            type: item.type,
          },
        };
      });
    },

    breadcrumbItems() {
      const homeBreadcrumbItem = {
        icon: HouseIcon,
        id: "root",
      };

      if (!this.activeWorkflowGroup) {
        return [
          {
            ...homeBreadcrumbItem,
            text: "Home",
            clickable: false,
          },
        ];
      }

      const { path } = this.activeWorkflowGroup;
      const rootBreadcrumb = {
        ...homeBreadcrumbItem,
        text: path.length === 0 ? "Home" : null,
        clickable: path.length > 0,
      };
      const lastPathIndex = path.length - 1;

      return [rootBreadcrumb].concat(
        path.map((pathItem, index) => ({
          icon: null,
          text: pathItem.name,
          id: pathItem.id,
          clickable: index !== lastPathIndex,
        })),
      );
    },

    fullPath() {
      if (!this.activeWorkflowGroup) {
        return "";
      }
      const { path } = this.activeWorkflowGroup;
      return ["home"].concat(path.map(({ name }) => name)).join("/");
    },
  },

  watch: {
    projectId: {
      async handler() {
        await this.fetchWorkflowGroupContent();
      },
      immediate: true,
    },
  },

  methods: {
    ...mapActions("nodeRepository", ["getNodeTemplate"]),
    ...mapActions("application", ["forceCloseProjects"]),

    async fetchWorkflowGroupContent() {
      const { projectId } = this;
      if (projectId === null) {
        return;
      }
      await this.$store.dispatch("spaces/fetchWorkflowGroupContent", {
        projectId,
      });
    },

    onSelectionChange(selectedItemIds: string[]) {
      this.selectedItemIds = selectedItemIds;
      this.$emit("changeSelection", selectedItemIds);
    },

    async onChangeDirectory(pathId) {
      const { projectId } = this;
      const { itemId } = await this.$store.dispatch("spaces/changeDirectory", {
        projectId,
        pathId,
      });

      this.$emit("itemChanged", itemId);
    },

    async onOpenFile({ id }) {
      await this.$store.dispatch("spaces/openWorkflow", {
        projectId: this.projectId,
        workflowItemId: id,
        // send in router, so it can be used to navigate to an already open workflow
        $router: this.$router,
      });
    },

    onRenameFile({ itemId, newName }) {
      this.$store
        .dispatch("spaces/renameItem", {
          projectId: this.projectId,
          itemId,
          newName,
        })
        .catch(() => {
          // TODO replace with a better notification alternative when available
          window.alert(
            `Could not rename the selected item with the new name "${newName}". Check for duplicates.`,
          );
        });
    },

    async onBreadcrumbClick({ id }) {
      await this.onChangeDirectory(id);
    },

    onDeleteItems({ items }) {
      this.deleteModal.items = items;
      this.deleteModal.deleteModalActive = true;
    },

    async deleteItems() {
      this.deleteModal.deleteModalActive = false;

      const itemIds = this.deleteModal.items.map((item) => item.id);
      const relevantProjects = this.openProjects.filter((project) =>
        itemIds.includes(project?.origin?.itemId),
      );
      const projectIds = relevantProjects.map(({ projectId }) => projectId);
      let nextProjectId;
      if (projectIds.length) {
        nextProjectId = await this.forceCloseProjects({ projectIds });
      }

      await this.$store.dispatch("spaces/deleteItems", {
        projectId: this.projectId,
        itemIds,
      });
      if (nextProjectId) {
        await this.$router.push({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId: nextProjectId, workflowId: "root" },
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
      const openedWorkflows = this.openProjects.filter((project) =>
        sourceItems.includes(project?.origin?.itemId),
      );

      const isInsideFolder = this.openProjects.filter((project) => {
        if (!project.origin) {
          return false;
        }

        return project.origin.ancestorItemIds.some((ancestorId) =>
          sourceItems.includes(ancestorId),
        );
      });

      if (openedWorkflows.length || isInsideFolder.length) {
        const openedWorkflowsNames = openedWorkflows.map(
          (workflow) => workflow.name,
        );
        const isInsideFolderNames = isInsideFolder.map(
          (workflow) => workflow.name,
        );
        const extraSpace =
          openedWorkflows.length && isInsideFolder.length ? "\n" : "";

        alert(`Following workflows are opened:\n
          ${
            openedWorkflowsNames.map((name) => `• ${name}`).join("\n") +
            extraSpace +
            isInsideFolderNames.map((name) => `• ${name}`).join("\n")
          }
        \nTo move your selected items, they have to be closed first`);

        onComplete(false);

        return;
      }

      const destWorkflowGroupItemId = this.pathToItemId(
        this.projectId,
        targetItem,
      );
      const collisionStrategy = await API.desktop.getNameCollisionStrategy({
        spaceProviderId: this.activeSpacePath?.spaceProviderId,
        spaceId: this.activeSpacePath?.spaceId,
        itemIds: sourceItems,
        destinationItemId: destWorkflowGroupItemId,
      });

      if (collisionStrategy === "CANCEL") {
        onComplete(false);

        return;
      }

      try {
        await this.$store.dispatch("spaces/moveItems", {
          itemIds: sourceItems,
          projectId: this.projectId,
          destWorkflowGroupItemId,
          collisionStrategy,
        });

        onComplete(true);
      } catch (error) {
        consola.error("There was a problem moving the items", { error });
        onComplete(false);
      }
    },

    async onDrag({
      event,
      item,
    }: {
      event: DragEvent;
      item: FileExplorerItemWithMeta;
    }) {
      const nodeTemplateId = this.getNodeTemplateId(item);
      const isItemAComponent = isComponent(nodeTemplateId, item);

      if (!nodeTemplateId && !isItemAComponent) {
        return;
      }

      // check if item is above canvas
      const screenX = event.clientX - this.$shapes.nodeSize / 2;
      const screenY = event.clientY - this.$shapes.nodeSize / 2;

      const el = document.elementFromPoint(screenX, screenY);
      const kanvas = this.getScrollContainerElement();

      this.nodeTemplate = isItemAComponent
        ? {
            isComponent: true,
            inPorts: [],
            outPorts: [],
            type: item.meta.type,
          }
        : await this.getNodeTemplate(nodeTemplateId);

      this.isAboveCanvas = kanvas.contains(el);
    },

    async onDragEnd({
      event,
      sourceItem,
      onComplete,
    }: {
      event: DragEvent;
      sourceItem: FileExplorerItemWithMeta;
      onComplete: (isSuccessful: boolean) => void;
    }) {
      this.nodeTemplate = null;

      const screenX = event.clientX - this.$shapes.nodeSize / 2;
      const screenY = event.clientY - this.$shapes.nodeSize / 2;

      const el = document.elementFromPoint(screenX, screenY);

      // skip behavior when not on the workflow or workflow is not writable
      if (this.$route.name !== APP_ROUTES.WorkflowPage || !this.isWritable) {
        onComplete(false);
        return;
      }

      const kanvas = this.getScrollContainerElement();

      if (!kanvas.contains(el)) {
        onComplete(false);
        return;
      }

      const nodeTemplateId = this.getNodeTemplateId(sourceItem);
      const isItemAComponent = isComponent(nodeTemplateId, sourceItem);

      if (!nodeTemplateId && !isItemAComponent) {
        onComplete(false);
        return;
      }

      try {
        const [x, y] = this.screenToCanvasCoordinates([screenX, screenY]);
        const position = { x, y };
        const spaceItemReference = {
          providerId: this.activeSpacePath.spaceProviderId,
          spaceId: this.activeSpacePath.spaceId,
          itemId: sourceItem.id,
        };

        await this.$store.dispatch("workflow/addNode", {
          position,
          spaceItemReference,
          nodeFactory: isItemAComponent ? null : { className: nodeTemplateId },
          isComponent: isItemAComponent,
        });

        onComplete(true);
      } catch (error) {
        onComplete(false);
        consola.error({
          message: "Error adding node via file to workflow",
          error,
        });
        throw error;
      }
    },

    getNodeTemplateId(sourceItem: FileExplorerItemWithMeta) {
      const sourceFileExtension = Object.keys(
        this.fileExtensionToNodeTemplateId,
      ).find((extension) => sourceItem.name.endsWith(extension));

      return this.fileExtensionToNodeTemplateId[sourceFileExtension];
    },
  },
});
</script>

<template>
  <div :class="mode" class="space-explorer">
    <div v-if="mode === 'mini'" class="mini-actions">
      <SpaceSelectionDropdown :project-id="projectId" />

      <SpaceExplorerActions
        mode="mini"
        :project-id="projectId"
        :selected-item-ids="selectedItemIds"
      />
    </div>
    <div class="breadcrumb-wrapper">
      <Breadcrumb :items="breadcrumbItems" @click-item="onBreadcrumbClick" />
    </div>

    <SmartLoader
      class="smart-loader"
      :loading="isLoadingContent"
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
        :item-icon-renderer="itemIconRenderer"
        :active-renamed-item-id="activeRenamedItemId"
        dragging-animation-mode="manual"
        @change-directory="onChangeDirectory"
        @change-selection="onSelectionChange"
        @open-file="onOpenFile"
        @rename-file="onRenameFile"
        @delete-items="onDeleteItems"
        @move-items="onMoveItems"
        @drag="onDrag"
        @dragend="onDragEnd"
      >
        <template v-if="nodeTemplate && isAboveCanvas" #customDragPreview>
          <NodePreview
            :type="nodeTemplate.type"
            :in-ports="nodeTemplate.inPorts"
            :out-ports="nodeTemplate.outPorts"
            :icon="nodeTemplate.icon"
          />
        </template>

        <template
          #contextMenu="{
            createRenameOption,
            createDeleteOption,
            anchor,
            onItemClick,
            isMultipleSelectionActive,
            closeContextMenu,
          }"
        >
          <SpaceExplorerContextMenu
            :create-rename-option="createRenameOption"
            :create-delete-option="createDeleteOption"
            :anchor="anchor"
            :on-item-click="onItemClick"
            :is-multiple-selection-active="isMultipleSelectionActive"
            :close-context-menu="closeContextMenu"
            :project-id="projectId"
            :selected-item-ids="selectedItemIds"
          />
        </template>
      </FileExplorer>
    </SmartLoader>
    <div>
      <Modal
        :active="deleteModal.deleteModalActive"
        title="Delete"
        style-type="info"
        @cancel="deleteModal.deleteModalActive = false"
      >
        <template #icon><TrashIcon /></template>
        <template #confirmation>
          <div class="items-to-delete">
            <span>Do you want to delete the following item(s):</span>
            <ul>
              <li v-for="(item, index) of deleteModal.items" :key="index">
                <Component :is="itemIconRenderer(item)" />
                {{ item.name }}
              </li>
            </ul>
          </div>
        </template>
        <template #controls>
          <Button with-border @click="deleteModal.deleteModalActive = false">
            Cancel
          </Button>
          <Button primary @click="deleteItems"> Ok </Button>
        </template>
      </Modal>
    </div>
    <DeploymentsModal />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.mini-actions {
  display: flex;
  justify-content: space-between;
  padding-bottom: 7px;
  margin-top: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid var(--knime-silver-sand);
}

.breadcrumb-wrapper {
  position: relative;
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;

  & .breadcrumb {
    padding-bottom: 0;
    overflow-x: auto;
    white-space: pre;
    -ms-overflow-style: none; /* needed to hide scroll bar in edge */
    scrollbar-width: none; /* for firefox */
    user-select: none;
    margin-right: 8px;

    &::-webkit-scrollbar {
      display: none;
    }

    & :deep(.arrow) {
      margin: 0;
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
  padding: 5px 20px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.smart-loader {
  --smartloader-bg: var(--knime-gray-ultra-light);
  --smartloader-icon-size: 30;
  --smartloader-z-index: 2;
}

.items-to-delete {
  & span {
    font-weight: bold;
  }

  & ul {
    margin: 0;
    padding: 8px 0;
    list-style-type: none;
    max-height: 300px;
    overflow-y: auto;

    & li {
      display: flex;
      align-items: center;
      gap: 4px;

      & svg {
        @mixin svg-icon-size 14;
      }
    }
  }
}
</style>
