<script lang="ts">
import { mapGetters, mapState } from "vuex";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import FolderPlusIcon from "webapps-common/ui/assets/img/icons/folder-plus.svg";
import MenuOptionsIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";

import SearchButton from "@/components/common/SearchButton.vue";

import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import PlusIcon from "@/assets/plus.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import AddFileIcon from "@/assets/add-file.svg";
import {
  buildHubDownloadMenuItem,
  buildHubUploadMenuItems,
  buildMoveToSpaceMenuItem,
  buildOpenAPIDefinitionMenuItem,
} from "@/components/spaces/remoteMenuItems";
import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import { defineComponent, type PropType } from "vue";
import type { ActionMenuItem } from "@/components/spaces/remoteMenuItems";
import { isLocalProvider } from "@/store/spaces/util";

type DisplayModes = "normal" | "mini";

export default defineComponent({
  components: {
    OptionalSubMenuActionButton,
    PlusButton,
    SearchButton,
    SubMenu,
    MenuOptionsIcon,
    ReloadIcon,
    FunctionButton,
  },

  props: {
    mode: {
      type: String as PropType<DisplayModes>,
      default: "normal",
    },
    selectedItemIds: {
      type: Array as PropType<string[]>,
      required: true,
    },
    projectId: {
      type: String as PropType<string>,
      required: true,
    },
    filterQuery: {
      type: String,
      default: "",
    },
  },

  emits: ["importedItemIds", "update:filterQuery"],

  computed: {
    ...mapGetters("spaces", [
      "getSpaceInfo",
      "getProviderInfoFromProjectPath",
      "hasActiveHubSession",
      "selectionContainsFile",
      "selectionContainsWorkflow",
    ]),
    ...mapState("spaces", ["spaceProviders", "isLoadingContent"]),

    isLocal() {
      return isLocalProvider(
        this.getProviderInfoFromProjectPath(this.projectId),
      );
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
    actions(): ActionMenuItem[] {
      const { projectId } = this;

      const getLocalActions = () => {
        const uploadAndConnectToHub = buildHubUploadMenuItems(
          this.$store.dispatch,
          this.hasActiveHubSession,
          this.projectId,
          this.selectedItemIds,
          this.spaceProviders,
        );

        if (this.isLocal) {
          return uploadAndConnectToHub;
        }

        return [];
      };

      const getHubActions = () => {
        if (this.isLocal) {
          return [];
        }

        const downloadToLocalSpace = buildHubDownloadMenuItem(
          this.$store.dispatch,
          this.projectId,
          this.selectedItemIds,
        );

        const moveToSpace = buildMoveToSpaceMenuItem(
          this.$store.dispatch,
          this.projectId,
          this.selectedItemIds,
        );

        return [downloadToLocalSpace, moveToSpace];
      };

      const getServerActions = () => {
        if (
          this.getProviderInfoFromProjectPath(projectId).type !==
          BaseSpaceProvider.TypeEnum.SERVER
        ) {
          return [];
        }

        if (!this.isWorkflowSelected) {
          return [];
        }

        const openAPIDefinition = buildOpenAPIDefinitionMenuItem(
          this.$store.dispatch,
          this.projectId,
          this.selectedItemIds,
        );

        return [openAPIDefinition];
      };

      return [
        this.createWorkflowAction,
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
          execute: async () => {
            const items: string[] | null = await this.$store.dispatch(
              "spaces/importToWorkflowGroup",
              {
                projectId,
                importType: "WORKFLOW",
              },
            );
            if (items && items.length > 0) {
              this.$emit("importedItemIds", items);
            }
          },
        },
        {
          id: "importFiles",
          text: "Add files",
          icon: AddFileIcon,
          separator: true,
          execute: async () => {
            const items: string[] | null = await this.$store.dispatch(
              "spaces/importToWorkflowGroup",
              {
                projectId,
                importType: "FILES",
              },
            );
            if (items && items.length > 0) {
              this.$emit("importedItemIds", items);
            }
          },
        },
        ...getLocalActions(),
        ...getHubActions(),
        ...getServerActions(),
        {
          id: "reload",
          text: "Reload",
          icon: ReloadIcon,
          execute: () => this.reload(),
        },
      ];
    },

    createWorkflowButtonTitle() {
      const { text, hotkeyText } = this.$shortcuts.get("createWorkflow");
      return `${text} (${hotkeyText})`;
    },
  },
  methods: {
    filteredActions(hideItems: string[]) {
      return this.actions.filter((item) => !hideItems.includes(item.id));
    },
    reload() {
      const { projectId } = this;
      if (projectId === null) {
        return;
      }
      this.$store.dispatch("spaces/fetchWorkflowGroupContent", {
        projectId,
      });
    },
  },
});
</script>

<template>
  <div class="toolbar-buttons">
    <template v-if="mode === 'normal'">
      <div class="toolbar-actions-normal">
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          @update:model-value="$emit('update:filterQuery', $event)"
        />
        <OptionalSubMenuActionButton
          v-for="action in filteredActions(['createWorkflow', 'connectToHub'])"
          :id="action.id"
          :key="action.id"
          :disabled="isLoadingContent"
          :item="action"
          @click="(item) => (item as ActionMenuItem).execute?.()"
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
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          @update:model-value="$emit('update:filterQuery', $event)"
        />
        <FunctionButton class="reload-button" @click="reload">
          <ReloadIcon />
        </FunctionButton>
        <SubMenu
          :items="filteredActions(['reload'])"
          :disabled="isLoadingContent"
          :teleport-to-body="false"
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

    & .create-workflow-btn {
      position: fixed;
      z-index: 2;
      top: 265px;
      right: 32px;
    }
  }

  & .toolbar-actions-mini {
    display: flex;

    /* the position root (relative) is the .sidebar-header */

    & :deep(.search-button-input) {
      --theme-input-field-background-color-focus: var(--knime-stone-light);

      position: absolute;
      left: 0;
      right: 100px;
      z-index: 1;
    }

    /* Aligning text in the submenu */
    & :deep(button) {
      align-items: center;
    }
  }

  & .reload-button,
  & :deep(.search-button) {
    margin-right: 5px;
  }
}
</style>
