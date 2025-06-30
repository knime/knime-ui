<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";

import { Button, LoadingIcon, Modal } from "@knime/components";

import { useApplicationStore } from "@/store/application/application";

import ComponentLayoutEditor from "./ComponentLayoutEditor.vue";

// TODO: Rename and move component

const isSubmitted = ref(false);

const applicationStore = useApplicationStore();
const { isComponentLayoutEditorDialogOpen: isOpen } =
  storeToRefs(applicationStore);

const closeModal = () => {
  if (isSubmitted.value) {
    return;
  }

  applicationStore.setIsComponentLayoutEditorDialogOpen(false);
};

const onSubmit = () => {
  console.log("Close modal and save");
};
</script>

<template>
  <Modal
    v-show="isOpen"
    ref="modalRef"
    :active="isOpen"
    title="Create a new workflow"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #notice>
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
