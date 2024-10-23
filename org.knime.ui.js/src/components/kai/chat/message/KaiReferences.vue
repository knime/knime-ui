<script setup lang="ts">
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";

import { BaseButton } from "@knime/components";
import HelpIcon from "@knime/styles/img/icons/circle-help.svg";

import type { References } from "../../types";

interface Props {
  references: References;
}

const props = defineProps<Props>();

const openReferences = (refName: string) => {
  props.references[refName].forEach((url) => window.open(url));
};

const hasReferences = computed(() => Object.keys(props.references).length > 0);
const referenceCategories = computed(() => Object.keys(props.references));

const showPopover = ref(false);
const togglePopup = () => {
  showPopover.value = !showPopover.value;
};
const buttonRef = ref(null);
const popoverRef = ref(null);
onClickOutside(popoverRef, togglePopup, { ignore: [buttonRef] });
</script>

<template>
  <BaseButton
    v-if="hasReferences"
    ref="buttonRef"
    class="reference-button"
    title="Related Topics"
    @click="togglePopup"
  >
    <HelpIcon :class="{ active: showPopover }" />
  </BaseButton>
  <div v-if="showPopover" ref="popoverRef" class="reference-popover">
    See the source of this answer in the <br />
    <template v-for="(refName, index) in referenceCategories" :key="refName">
      <BaseButton class="reference-link" @click="openReferences(refName)">
        {{ refName }}
      </BaseButton>
      <span v-if="index < referenceCategories.length - 1"> and </span>
      <span v-else>.</span>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .reference-button {
  all: unset;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: var(--theme-button-function-border-radius, 9999px);
  padding: 2px;

  &:hover,
  &:focus-visible {
    outline: none;
    color: var(--theme-button-function-foreground-color-hover);
    background-color: var(--theme-button-function-background-color-hover);
  }

  & svg {
    @mixin svg-icon-size 11;

    stroke: var(--knime-dove-gray);
  }

  & :deep(svg.active) {
    stroke: var(--knime-masala);

    & > circle {
      fill: var(--knime-masala);
    }

    & > path {
      stroke: var(--knime-porcelain);
    }
  }
}

& .reference-popover {
  width: calc(100%);
  position: absolute;
  top: 0;
  transform: translateY(calc(-100% - 5px));
  background-color: var(--knime-white);
  padding: 10px;
  box-shadow: 0 2px 10px 0 var(--knime-gray-dark-semi);

  &::after {
    width: 8px;
    height: 8px;
    content: "";
    position: absolute;
    background-color: var(--knime-white);
    bottom: 0;
    right: 2px;
    transform: translateY(50%) rotate(135deg);
  }

  & .reference-link {
    all: unset;
    text-decoration: underline;
    cursor: pointer;

    &:focus {
      outline: auto;
    }
  }
}
</style>
