<script>
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~/webapps-common/ui/assets/img/icons/lens.svg?inline';

import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

import { mapState } from 'vuex';

export default {
    components: {
        FunctionButton,
        CloseIcon,
        LensIcon
    },
    computed: {
        ...mapState('nodeRepository', ['query'])
    },
    methods: {
        searchNodes() {
            this.$store.dispatch('nodeRepository/searchNodes', false);
        },
        clearSearch() {
            this.$store.dispatch('nodeRepository/updateQuery', '');
        },
        updateQuery(e) {
            this.$store.dispatch('nodeRepository/updateQuery', e.target.value);
        }
    }
    
};
</script>

<template>
  <div
    id="node-search"
    class="node-search"
  >
    <FunctionButton
      @click="searchNodes"
    >
      <LensIcon />
    </FunctionButton>
    <input
      :value="query"
      placeholder="Search nodes and components"
      type="text"
      @input="updateQuery"
      @keyup.enter="searchNodes"
    >
    <FunctionButton
      @click="clearSearch"
    >
      <CloseIcon />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
.node-search {
    height: 40px;
    display: flex;
    align-items: center;
    position: relative;
    border: 1px solid var(--knime-stone-gray);
    background-color: var(--knime-white);

  &:hover {
    background-color: var(--knime-silver-sand-semi);
  }

  &:active {
    background-color: var(--knime-white);
    border-color: var(--knime-masala);
  }

  & input {
        width: 100%;
        height: 100%;
        padding: 0 10px 0 10px;
        border: 0;
        color: var(--knime-masala);
        background-color: transparent;
        font-size: 17px;
        font-weight: 400;

      &:focus {
        outline: none;
      }
    }

}
</style>
