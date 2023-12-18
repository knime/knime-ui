<script setup lang="ts">
import { computed } from "vue";
import { environment, type Environment } from "./index";

type Props = {
  value: Environment;
};

const props = defineProps<Props>();

const shouldRender = computed(() => props.value === environment);
</script>

<template>
  <slot v-if="shouldRender" />
</template>
