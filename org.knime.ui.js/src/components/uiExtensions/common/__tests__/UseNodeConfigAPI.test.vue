<script setup lang="ts">
import { useNodeConfigAPI } from "../useNodeConfigAPI";

defineProps<{ nodeId: string; execute: boolean }>();

const { dirtyState, lastestPublishedData, applySettings, setApplyComplete } =
  useNodeConfigAPI();
</script>

<template>
  <div>
    <button data-testid="applySettings" @click="applySettings(nodeId, execute)">
      Apply
    </button>

    <button
      data-testid="setApplyComplete"
      @click="setApplyComplete(($event as any).dataSet.isApplied)"
    >
      Set apply complete
    </button>

    <div data-testid="dirtyState">{{ JSON.stringify(dirtyState) }}</div>
    <div data-testid="lastestPublishedData">
      {{ JSON.stringify(lastestPublishedData) }}
    </div>
  </div>
</template>
