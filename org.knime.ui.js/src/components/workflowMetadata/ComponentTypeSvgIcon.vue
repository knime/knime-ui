<script setup lang="ts">
import { DoveGray as colorDoveGray } from "@knime/styles/colors/knimeColors";
interface Props {
  color: string;
}
defineProps<Props>();
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" stroke="none" :fill="colorDoveGray" />
    <circle cx="16" cy="16" r="14" stroke="none" :fill="color" />
  </svg>
</template>
