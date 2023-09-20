<script>
import { mapGetters, mapState } from "vuex";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import Button from "webapps-common/ui/components/Button.vue";
import FolderPlusIcon from "webapps-common/ui/assets/img/icons/folder-plus.svg";
import MenuOptionsIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";

import DropdownButton from "@/components/common/DropdownButton.vue";
import PlusIcon from "@/assets/plus.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import AddFileIcon from "@/assets/add-file.svg";
import {
  buildHubDownloadMenuItem,
  buildHubUploadMenuItems,
  buildOpenInBrowserMenuItem,
  buildOpenAPIDefinitionMenuItem,
} from "@/components/spaces/remoteMenuItems";
import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";

export default {
  components: {
    DropdownButton,
    PlusButton,
    Button,
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
      "getProviderInfo",
      "hasActiveHubSession",
      "selectionContainsFile",
      "selectionContainsWorkflow",
    ]),
    ...mapState("spaces", ["spaceProviders", "isLoadingContent"]),

    isLocal() {
      return this.getSpaceInfo(this.projectId).local;
    },
    isFileSelected() {
      return this.selectionContainsFile(this.projectId, this.selectedItemIds);
    },
    isWorkflowSelected() {
      return this.selectionContainsWorkflow(
        this.projectId,
        this.selectedItemIds,
      );
    },
    createWorkflowAction() {
      return {
        id: "createWorkflow",
        text: "Create workflow",
        icon: PlusIcon,
        disabled: this.isLoadingContent,
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

      const downloadToLocalSpace = buildHubDownloadMenuItem(
        this.$store.dispatch,
        this.projectId,
        this.selectedItemIds,
      );

      const uploadAndConnectToHub = buildHubUploadMenuItems(
        this.$store.dispatch,
        this.hasActiveHubSession,
        this.projectId,
        this.selectedItemIds,
        this.spaceProviders,
      );

      const openInBrowser = buildOpenInBrowserMenuItem(
        this.$store.dispatch,
        this.projectId,
        this.selectedItemIds,
        this.getProviderInfo(projectId),
      );

      const openAPIDefinition = buildOpenAPIDefinitionMenuItem(
        this.$store.dispatch,
        this.projectId,
        this.selectedItemIds,
      );

      const getHubActions = () => {
        if (this.isLocal) {
          return uploadAndConnectToHub;
        }

        if (this.isFileSelected) {
          return [downloadToLocalSpace];
        }

        return [downloadToLocalSpace, openInBrowser];
      };

      const getServerActions = () => {
        if (
          this.getProviderInfo(projectId).type !==
          BaseSpaceProvider.TypeEnum.SERVER
        ) {
          return [];
        }

        if (!this.isWorkflowSelected) {
          return [];
        }

        return [openAPIDefinition];
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
        ...getServerActions(),
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
        <template v-for="action in actions" :key="action.id">
          <DropdownButton
            v-if="action.children"
            :id="action.id"
            class="toolbar-action-button"
            :items="action.children"
            :title="action.title"
            :disabled="action.disabled || isLoadingContent"
            @click-item="
              (item) => (item.execute && !item.disabled ? item.execute() : null)
            "
          >
            <Component :is="action.icon" class="icon" />
            {{ action.text }}
          </DropdownButton>
          <Button
            v-else
            v-bind="$attrs"
            :title="action.title"
            class="toolbar-action-button"
            compact
            with-border
            :disabled="action.disabled || isLoadingContent"
            @click="
              () =>
                action.execute && !action.disabled ? action.execute() : null
            "
          >
            <Component :is="action.icon" class="icon" />
            {{ action.text }}
          </Button>
        </template>

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
          :disabled="isLoadingContent"
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

    --theme-button-function-foreground-color-hover: var(--knime-white);
    --theme-button-function-background-color-hover: var(--knime-masala);

    & .toolbar-action-button {
      margin-left: 5px;

      &:is(button) {
        /* TODO: move this to a common button component */
        border: 1px solid var(--knime-silver-sand);
      }
    }

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
