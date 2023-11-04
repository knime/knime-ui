<script setup lang="ts">
import { computed, ref } from "vue";
import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import BaseButton from "webapps-common/ui/components/BaseButton.vue";
import { isEmpty } from "lodash";
import type { References } from "../../types";

interface Props {
  references: References;
}

const props = defineProps<Props>();

const openReferences = (refName: string) => {
  props.references[refName].forEach((url) => window.open(url));
};

const hasReferences = computed(() => !isEmpty(props.references));
const referenceCategories = computed(() => Object.keys(props.references));

const showPopup = ref(false);
const togglePopup = () => {
  showPopup.value = !showPopup.value;
};
</script>

<template>
  <BaseButton
    v-if="hasReferences"
    class="reference-button"
    title="Related Topics"
    :active="showPopup"
    @click="togglePopup"
  >
    <HelpIcon :class="{ active: showPopup }" />
  </BaseButton>

  <div v-if="showPopup" class="reference-popover">
    Show related topics: <br />
    <template v-for="(refName, index) in referenceCategories" :key="refName">
      <BaseButton class="reference-link" @click="openReferences(refName)">
        {{ refName }}
      </BaseButton>
      <span v-if="index < referenceCategories.length - 1">, </span>
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
