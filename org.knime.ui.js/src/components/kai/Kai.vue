<script setup lang="ts">
import { type Ref, toRefs } from "vue";

import type { KaiMode } from "./types";
import { useKaiPanels } from "./useKaiPanels";

type Props = {
  nodeId?: string | null;
  mode: Ref<KaiMode>;
};

const props = withDefaults(defineProps<Props>(), {
  nodeId: null,
});
const { nodeId, mode } = toRefs(props);

const { component, componentListeners, componentProps } = useKaiPanels({
  nodeId,
  mode,
});
</script>

<template>
  <component
    :is="component"
    v-bind="componentProps"
    v-on="componentListeners"
  />
</template>

<style lang="postcss" scoped></style>
