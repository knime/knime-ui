<script setup lang="ts">
import { computed, ref } from "vue";
import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import Button from "webapps-common/ui/components/Button.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
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

const showPopup = ref(false);

const togglePopup = () => {
  showPopup.value = !showPopup.value;
};
</script>

<template>
  <FunctionButton
    v-if="hasReferences"
    class="references"
    title="Related Topics"
    :active="showPopup"
    @click="togglePopup"
  >
    <HelpIcon />
  </FunctionButton>

  <div v-if="showPopup" class="popover">
    Show related topics:
    <Button
      v-for="refName in Object.keys(references)"
      :key="refName"
      class="reference-link"
      @click="openReferences(refName)"
    >
      {{ refName }}
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .references {
  padding: 0;

  & svg {
    @mixin svg-icon-size 11;

    stroke: var(--knime-dove-gray);
  }

  & .popover {
    & .reference-link:not(:last-child)::after {
      content: ",";
    }
  }
}
</style>
