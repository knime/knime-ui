<script setup lang="ts">
import { toRefs, type Ref } from "vue";
import { useKaiPanels } from "./useKaiPanels";
import type { KaiMode } from "./types";

type Props = {
  mode: Ref<KaiMode>;
};

const props = defineProps<Props>();
const { mode } = toRefs(props);

const { component, componentListeners, componentProps } = useKaiPanels({
  mode,
});
</script>

<template>
  <component
    :is="component"
    v-on="componentListeners"
    v-bind="componentProps"
  />
</template>

<style lang="postcss" scoped></style>
