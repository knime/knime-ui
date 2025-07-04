<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { Button, LoadingIcon, Modal, TabBar } from "@knime/components";

import { API } from "@/api";
import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import ComponentLayoutEditor from "./ComponentLayoutEditor.vue";

const isSubmitted = ref(false);
const activeTab = ref("componentLayoutEditor");

const layoutEditorStore = useLayoutEditorStore();
const { openWorkflow, layout } = storeToRefs(layoutEditorStore);

const possibleTabValues = computed(() => [
  {
    value: "componentLayoutEditor",
    label: "Composite View Layout",
  },
  {
    value: "advancedComponentLayoutEditor",
    label: "Advanced Composite View Layout",
  },
  {
    value: "configurationLayout",
    label: "Configuration Dialog Layout",
  },
]);

const closeModal = () => {
  if (isSubmitted.value) {
    return;
  }

  layoutEditorStore.setOpenWorkflow(null);
};

const onSubmit = async () => {
  if (openWorkflow.value === null) {
    consola.warn("No workflow is currently open for editing.");
    return;
  }

  // TODO: Error handling
  await API.componenteditor.setViewLayout({
    ...openWorkflow.value,
    componentViewLayout: JSON.stringify(layout.value),
  });
  openWorkflow.value = null;
};
</script>

<template>
  <Modal
    :active="openWorkflow !== null"
    title="Create a new workflow"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #confirmation>
      <TabBar
        v-model="activeTab"
        :possible-values="possibleTabValues"
        :disabled="false"
      />

      <ComponentLayoutEditor v-if="activeTab === 'componentLayoutEditor'" />
    </template>

    <template #controls>
      <Button compact with-border :disabled="isSubmitted" @click="closeModal">
        <strong>Cancel</strong>
      </Button>
      <Button
        compact
        primary
        class="submit-button"
        :disabled="isSubmitted"
        @click="onSubmit"
      >
        <LoadingIcon v-if="isSubmitted" aria-hidden="true" focusable="false" />
        <strong>Finish</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 960px;
}
</style>
