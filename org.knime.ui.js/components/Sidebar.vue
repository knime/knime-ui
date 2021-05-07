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
    <div
      :class="{ active: expanded && wfMetaActive }"
      @click="setWorkflowMetaActive"
    >
      <InfoIcon />
    </div>
    <div
      :class="{ active: expanded && nodeRepoActive }"
      @click="setNodeRepoActive"
    >
      <PlusIcon />
    </div>
  </nav>
</template>

<style lang="postcss" scoped>

nav {
  width: var(--side-bar-width);
  background-color: var(--knime-black);
  padding-top: 50px;

  & > div {
    height: 50px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background-color: var(--knime-silver-sand);

    &.active {
      background-color: var(--knime-gray-ultra-light);
    }

    & svg {
      height: 30px;
    }
  }
}
</style>
