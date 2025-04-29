<script setup lang="ts">
import { ref } from "vue";

import { ComponentPlaceholder, type XY } from "@/api/gateway-api/generated-api";

import ComponentError from "./ComponentError.vue";
import ComponentFloatingOptions from "./ComponentFloatingOptions.vue";
import ComponentLoading from "./ComponentLoading.vue";

type Props = {
  id: string;
  position: XY;
  progress?: number;
  state:
    | ComponentPlaceholder.StateEnum.LOADING
    | ComponentPlaceholder.StateEnum.ERROR;
  name?: string;
};

defineProps<Props>();

const isHovering = ref(false);
</script>

<template>
  <g
    :transform="`translate(${position.x}, ${position.y})`"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!-- Transparent hitbox -->
    <rect
      :x="-10"
      :y="-50"
      :width="$shapes.nodeSize + 20"
      :height="$shapes.nodeSize + 55"
      fill="transparent"
    />

    <ComponentFloatingOptions
      v-if="isHovering"
      :id="id"
      :is-error="state === ComponentPlaceholder.StateEnum.ERROR"
    />

    <ComponentLoading
      v-if="state === ComponentPlaceholder.StateEnum.LOADING"
      :progress="progress"
      :name="name"
    />

    <ComponentError v-else :name="name" />
  </g>
</template>
