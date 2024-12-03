<script setup lang="ts">
import { useDataValueView } from "../useDataValueView";

const { open, close, config, element } = useDataValueView();

defineExpose({ open, close });
</script>

<template>
  <div v-if="config" id="data-value-view" ref="element" />
</template>
