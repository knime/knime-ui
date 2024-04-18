<script setup lang="ts">
import { ref, unref } from "vue";

import Modal from "webapps-common/ui/components/Modal.vue";
import Button from "webapps-common/ui/components/Button.vue";
import Checkbox from "webapps-common/ui/components/forms/Checkbox.vue";

import { useConfirmModal } from "@/composables/useConfirmDialog";

const askAgain = ref(false);
const { state, confirm, cancel } = useConfirmModal();

const reset = () => {
  askAgain.value = false;
};

const onConfirm = () => {
  confirm(unref(askAgain.value));
  reset();
};

const onCancel = () => {
  cancel();
  reset();
};
</script>

<template>
  <Modal
    v-show="state.isActive"
    :active="state.isActive"
    :title="state.config?.title"
    :implicit-dismiss="false"
    style-type="info"
    class="modal"
    @cancel="onCancel"
  >
    <template #confirmation>
      <div class="confirmation">
        <div class="message">{{ state.config?.message }}</div>
        <div v-if="state.config?.dontAskAgainText" class="ask-again">
          <Checkbox v-model="askAgain">
            {{ state.config.dontAskAgainText }}
          </Checkbox>
        </div>
      </div>
    </template>

    <template #controls>
      <Button with-border @click="onCancel">
        <strong>{{ state.config?.cancelButtonText ?? "Cancel" }}</strong>
      </Button>

      <Button primary class="submit-button" @click="onConfirm">
        <strong>{{ state.config?.confirmButtonText ?? "OK" }}</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 400px;

  & :deep(.overlay) {
    background: white;
    opacity: 0.1;
  }

  & :deep(.wrapper .inner) {
    box-shadow: var(--shadow-elevation-2);
  }
}

.confirmation {
  & .message {
    font-size: 18px;
  }

  & .ask-again {
    margin-top: 18px;

    & :deep(.checkbox span) {
      text-wrap: initial;
    }
  }
}
</style>
