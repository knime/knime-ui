<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import { API } from "@api";

import TrashIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import HouseIcon from "webapps-common/ui/assets/img/icons/house.svg";
import SpaceSelectionDropdown from "./SpaceSelectionDropdown.vue";
import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import Modal from "webapps-common/ui/components/Modal.vue";
import Button from "webapps-common/ui/components/Button.vue";
import MenuItems from "webapps-common/ui/components/MenuItems.vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import type { PathTriplet } from "@/store/spaces";
import {
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import SmartLoader from "@/components/common/SmartLoader.vue";

import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import FileExplorer from "./FileExplorer/FileExplorer.vue";
import type {
  FileExplorerItem,
  FileExplorerContextMenu,
} from "./FileExplorer/types";
import type { SpaceProvider } from "@/api/custom-types";

const isComponent = (nodeTemplateId: string | null, item: FileExplorerItem) => {
  return !nodeTemplateId && item.type === SpaceItem.TypeEnum.Component;
};

export default defineComponent({
  components: {
    SpaceExplorerActions,
    FileExplorer,
    MenuItems,
    NodePreview,
    SpaceSelectionDropdown,
    Breadcrumb,
    SmartLoader,
    Modal,
    Button,
    TrashIcon,
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
      selectedItems: [],
      isAboveCanvas: false,
      fileNodeTemplate: null,
      deleteModal: {
        deleteModalActive: false,
        items: [],
      },
      nodeTemplate: null,
      shouldShowPreview: false,
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
      projectPath: (state) => state.projectPath as Record<string, PathTriplet>,
      isLoading: (state) => state.isLoading as boolean,
      spaceProviders: (state) =>
        state.spaceProviders as Record<string, SpaceProvider>,
    }),
    ...mapState("nodeRepository", ["nodesPerCategory"]),
    ...mapGetters("spaces", [
      "getOpenedWorkflowItems",
      "getOpenedFolderItems",
      "pathToItemId",
      "hasActiveHubSession",
      "getWorkflowGroupContent",
    ]),

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

    fileExplorerItems(): Array<FileExplorerItem> {
      return this.activeWorkflowGroup.items.map((item) => {
        const isOpen =
          this.openedWorkflowItems.includes(item.id) ||
          this.openedFolderItems.includes(item.id);

        return {
          ...item,
          isOpen,
          canBeRenamed: !isOpen,
          canBeDeleted: !this.openedFolderItems.includes(item.id),
        };
      });
    },

    isLocal() {
      return this.activeSpacePath?.spaceId === "local";
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
        }))
      );
    },

    fullPath() {
      if (!this.activeWorkflowGroup) {
        return "";
      }
      const { path } = this.activeWorkflowGroup;
      return ["home"].concat(path.map(({ name }) => name)).join("/");
    },

    explorerDisabledActions() {
      return {
        uploadToHub:
          !this.hasActiveHubSession || this.selectedItems.length === 0,
        downloadToLocalSpace: this.isLocal || this.selectedItems.length === 0,
      };
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

    onSelectionChange(selectedItems) {
      this.selectedItems = selectedItems;
      this.$emit("changeSelection", selectedItems);
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
            `Could not rename the selected item with the new name "${newName}". Check for duplicates.`
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
      const relevantProjects = this.openProjects.filter(({ origin }) =>
        itemIds.includes(origin.itemId)
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
      const openedWorkflows = this.openProjects.filter((workflow) =>
        sourceItems.includes(workflow.origin.itemId)
      );
      const isInsideFolder = this.openProjects.filter((project) =>
        project.origin.ancestorItemIds.some((ancestorId) =>
          sourceItems.includes(ancestorId)
        )
      );

      if (openedWorkflows.length || isInsideFolder.length) {
        const openedWorkflowsNames = openedWorkflows.map(
          (workflow) => workflow.name
        );
        const isInsideFolderNames = isInsideFolder.map(
          (workflow) => workflow.name
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
        targetItem
      );
      const collisionStrategy = API.desktop.getNameCollisionStrategy({
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
      item: FileExplorerItem;
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

      if (!this.nodeTemplate) {
        this.nodeTemplate = isItemAComponent
          ? { isComponent: true, inPorts: [], outPorts: [], type: item.type }
          : await this.getNodeTemplate(nodeTemplateId);
      }

      this.isAboveCanvas = kanvas.contains(el);
    },

    async onDragEnd({
      event,
      sourceItem,
      onComplete,
    }: {
      event: DragEvent;
      sourceItem: FileExplorerItem;
      onComplete: (isSuccessful: boolean) => void;
    }) {
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

    getNodeTemplateId(sourceItem: FileExplorerItem) {
      const sourceFileExtension = Object.keys(
        this.fileExtensionToNodeTemplateId
      ).find((extension) => sourceItem.name.endsWith(extension));

      return this.fileExtensionToNodeTemplateId[sourceFileExtension];
    },

    getFileExplorerContextMenuItems(
      createRenameOption: FileExplorerContextMenu.CreateDefaultMenuOption,
      createDeleteOption: FileExplorerContextMenu.CreateDefaultMenuOption,
      anchorItem: FileExplorerItem,
      isMultipleSelectionActive: boolean
    ): MenuItem[] {
      const openFileType =
        anchorItem.type === SpaceItem.TypeEnum.Workflow
          ? "workflows"
          : "folders";

      const renameOptionTitle = anchorItem.isOpen
        ? `Open ${openFileType} cannot be renamed`
        : "";

      return [
        !isMultipleSelectionActive &&
          createRenameOption(anchorItem, { title: renameOptionTitle }),

        createDeleteOption(anchorItem, {
          title: anchorItem.canBeDeleted
            ? ""
            : "Open folders cannot be deleted",
        }),
      ].filter(Boolean);
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
        :is-local="isLocal"
        :disabled-actions="explorerDisabledActions"
        :has-active-hub-session="hasActiveHubSession"
        @action:create-workflow="
          $store.commit('spaces/setCreateWorkflowModalConfig', {
            isOpen: true,
            projectId,
          })
        "
        @action:create-folder="
          $store.dispatch('spaces/createFolder', { projectId: projectId })
        "
        @action:import-workflow="
          $store.dispatch('spaces/importToWorkflowGroup', {
            projectId: projectId,
            importType: 'WORKFLOW',
          })
        "
        @action:import-files="
          $store.dispatch('spaces/importToWorkflowGroup', {
            projectId: projectId,
            importType: 'FILES',
          })
        "
        @action:upload-to-hub="
          $store.dispatch('spaces/copyBetweenSpaces', {
            projectId: projectId,
            itemIds: selectedItems,
          })
        "
        @action:download-to-local-space="
          $store.dispatch('spaces/copyBetweenSpaces', {
            projectId: projectId,
            itemIds: selectedItems,
          })
        "
      />
    </div>
    <div class="breadcrumb-wrapper">
      <Breadcrumb :items="breadcrumbItems" @click-item="onBreadcrumbClick" />
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
            anchorItem,
            onItemClick,
            isMultipleSelectionActive,
          }"
        >
          <MenuItems
            menu-aria-label="Space explorer context menu"
            class="menu-items"
            :items="
              getFileExplorerContextMenuItems(
                createRenameOption,
                createDeleteOption,
                anchorItem.item,
                isMultipleSelectionActive
              )
            "
            @item-click="(_, item) => onItemClick(item)"
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
          <div>
            <span>Do you want to delete the following item(s):</span>
            <ul>
              <li v-for="(item, index) of deleteModal.items" :key="index">
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
}
</style>
