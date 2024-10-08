<script setup lang="ts">
import { Button } from "@knime/components";

import DummyNodes from "@/assets/workflow-coach-dummy-nodes.svg";

type Props = {
  buttonText: string;
  icon: any | null;
};

withDefaults(defineProps<Props>(), {
  icon: null,
});

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
  flex-direction: column;
  align-items: center;
  align-content: center;
  width: 100%;
  flex: 1;
  font-size: 13px;

  & .dummy-nodes {
    margin: var(--space-24) 0;
    filter: blur(2px);
    align-self: center;
  }

  & .content {
    text-align: center;
    padding: var(--space-4);
  }

  & .button {
    height: 30px;
    padding: var(--space-6) var(--space-16);
    margin: var(--space-24) 0 0 var(--space-8);
  }
}
</style>
