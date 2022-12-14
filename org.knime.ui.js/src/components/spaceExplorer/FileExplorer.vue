<script>
import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import UnknownIcon from 'webapps-common/ui/assets/img/icons/file-question.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import MenuOptionsIcon from 'webapps-common/ui/assets/img/icons/menu-options.svg';
import ArrowIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';


const ITEM_TYPES = {
    WorkflowGroup: 'WorkflowGroup',
    Workflow: 'Workflow',
    Component: 'Component',
    Metanode: 'WorkflowTemplate',
    Data: 'Data',
    Other: 'Other'
};

export default {
    components: {
        MenuOptionsIcon,
        WorkflowGroupIcon,
        WorkflowIcon,
        ComponentIcon,
        DataIcon,
        MetaNodeIcon,
        UnknownIcon,
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

    data() {
        return {
            ITEM_TYPES
        };
    },

    methods: {
        canEnterDirectory(item) {
            return item.type === ITEM_TYPES.WorkflowGroup;
        },

        getTypeIcon(item) {
            const typeIcons = {
                [ITEM_TYPES.WorkflowGroup]: WorkflowGroupIcon,
                [ITEM_TYPES.Workflow]: WorkflowIcon,
                [ITEM_TYPES.Component]: ComponentIcon,
                [ITEM_TYPES.Metanode]: MetaNodeIcon,
                [ITEM_TYPES.Data]: DataIcon,
                [ITEM_TYPES.Other]: UnknownIcon
            };

            return typeIcons[item.type];
        },

        getItemText(item) {
            const LENGTH_THRESHOLD = 50;
            const TRUNCATE_SIZE = 35;

            return this.mode === 'mini' && item.name.length > LENGTH_THRESHOLD
                ? `${item.name.slice(0, TRUNCATE_SIZE)}…`
                : item.name;
        },
        
        changeDirectory(pathId) {
            this.$emit('change-directory', pathId);
        }
    }
};
</script>

<template>
  <table>
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
        @dblclick="canEnterDirectory(item) && changeDirectory(item.id)"
      >
        <td class="item-icon">
          <Component :is="getTypeIcon(item)" />
        </td>
          
        <td
          class="item-content"
          :class="{ light: item.type !== ITEM_TYPES.WorkflowGroup }"
        >
          {{ getItemText(item) }}
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
@import "@/assets/mixins.css";

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
  --selection-color: hsl(206deg 88% 45%/19%);

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
