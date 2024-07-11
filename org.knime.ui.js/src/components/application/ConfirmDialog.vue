<script setup lang="ts">
import { ref, unref } from "vue";

import { Modal, Button, Checkbox } from "@knime/components";

import {
  useConfirmDialog,
  type ConfirmDialogButton,
} from "@/composables/useConfirmDialog";

const askAgain = ref(false);
const { config, isActive, confirm, cancel } = useConfirmDialog();

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

const handleButtonClick = (button: ConfirmDialogButton) => {
  if (button.customHandler) {
    button.customHandler({ confirm: onConfirm, cancel: onCancel });
    return;
  }

  const handler = button.type === "confirm" ? onConfirm : onCancel;
  handler();
};
</script>

<template>
  <Modal
    v-show="isActive"
    :active="isActive"
    :title="config?.title"
    :implicit-dismiss="false"
    style-type="info"
    class="modal"
    :animate="false"
    @cancel="onCancel"
  >
    <template #confirmation>
      <div class="confirmation">
        <div class="message">{{ config?.message }}</div>
        <div v-if="config?.doNotAskAgainText" class="ask-again">
          <Checkbox v-model="askAgain">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="config.doNotAskAgainText" />
          </Checkbox>
        </div>
      </div>
    </template>

    <template v-if="config" #controls>
      <Button
        v-for="(button, index) in config.buttons"
        :key="index"
        compact
        :data-test-id="`${button.type}-button`"
        :with-border="button.type === 'cancel'"
        :primary="button.type === 'confirm'"
        :class="['button', { 'flush-right': button.flushRight }]"
        @click="handleButtonClick(button)"
      >
        <strong>{{ button.label }}</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 450px;

  & :deep(.overlay) {
    background: white;
    opacity: 0.1;
  }

  & :deep(.wrapper .inner) {
    box-shadow: var(--shadow-elevation-2);
  }

  & :deep(.controls) {
    gap: 4px;
  }

  & .flush-right {
    margin-left: auto;
  }

  & .flush-right ~ .flush-right {
    margin-left: initial;
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
