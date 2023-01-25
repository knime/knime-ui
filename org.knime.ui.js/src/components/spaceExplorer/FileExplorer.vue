<script>
import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import MenuOptionsIcon from 'webapps-common/ui/assets/img/icons/menu-options.svg';
import ArrowIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';
import { openWorkflow } from '@/api';

const ITEM_TYPES = {
    WorkflowGroup: 'WorkflowGroup',
    Workflow: 'Workflow',
    Component: 'Component',
    Metanode: 'WorkflowTemplate',
    Data: 'Data'
};

export default {
    components: {
        MenuOptionsIcon,
        WorkflowGroupIcon,
        WorkflowIcon,
        ComponentIcon,
        DataIcon,
        MetaNodeIcon,
        ArrowIcon
    },

    props: {
        mode: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'mini'].includes(value)
        },

        isRootFolder: {
            type: Boolean,
            required: true
        },

        items: {
            type: Array,
            required: true
        }
    },

    emits: ['changeDirectory'],

    data() {
        return {
            ITEM_TYPES
        };
    },

    methods: {
        canEnterDirectory(item) {
            return item.type === ITEM_TYPES.WorkflowGroup;
        },

        canOpenWorkflow(item) {
            return item.type === ITEM_TYPES.Workflow;
        },

        getTypeIcon(item) {
            const typeIcons = {
                [ITEM_TYPES.WorkflowGroup]: WorkflowGroupIcon,
                [ITEM_TYPES.Workflow]: WorkflowIcon,
                [ITEM_TYPES.Component]: ComponentIcon,
                [ITEM_TYPES.Metanode]: MetaNodeIcon,
                [ITEM_TYPES.Data]: DataIcon
            };

            return typeIcons[item.type];
        },

        changeDirectory(pathId) {
            this.$emit('changeDirectory', pathId);
        },

        onDoubleClickOnItem(item) {
            if (this.canEnterDirectory(item)) {
                this.changeDirectory(item.id);
            } else if (this.canOpenWorkflow(item)) {
                openWorkflow(item.id);
            }
        }
    }
};
</script>

<template>
  <table aria-label="Current workflow group in Space Explorer">
    <thead>
      <tr>
        <th scope="col">Type</th>
        <th
          class="name"
          scope="col"
        >
          Name
        </th>
      </tr>
    </thead>
    <tbody :class="mode">
      <tr
        v-if="!isRootFolder"
        class="file-explorer-item"
        title="Go back"
        @dblclick="changeDirectory('..')"
      >
        <td
          class="item-icon"
          colspan="3"
        >
          <ArrowIcon />
        </td>
        <td class="item-name hidden">
          Go back to parent directory
        </td>
      </tr>

      <tr
        v-for="(item, index) in items"
        :key="index"
        class="file-explorer-item"
        :class="item.type"
        @dblclick="onDoubleClickOnItem(item)"
      >
        <td class="item-icon">
          <Component :is="getTypeIcon(item)" />
        </td>
          
        <td
          class="item-content"
          :class="{ light: item.type !== ITEM_TYPES.WorkflowGroup }"
          :title="item.name"
        >
          {{ item.name }}
        </td>

        <td class="item-option">
          <!-- TODO: add later -->
          <!-- <MenuOptionsIcon /> -->
        </td>
      </tr>
        
      <tr
        v-if="items.length === 0"
        class="empty"
      >
        <td>
          Folder is empty
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.hidden {
  display: none;
}

thead {
  /* Hide table head for better readability but keeping it for a11y reasons */
  position: absolute;
  height: 1px;
  width: 1px;
  overflow: hidden;
  white-space: nowrap; /* added line */
}

table,
thead,
tbody {
  display: block;
  width: 100%;
  border-spacing: 0;
}

tbody {
  font-weight: 700;
  font-size: 18px;
}

tbody.mini {
  font-weight: 400;
  font-size: 16px;
}

.file-explorer-item {
  --icon-size: 20;
  --item-padding: 8px;

  user-select: none;
  cursor: pointer;
  background: var(--knime-gray-ultra-light);
  margin-bottom: 3px;
  transition: box-shadow 0.15s;
  display: block;

  &:hover {
    box-shadow: 1px 1px 4px 0 var(--knime-gray-dark-semi);
  }

  & .item-content {
    width: 100%;
    height: 100%;
    padding: var(--item-padding);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 250px;

    &.light {
      background-color: var(--knime-white);
    }
  }

  & .item-icon,
  & .item-option {
    & svg {
      display: flex;

      @mixin svg-icon-size var(--icon-size);

      stroke: var(--knime-masala);
    }
  }

  & .item-icon {
    padding: var(--item-padding);
    width: 60px;
  }

  & .item-option {
    width: 34px;
  }
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px;
  color: var(--knime-silver-sand);
}
</style>
