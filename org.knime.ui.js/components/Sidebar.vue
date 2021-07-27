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
            activeTab: 'nodeRepo'
        };
    },
    computed: {
        ...mapState('panel', ['expanded']),
        ...mapGetters('panel', ['wfMetaActive', 'nodeRepoActive'])
    },
    methods: {
        ...mapActions('panel', ['setWorkflowMetaActive', 'setNodeRepoActive'])
    }
};
</script>

<template>
  <nav>
    <ul>
      <li
        :class="{ active: wfMetaActive }"
        @click="setWorkflowMetaActive"
      >
        <InfoIcon />
      </li>
      <li
        :class="{ active: nodeRepoActive }"
        @click="setNodeRepoActive"
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
      }

      &:not(.active):hover {
        background-color: var(--knime-white);
        cursor: pointer;

        & svg {
          stroke: var(--knime-masala);
        }
      }
    }
  }
}
</style>
