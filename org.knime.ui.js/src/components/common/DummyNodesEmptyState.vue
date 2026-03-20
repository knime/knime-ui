<script setup lang="ts">
import { Button } from "@knime/components";

import DummyNodes from "@/assets/workflow-coach-dummy-nodes.svg";

type Props = {
  buttonText: string;
  icon?: unknown;
};

defineProps<Props>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <div class="wrapper">
    <DummyNodes class="dummy-nodes" />

    <div class="content">
      <slot />
    </div>

    <Button primary class="button" compact @click="emit('click')">
      <Component :is="icon" v-if="icon" />{{ buttonText }}
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-content: center;
  align-items: center;
  width: 100%;
  font-size: 13px;

  & .dummy-nodes {
    align-self: center;
    margin: var(--space-24) 0;
    filter: blur(2px);
  }

  & .content {
    padding: var(--space-4);
    text-align: center;
  }

  & .button {
    height: 30px;
    padding: var(--space-6) var(--space-16);
    margin: var(--space-24) 0 0 var(--space-8);
  }
}
</style>
