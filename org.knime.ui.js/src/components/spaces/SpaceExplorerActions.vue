<script>
import { mapGetters, mapState } from "vuex";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import FolderPlusIcon from "webapps-common/ui/assets/img/icons/folder-plus.svg";
import CloudDownloadIcon from "webapps-common/ui/assets/img/icons/cloud-download.svg";
import CloudUploadIcon from "webapps-common/ui/assets/img/icons/cloud-upload.svg";
import CloudLoginIcon from "webapps-common/ui/assets/img/icons/cloud-login.svg";
import MenuOptionsIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";

import ItemButton from "@/components/common/ItemButton.vue";
import PlusIcon from "@/assets/plus.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import AddFileIcon from "@/assets/add-file.svg";

export default {
  components: {
    ItemButton,
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
    selectedItems: {
      type: Array,
      required: true,
    },
    projectId: {
      type: String,
      required: true,
    },
  },

  computed: {
    ...mapGetters("spaces", ["getSpaceInfo", "hasActiveHubSession"]),
    ...mapState("spaces", ["spaceProviders"]),

    isLocal() {
      return this.getSpaceInfo(this.projectId).local;
    },
    disconnectedSpaceProviders() {
      return Object.values(this.spaceProviders).filter(
        (provider) => !provider.connected
      );
    },
    disabledActions() {
      return {
        uploadToHub:
          !this.hasActiveHubSession || this.selectedItems.length === 0,
        downloadToLocalSpace: this.isLocal || this.selectedItems.length === 0,
      };
    },
    createWorkflowAction() {
      return {
        id: "createWorkflow",
        text: "Create workflow",
        icon: PlusIcon,
        disabled: this.disabledActions.createWorkflow,
        hidden: this.mode !== "mini",
        execute: () => {
          this.$store.commit("spaces/setCreateWorkflowModalConfig", {
            isOpen: true,
            projectId: this.projectId,
          });
        },
      };
    },
    actions() {
      const { projectId } = this;

      const uploadToHub = {
        id: "uploadToHub",
        text: "Upload to Hub",
        icon: CloudUploadIcon,
        disabled: this.disabledActions.uploadToHub,
        title: this.hasActiveHubSession
          ? // eslint-disable-next-line no-extra-parens
            this.disabledActions.uploadToHub &&
            "Select at least one file to upload."
          : "Login is required to upload to hub.",
        execute: () => {
          this.$store.dispatch("spaces/copyBetweenSpaces", {
            projectId,
            itemIds: this.selectedItems,
          });
        },
      };

      const createConnectToHubItem = (provider) => {
        return {
          id: `connectToHub-${provider.id}`,
          text: provider.name,
          execute: () => {
            this.$store.dispatch("spaces/connectProvider", {
              spaceProviderId: provider.id,
            });
          },
        };
      };

      const connectToHub = {
        id: "connectToHub",
        text: "Connect to Hub",
        icon: CloudLoginIcon,
        hidden: this.disconnectedSpaceProviders.length === 0,
        execute: null,
        children: this.disconnectedSpaceProviders.map(createConnectToHubItem),
      };

      const uploadAndConnectToHub = [uploadToHub, connectToHub];

      const downloadToLocalSpace = {
        id: "downloadToLocalSpace",
        text: "Download to local space",
        icon: CloudDownloadIcon,
        disabled: this.disabledActions.downloadToLocalSpace,
        title: this.disabledActions.downloadToLocalSpace
          ? "Select at least one file to download."
          : null,
        execute: () => {
          $store.dispatch("spaces/copyBetweenSpaces", {
            projectId,
            itemIds: this.selectedItems,
          });
        },
      };
      return [
        this.createWorkflowAction,
        {
          id: "createFolder",
          text: "Create folder",
          icon: FolderPlusIcon,
          disabled: this.disabledActions.createFolder,
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
          disabled: this.disabledActions.importWorkflow,
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
          disabled: this.disabledActions.importFiles,
          separator: true,
          execute: () => {
            this.$store.dispatch("spaces/importToWorkflowGroup", {
              projectId,
              importType: "FILES",
            });
          },
        },
        ...(this.isLocal ? uploadAndConnectToHub : [downloadToLocalSpace]),
      ].filter(({ hidden }) => !hidden);
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
        <ItemButton
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
          :teleport-to-body="true"
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
