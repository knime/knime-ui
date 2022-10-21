<script>
import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import UnknownIcon from 'webapps-common/ui/assets/img/icons/file-question.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import MenuOptionsIcon from 'webapps-common/ui/assets/img/icons/menu-options.svg';
import ArrowIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';

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
        path: {
            type: Array,
            required: true
        },

        tree: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            currentLevel: null,
            draggedItem: null
        };
    },

    computed: {
        isRoot() {
            return this.path.length === 1 && this.path[0] === 'root';
        }
    },

    methods: {
        canEnterDirectory(child) {
            return child.type === 'workflow-group';
        },

        getTypeIcon(child) {
            const typeIcons = {
                'workflow-group': WorkflowGroupIcon,
                workflow: WorkflowIcon,
                component: ComponentIcon,
                'workflow-template': MetaNodeIcon,
                data: DataIcon,
                other: UnknownIcon
            };

            return typeIcons[child.type];
        },
        
        changeDirectory(pathId) {
            const isBack = pathId === '..';
            
            const nextPath = isBack ? this.path.slice(0, -1) : [...this.path, pathId];
            this.$emit('change-directory', nextPath);
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
    <tbody>
      <tr
        v-if="!isRoot"
        class="file-tree-item"
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
        v-for="(child, i) in tree.children"
        :key="i"
        :ref="`item-${child.id}`"
        class="file-tree-item"
        :draggable="child.type === 'workflow'"
        @dblclick="canEnterDirectory(child) && changeDirectory(child.id)"
      >
        <td class="item-icon">
          <Component :is="getTypeIcon(child)" />
        </td>
          
        <td
          class="item-content"
          :class="{ light: child.type === 'workflow' }"
        >
          {{ child.name }}
        </td>

        <td class="item-option">
          <MenuOptionsIcon />
        </td>
      </tr>
        
      <tr
        v-if="Object.keys(tree.children).length === 0"
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
/* TODO: maybe reuse later in other parts of the app */
@define-mixin svg-icon $size {
  width: calc($size * 1px);
  height: calc($size * 1px);
  stroke-width: calc(32px / $size);
  @mixin-content;
}

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

.file-tree-item {
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

    &.light {
      background-color: var(--knime-white);
    }
  }

  & .item-icon,
  & .item-option {
    & svg {
      display: flex;
      @mixin svg-icon var(--icon-size);
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
