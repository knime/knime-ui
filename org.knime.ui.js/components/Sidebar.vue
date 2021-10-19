<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import InfoIcon from '~/webapps-common/ui/assets/img/icons/circle-info.svg?inline';
import PlusIcon from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';

export default {
    components: {
        InfoIcon,
        PlusIcon
    },
    data() {
        return {
            activeTab: 'nodeRepository'
        };
    },
    computed: {
        ...mapState('panel', ['expanded']),
        ...mapGetters('panel', ['workflowMetaActive', 'nodeRepositoryActive'])
    },
    methods: {
        ...mapActions('panel', ['setWorkflowMetaActive', 'setNodeRepositoryActive'])
    }
};
</script>

<template>
  <nav>
    <ul>
      <li
        :class="{ active: workflowMetaActive, expanded }"
        title="Workflow metadata"
        @click="setWorkflowMetaActive"
      >
        <InfoIcon />
      </li>
      <li
        :class="{ active: nodeRepositoryActive, expanded }"
        title="Node repository"
        @click="setNodeRepositoryActive"
      >
        <PlusIcon />
      </li>
    </ul>
  </nav>
</template>

<style lang="postcss" scoped>

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

      &:not(.active):hover {
        background-color: var(--knime-gray-ultra-light);
        cursor: pointer;

        & svg {
          stroke: var(--knime-masala);
        }
      }
    }
  }
}
</style>
