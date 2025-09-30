<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import * as layoutEditorZIndices from "../z-indices";

const layoutEditorStore = useLayoutEditorStore();
const { legacyNodes } = storeToRefs(layoutEditorStore);

const checkedNodesIds = computed(() =>
  legacyNodes.value
    .filter(({ availableInView }) => availableInView)
    .map(({ nodeID }) => nodeID),
);

const areAllChecked = computed(
  () => checkedNodesIds.value.length === legacyNodes.value.length,
);

const isIndeterminate = computed(
  () => checkedNodesIds.value.length !== 0 && !areAllChecked.value,
);

const isMasterChecked = computed({
  get: () => areAllChecked.value,
  set: (value) => {
    for (const node of legacyNodes.value) {
      node.availableInView = value;
    }
  },
});
</script>

<template>
  <table>
    <thead>
      <tr>
        <th colspan="2" class="header">
          Enable in Data App (legacy views only)
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="master-checkbox-label">All</span></td>
        <td class="checkbox-cell">
          <input
            v-model="isMasterChecked"
            type="checkbox"
            :indeterminate.prop="isIndeterminate"
          />
        </td>
      </tr>
      <tr v-for="node in legacyNodes" :key="node.nodeID">
        <td>{{ node.name }}</td>
        <td class="checkbox-cell">
          <input v-model="node.availableInView" type="checkbox" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style lang="postcss" scoped>
table {
  background-color: var(--knime-white);
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-12) var(--space-16);
  font-size: 13px;
  z-index: v-bind("layoutEditorZIndices.nodeUsageDialog");
}

.header {
  text-align: right;
  padding-bottom: var(--space-8);
}

.master-checkbox-label {
  font-weight: 700;
}

.checkbox-cell {
  text-align: center;
}
</style>
