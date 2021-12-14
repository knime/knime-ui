<script>
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~/webapps-common/ui/assets/img/icons/lens.svg?inline';

import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

import { mapState } from 'vuex';
import { debounce } from 'lodash';

const DEBOUNCE_WAIT = 100; // ms

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
        clearSearch() {
            // only clear the search query - tags will be kept
            this.$store.dispatch('nodeRepository/updateQuery', '');
            this.$refs.searchInput.focus();
        },
        updateQuery: debounce(function (e) {
            // eslint-disable-next-line no-invalid-this
            this.$store.dispatch('nodeRepository/updateQuery', e.target.value);
        }, DEBOUNCE_WAIT, {
            leading: true,
            trailing: true
        })
    }

};
</script>

<template>
  <div
    id="node-search"
    class="node-search"
  >
    <FunctionButton
      class="lens-icon"
    >
      <LensIcon />
    </FunctionButton>
    <input
      ref="searchInput"
      :value="query"
      placeholder="Search nodes and components"
      type="text"
      @input="updateQuery"
    >
    <FunctionButton
      class="clear-search"
      data-test-clear-search
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

  &:focus-within {
    background-color: var(--knime-white);
    border-color: var(--knime-masala);
  }

  & .lens-icon {
    pointer-events: none;
    margin-left: 3px;
  }

  & .clear-search {
    margin-right: 6px;

    & >>> svg {
      width: 12px;
      height: 12px;
      stroke-width: calc(32px / 12);
    }
  }

  & input {
    width: 100%;
    height: 100%;
    border: 0;
    padding-right: 6px;
    color: var(--knime-masala);
    background-color: transparent;
    font-size: 17px;
    font-weight: 400;

    &:focus {
      outline: none;
    }
  }

  & input:placeholder-shown + button {
    visibility: hidden;
  }
}
</style>
