<script>
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~/webapps-common/ui/assets/img/icons/lens.svg?inline';

import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

/**
 * Search input box for searches of nodes in the NodeRepository view of the sidebar.
 * Implements the v-model pattern.
 */
export default {
    components: {
        FunctionButton,
        CloseIcon,
        LensIcon
    },
    props: {
        value: {
            type: String,
            default: ''
        }
    },
    methods: {
        clearSearch() {
            // only clear the search query - tags will be kept
            this.$emit('input', '');
            this.$refs.searchInput.focus();
        }
    }

};
</script>

<template>
  <div
    id="node-search"
    class="node-search"
  >
    <div class="lens-icon">
      <LensIcon />
    </div>
    <input
      ref="searchInput"
      :value="value"
      placeholder="Search nodes"
      type="text"
      @input="$emit('input', $event.target.value)"
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
    display: flex;
    padding: 6px;
    margin-left: 3px;
    pointer-events: none;

    & svg {
      vertical-align: top;
      stroke: var(--theme-button-function-foreground-color);
      width: 18px;
      height: 18px;
      stroke-width: calc(32px / 18);
    }
  }

  & .clear-search {
    margin-right: 6px;

    & >>> svg {
      width: 12px;
      height: 12px;
      stroke-width: calc(32px / 12);
    }
  }
}

input {
  width: 100%;
  height: 100%;
  border: 0;
  padding-right: 6px;
  color: var(--knime-masala);
  background-color: transparent;
  font-size: 17px;

  &:focus {
    outline: none;
  }

  &:placeholder-shown + button {
    visibility: hidden;
  }
}
</style>
