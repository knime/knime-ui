<script setup lang="ts">
import { useNodeConfigAPI } from "../useNodeConfigAPI";

defineProps<{ nodeId: string; execute: boolean }>();

const { dirtyState, lastestPublishedData, applySettings, setApplyComplete } =
  useNodeConfigAPI();
</script>

<template>
  <div>
    <button
      data-test-id="applySettings"
      @click="applySettings(nodeId, execute)"
    >
      Apply
    </button>

    <button
      data-test-id="setApplyComplete"
      @click="setApplyComplete(($event as any).dataSet.isApplied)"
    >
      Set apply complete
    </button>

    <div data-test-id="dirtyState">{{ JSON.stringify(dirtyState) }}</div>
    <div data-test-id="lastestPublishedData">
      {{ JSON.stringify(lastestPublishedData) }}
    </div>
  </div>
</template>
