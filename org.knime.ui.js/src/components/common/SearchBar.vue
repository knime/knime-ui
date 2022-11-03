<script>
import CloseIcon from 'webapps-common/ui/assets/img/icons/close.svg';
import LensIcon from 'webapps-common/ui/assets/img/icons/lens.svg';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';

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
        modelValue: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: null
        }
    },
    emits: ['clear', 'update:modelValue'],
    methods: {
        clearSearch() {
            this.$emit('clear');
            this.$emit('update:modelValue', '');
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
      :value="modelValue"
      :placeholder="placeholder"
      type="text"
      @input="$emit('update:modelValue', $event.target.value)"
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
@import "@/assets/mixins.css";

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

    & svg {
      vertical-align: top;
      stroke: var(--theme-button-function-foreground-color);

      @mixin svg-icon-size 18;
    }
  }

  & .clear-search {
    --icon-size: 12;

    margin-right: calc(var(--icon-size) / 2 * 1px);

    & :deep(svg) {
      @mixin svg-icon-size var(--icon-size);
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
