<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import InfoIcon from '~/webapps-common/ui/assets/img/icons/circle-info.svg?inline';
import PlusIcon from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';
import SideMenu from '~/components/SideMenu';


export default {
    components: {
        InfoIcon,
        PlusIcon,
        SideMenu
    },
    data() {
        return {
            activeTab: 'nodeRepository'
        };
    },
    computed: {
        ...mapState('panel', ['expanded', 'activeDescriptionPanel']),
        ...mapGetters('panel', ['workflowMetaActive', 'nodeRepositoryActive'])
    },
    methods: {
        ...mapActions('panel', ['setWorkflowMetaActive', 'setNodeRepositoryActive', 'close',
            'closeDescriptionPanel']),
        clickItem(alreadyActive, setActive) {
            if (alreadyActive && this.expanded && this.activeDescriptionPanel) {
                this.close();
                this.closeDescriptionPanel();
            } else if (alreadyActive && this.expanded) {
                this.close();
            } else {
                setActive();
                this.closeDescriptionPanel();
            }
        }
    }
};
</script>

<template>
  <div class="sidebar-wrapper">
    <nav>
      <ul>
        <li
          :class="{ active: workflowMetaActive, expanded }"
          title="Workflow metadata"
          @click="clickItem(workflowMetaActive, setWorkflowMetaActive)"
        >
          <InfoIcon />
        </li>
        <li
          :class="{ active: nodeRepositoryActive, expanded }"
          title="Node repository"
          @click="clickItem(nodeRepositoryActive, setNodeRepositoryActive)"
        >
          <PlusIcon />
        </li>
      </ul>
    </nav>

    <SideMenu id="left-panel" />
  </div>
</template>

<style lang="postcss" scoped>

.sidebar-wrapper {
  display: flex;
  height: calc(
    100vh -
    ((var(--header-height-shape) + var(--toolbar-height-shape)) * 1px)
  ) !important;
}

nav {
  width: var(--side-bar-width);
  background-color: var(--knime-black);

  & ul {
    display: contents;

    & li {
      height: 50px;
      width: 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: var(--knime-silver-sand);
      border-bottom: 1px var(--knime-black) solid;
      transition: background-color 150ms ease-out;

      & svg {
        height: 30px;
      }

      &.active {
        background-color: var(--knime-porcelain);

        &.expanded {
          background-color: var(--knime-gray-ultra-light);
        }
      }

      &:hover {
        background-color: var(--knime-gray-ultra-light);
        cursor: pointer;

        & svg {
          stroke: var(--knime-masala);
        }
      }
    }
  }
}

#left-panel {
  flex: 0 0 auto;
  border-right: 1px solid var(--knime-silver-sand);
}
</style>
