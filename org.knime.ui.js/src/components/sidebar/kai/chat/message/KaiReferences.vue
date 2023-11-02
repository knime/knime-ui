<script setup lang="ts">
import { computed } from "vue";
import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import Button from "webapps-common/ui/components/Button.vue";

const props = defineProps<{ references: {} }>();

const openReferences = () => {
  const urls = Object.values(props.references).flat() as string[];
  urls.forEach((url) => window.open(url));
};

const hasReferences = computed(
  () => props.references && Object.keys(props.references).length > 0,
);
</script>

<template>
  <Button v-if="hasReferences" class="references" @click="openReferences">
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
