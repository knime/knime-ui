<script>
import CloseIcon from '~webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~webapps-common/ui/assets/img/icons/lens.svg?inline';

import FunctionButton from '~webapps-common/ui/components/FunctionButton';

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
        },
        placeholder: {
            type: String,
            default: null
        }
    },
    methods: {
        clearSearch() {
            this.$emit('clear');
            this.$emit('input', '');
            this.$refs.searchInput.focus();
        },
        // publicly accessible
        focus() {
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
      :placeholder="placeholder"
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
  display: flex;
  align-items: center;
  position: relative;
  border: 1px solid var(--knime-stone-gray);
  background-color: var(--knime-white);
  font-size: 17px;

  & .lens-icon {
    display: flex;
    padding: 6px;
    margin-left: 3px;
    pointer-events: none;
    --icon-size: 18;

    & svg {
      vertical-align: top;
      stroke: var(--theme-button-function-foreground-color);
      width: calc(var(--icon-size) * 1px);
      height: calc(var(--icon-size) * 1px);
      stroke-width: calc(32px / var(--icon-size));
    }
  }

  & .clear-search {
    --icon-size: 12;

    margin-right: calc(var(--icon-size) / 2 * 1px);

    & >>> svg {
      width: calc(var(--icon-size) * 1px);
      height: calc(var(--icon-size) * 1px);
      stroke-width: calc(32px / var(--icon-size));
    }
  }
}

input {
  flex-grow: 1;
  height: 100%;
  border: 0;
  padding-right: 6px;
  color: var(--knime-masala);
  background-color: transparent;

  &:focus {
    outline: none;
  }

  &:placeholder-shown + button {
    visibility: hidden;
  }
}
</style>
