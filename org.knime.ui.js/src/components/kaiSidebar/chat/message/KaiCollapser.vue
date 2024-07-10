<script>
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import BaseButton from "webapps-common/ui/components/BaseButton.vue";
import ExpandTransition from "webapps-common/ui/components/transitions/ExpandTransition.vue";

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
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  background-color: transparent;
  border: 0;
  outline: none;
  appearance: none;
  color: inherit; /* Safari needs this */
  width: 100%;
  cursor: pointer;

  & .title {
    flex: 1;
    text-align: left;
    line-height: normal;
  }

  & .dropdown {
    text-align: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    top: 13px;

    & .dropdown-icon {
      position: relative;
      margin: auto;
      width: 18px;
      height: 18px;
      stroke-width: calc(32px / 18);
      stroke: var(--knime-masala);
      top: 0;
      transition: transform 0.4s ease-in-out;

      &.flip {
        transform: scaleY(-1);
      }
    }
  }

  &:focus-visible .dropdown,
  &:hover .dropdown {
    outline: none;
    color: var(--theme-button-function-foreground-color-hover);
    background-color: var(--theme-button-function-background-color-hover);
  }
}

:deep(ul),
:deep(ol) {
  margin: 0;
  padding-left: 40px;
}
</style>
