<script>
import PlusButton from 'webapps-common/ui/components/PlusButton.vue';

import Button from 'webapps-common/ui/components/Button.vue';
import SubMenu from 'webapps-common/ui/components/SubMenu.vue';
import FolderPlusIcon from 'webapps-common/ui/assets/img/icons/folder-plus.svg';
import CloudDownloadIcon from 'webapps-common/ui/assets/img/icons/cloud-download.svg';
import CloudUploadIcon from 'webapps-common/ui/assets/img/icons/cloud-upload.svg';
import MenuOptionsIcon from 'webapps-common/ui/assets/img/icons/menu-options.svg';
import Modal from 'webapps-common/ui/components/Modal.vue';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';

import PlusIcon from '@/assets/plus.svg';
import ImportWorkflowIcon from '@/assets/import-workflow.svg';
import AddFileIcon from '@/assets/add-file.svg';

import ToolbarButton from '@/components/common/ToolbarButton.vue';

export default {
    components: {
        PlusButton,
        Button,
        SubMenu,
        PlusIcon,
        ToolbarButton,
        FolderPlusIcon,
        CloudDownloadIcon,
        CloudUploadIcon,
        ImportWorkflowIcon,
        AddFileIcon,
        MenuOptionsIcon,
        Modal,
        InputField
    },

    props: {
        mode: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'mini'].includes(value)
        },
        /**
         * @typedef DisabledActions
         * @property {Boolean} [createWorkflow]
         * @property {Boolean} [createFolder]
         * @property {Boolean} [importWorkflow]
         * @property {Boolean} [importFiles]
         * @property {Boolean} [uploadToHub]
         * @property {Boolean} [downloadToLocalSpace]
        */
        /**
         * Object containing whether each action is allowed.
         *
         * @type {import('vue').PropOptions<DisabledActions>}
         */
        disabledActions: {
            type: Object,
            default: () => ({})
        },

        hasActiveHubSession: {
            type: Boolean,
            default: false
        },

        isLocal: {
            type: Boolean,
            default: false
        }
    },

    computed: {
        actions() {
            return [
                {
                    id: 'create-workflow',
                    text: 'Create workflow',
                    icon: PlusIcon,
                    disabled: this.disabledActions.createWorkflow,
                    hidden: this.mode !== 'mini'
                },
                {
                    id: 'create-folder',
                    text: 'Create folder',
                    icon: FolderPlusIcon,
                    disabled: this.disabledActions.createFolder,
                    separator: true
                },
                {
                    id: 'import-workflow',
                    text: 'Import workflow',
                    icon: ImportWorkflowIcon,
                    disabled: this.disabledActions.importWorkflow
                },
                {
                    id: 'import-files',
                    text: 'Add files',
                    icon: AddFileIcon,
                    disabled: this.disabledActions.importFiles,
                    separator: true
                },
                this.isLocal
                    ? {
                        id: 'upload-to-hub',
                        text: 'Upload to Hub',
                        icon: CloudUploadIcon,
                        disabled: this.disabledActions.uploadToHub,
                        title: this.hasActiveHubSession
                            // eslint-disable-next-line no-extra-parens
                            ? (this.disabledActions.uploadToHub && 'Select at least one file to upload.')
                            : 'Login is required to upload to hub.'
                    }
                    : {
                        id: 'download-to-local-space',
                        text: 'Download to local space',
                        icon: CloudDownloadIcon,
                        disabled: this.disabledActions.downloadToLocalSpace,
                        title: this.disabledActions.downloadToLocalSpace
                            ? 'Select at least one file to download.'
                            : null
                    }
            ].filter(({ hidden }) => !hidden);
        },

        createWorkflowButtonTitle() {
            const { text, hotkeyText } = this.$shortcuts.get('createWorkflow');
            return `${text} (${hotkeyText})`;
        }
    }
};
</script>

<template>
  <div class="toolbar-buttons">
    <template v-if="mode === 'normal'">
      <div class="toolbar-actions-normal">
        <Button
          v-for="action in actions"
          :id="action.id"
          :key="action.id"
          :title="action.title"
          with-border
          compact
          :aria-disabled="action.disabled"
          @click="action.disabled ? null : $emit(`action:${action.id}`)"
        >
          <Component :is="action.icon" />
          {{ action.text }}
        </Button>

        <PlusButton
          :title="createWorkflowButtonTitle"
          primary
          class="create-workflow-btn"
          :disabled="disabledActions.createWorkflow"
          @click="$emit('action:create-workflow')"
        />
      </div>
    </template>

    <template v-if="mode === 'mini'">
      <div class="toolbar-actions-mini">
        <SubMenu
          :items="actions"
          class="more-actions"
          button-title="More actions"
          @item-click="(_, { id }) => $emit(`action:${id}`)"
        >
          <MenuOptionsIcon class="open-icon" />
        </SubMenu>
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

.toolbar-buttons {
  & .toolbar-actions-normal {
    position: relative;

    & .button {
      margin-left: 5px;
      border-color: var(--knime-silver-sand);
      color: var(--knime-masala);

      & svg {
        @mixin svg-icon-size 18;

        stroke: var(--knime-masala);
        margin-right: 4px;
      }

      &:hover,
      &:active,
      &:focus {
        cursor: pointer;
        color: var(--knime-white);
        background-color: var(--knime-masala);
        border-color: var(--knime-masala);

        & svg {
          stroke: var(--knime-white);
        }
      }

      &[aria-disabled] {
        cursor: default;
        opacity: 0.6;

        &:hover,
        &:active,
        &:focus {
          border-color: var(--knime-silver-sand);
          color: var(--knime-masala);
          background-color: transparent;
          cursor: default;
        }

        & svg {
          stroke: var(--knime-masala);
        }
      }
    }

    & .create-workflow-btn {
      position: absolute;
      z-index: 2;
      top: 110px;
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

    & >>> .submenu-toggle {
      border: 1px solid var(--knime-silver-sand);
    }

    /* Aligning text in the submenu */
    & >>> button {
      align-items: center;
    }
  }
}
</style>
