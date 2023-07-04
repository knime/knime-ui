<script>
import { mapGetters, mapState } from "vuex";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import FolderPlusIcon from "webapps-common/ui/assets/img/icons/folder-plus.svg";
import MenuOptionsIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";

import SpaceExplorerActionButton from "./SpaceExplorerActionButton.vue";
import PlusIcon from "@/assets/plus.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import AddFileIcon from "@/assets/add-file.svg";
import {
  buildHubDownloadMenuItem,
  buildHubUploadMenuItems,
  buildOpenInHubMenuItem,
} from "@/components/spaces/hubMenuItems";
import { SpaceItem } from "@/api/gateway-api/generated-api";

export default {
  components: {
    SpaceExplorerActionButton,
    PlusButton,
    SubMenu,
    MenuOptionsIcon,
  },

  props: {
    mode: {
      type: String,
      default: "normal",
      validator: (value) => ["normal", "mini"].includes(value),
    },
    selectedItemIds: {
      type: Array,
      required: true,
    },
    projectId: {
      type: [String, null],
      required: true,
    },
  },

  computed: {
    ...mapGetters("spaces", [
      "getSpaceInfo",
      "hasActiveHubSession",
      "getWorkflowGroupContent",
    ]),
    ...mapState("spaces", ["spaceProviders"]),

    isLocal() {
      return this.getSpaceInfo(this.projectId).local;
    },
    createWorkflowAction() {
      return {
        id: "createWorkflow",
        text: "Create workflow",
        icon: PlusIcon,
        hidden: this.mode !== "mini",
        execute: () => {
          this.$store.commit("spaces/setCreateWorkflowModalConfig", {
            isOpen: true,
            projectId: this.projectId,
          });
        },
      };
    },
    activeWorkflowGroup() {
      return this.getWorkflowGroupContent(this.projectId);
    },
    selectionContainsFile() {
      return this.activeWorkflowGroup
        ? this.activeWorkflowGroup.items
            .filter((item) => this.selectedItemIds.includes(item.id))
            .some(
              (selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Data
            )
        : false;
    },
    actions() {
      const { projectId } = this;

      const downloadToLocalSpace = buildHubDownloadMenuItem(
        this.$store.dispatch,
        this.projectId,
        this.selectedItemIds
      );

      const uploadAndConnectToHub = buildHubUploadMenuItems(
        this.$store.dispatch,
        this.hasActiveHubSession,
        this.projectId,
        this.selectedItemIds,
        this.spaceProviders
      );

      const openInHub = buildOpenInHubMenuItem(
        this.$store.dispatch,
        this.projectId,
        this.selectedItemIds
      );

      const getHubActions = () => {
        if (this.isLocal) {
          return uploadAndConnectToHub;
        }

        if (this.selectionContainsFile) {
          return [downloadToLocalSpace];
        }

        return [downloadToLocalSpace, openInHub];
      };

      return [
        ...(this.mode === "mini" ? [this.createWorkflowAction] : []),
        {
          id: "createFolder",
          text: "Create folder",
          icon: FolderPlusIcon,
          separator: true,
          execute: () => {
            this.$store.dispatch("spaces/createFolder", {
              projectId,
            });
          },
        },
        {
          id: "importWorkflow",
          text: "Import workflow",
          icon: ImportWorkflowIcon,
          execute: () => {
            this.$store.dispatch("spaces/importToWorkflowGroup", {
              projectId,
              importType: "WORKFLOW",
            });
          },
        },
        {
          id: "importFiles",
          text: "Add files",
          icon: AddFileIcon,
          separator: true,
          execute: () => {
            this.$store.dispatch("spaces/importToWorkflowGroup", {
              projectId,
              importType: "FILES",
            });
          },
        },
        ...getHubActions(),
      ];
    },

    createWorkflowButtonTitle() {
      const { text, hotkeyText } = this.$shortcuts.get("createWorkflow");
      return `${text} (${hotkeyText})`;
    },
  },
};
</script>

<template>
  <div class="toolbar-buttons">
    <template v-if="mode === 'normal'">
      <div class="toolbar-actions-normal">
        <SpaceExplorerActionButton
          v-for="action in actions"
          :id="action.id"
          :key="action.id"
          :item="action"
          @click="(item) => (item.execute ? item.execute() : null)"
        />

        <div class="create-workflow-btn">
          <PlusButton
            :title="createWorkflowButtonTitle"
            primary
            :disabled="createWorkflowAction.disabled"
            @click="createWorkflowAction.execute()"
          />
        </div>
      </div>
    </template>

    <template v-if="mode === 'mini'">
      <div class="toolbar-actions-mini">
        <SubMenu
          :items="actions"
          class="more-actions"
          button-title="More actions"
          @toggle.stop
          @item-click="(_, { execute }) => execute()"
        >
          <MenuOptionsIcon class="open-icon" />
        </SubMenu>
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar-buttons {
  & .toolbar-actions-normal {
    display: flex;
    position: relative;

    & .create-workflow-btn {
      position: absolute;
      z-index: 2;
      top: 105px;
      right: 0;
    }

    @media screen and (min-width: 900px) {
      & .create-workflow-btn {
        right: -20px;
      }
    }

    @media screen and (min-width: 1180px) {
      & .create-workflow-btn {
        right: -70px;
      }
    }
  }

  & .toolbar-actions-mini {
    display: flex;
    position: relative;

    & .more-actions {
      margin-right: 5px;
    }

    & :deep(.submenu-toggle) {
      border: 1px solid var(--knime-silver-sand);
    }

    /* Aligning text in the submenu */
    & :deep(button) {
      align-items: center;
    }
  }
}
</style>
