<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";

import { Button, LoadingIcon, Modal } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import ComponentLayoutEditor from "./ComponentLayoutEditor.vue";

const isSubmitted = ref(false);

const layoutEditorStore = useLayoutEditorStore();
const { openWorkflow } = storeToRefs(layoutEditorStore);

const closeModal = () => {
  if (isSubmitted.value) {
    return;
  }

  layoutEditorStore.setOpenWorkflow(null);
};

const onSubmit = () => {
  console.log("Close modal and save");
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
      <ComponentLayoutEditor />
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
