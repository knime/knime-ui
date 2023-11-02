<script setup lang="ts">
import { computed } from "vue";
import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import Button from "webapps-common/ui/components/Button.vue";
import { isEmpty } from "lodash";
import type { References } from "../../types";

interface Props {
  references: References;
}

const props = defineProps<Props>();

const openReferences = () => {
  const urls = Object.values(props.references).flat();
  urls.forEach((url) => window.open(url));
};

const hasReferences = computed(() => !isEmpty(props.references));
</script>

<template>
  <Button
    v-if="hasReferences"
    class="references"
    title="Related Topics"
    @click="openReferences"
  >
    <HelpIcon />
  </Button>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .references {
  padding: 0;

  & svg {
    @mixin svg-icon-size 11;

    stroke: var(--knime-dove-gray);
  }
}
</style>
