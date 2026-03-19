<script>
import { BaseButton, ExpandTransition } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

export default {
  components: {
    DropdownIcon,
    BaseButton,
    ExpandTransition,
  },
  props: {
    /**
     * if the initial state is expanded
     */
    initiallyExpanded: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isExpanded: this.initiallyExpanded,
    };
  },
  methods: {
    onTrigger() {
      this.isExpanded = !this.isExpanded;
    },
  },
};
</script>

<template>
  <div>
    <BaseButton
      class="button"
      :aria-expanded="String(isExpanded)"
      @click.prevent="onTrigger"
    >
      <div class="title">
        <slot name="title" />
      </div>
      <div class="dropdown">
        <DropdownIcon :class="['dropdown-icon', { flip: isExpanded }]" />
      </div>
    </BaseButton>
    <ExpandTransition :is-expanded="isExpanded">
      <slot />
    </ExpandTransition>
  </div>
</template>

<style lang="postcss" scoped>
.button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  color: inherit; /* Safari needs this */
  appearance: none;
  cursor: pointer;
  outline: none;
  background-color: transparent;
  border: 0;

  & .title {
    flex: 1;
    line-height: normal;
    text-align: left;
  }

  & .dropdown {
    top: 13px;
    display: flex;
    align-items: center;
    width: 30px;
    height: 30px;
    text-align: center;
    border-radius: 50%;

    & .dropdown-icon {
      position: relative;
      top: 0;
      width: 18px;
      height: 18px;
      margin: auto;
      stroke: var(--knime-masala);
      stroke-width: calc(32px / 18);
      transition: transform 0.4s ease-in-out;

      &.flip {
        transform: scaleY(-1);
      }
    }
  }

  &:focus-visible .dropdown,
  &:hover .dropdown {
    color: var(--theme-button-function-foreground-color-hover);
    outline: none;
    background-color: var(--theme-button-function-background-color-hover);
  }
}

:deep(ul),
:deep(ol) {
  padding-left: 40px;
  margin: 0;
}
</style>
