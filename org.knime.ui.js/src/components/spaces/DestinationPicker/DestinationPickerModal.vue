<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Button, Checkbox, InlineMessage, Modal } from "@knime/components";

import { SpaceProvider } from "@/api/gateway-api/generated-api";
import SpaceTree, {
  type SpaceTreeSelection,
} from "@/components/spaces/SpaceTree.vue";

import { useDestinationPicker } from "./useDestinationPicker";

const { isActive, config, cancel, confirm } = useDestinationPicker();

const isValid = ref<boolean>(false);
const validationHint = ref<string | null>(null);
const resetWorkflow = ref(false);
const resetMode = ref<SpaceProvider.ResetOnUploadEnum>();

const selected = ref<SpaceTreeSelection>(null);

const onSpaceTreeSelection = (selection: SpaceTreeSelection) => {
  selected.value = selection;
  if (selection?.type === "item") {
    resetMode.value = selection.resetOnUpload;
    resetWorkflow.value = selection.resetOnUpload !== undefined;
  } else {
    resetMode.value = undefined;
  }

  const { valid, hint } = config.value!.validate(selection);
  isValid.value = valid;
  validationHint.value = hint ?? null;
};

const onSubmit = () => {
  confirm({
    ...selected.value!,
    resetWorkflow: resetWorkflow.value,
  });
};

const resetModalState = () => {
  isValid.value = false;
  validationHint.value = null;
  resetWorkflow.value = false;
  selected.value = null;
};

watch(isActive, () => {
  if (!isActive.value) {
    resetModalState();
  }
});

const showValidationHint = computed(
  () => !isValid.value && validationHint.value,
);
</script>

<template>
  <Modal
    v-show="config && isActive"
    ref="modalRef"
    :active="isActive"
    :title="config?.title"
    style-type="info"
    class="modal"
    @cancel="cancel"
  >
    <template #notice>
      <div class="spaced-container">
        {{ config?.description }}
        <div class="space-tree-container">
          <SpaceTree
            class="space-tree"
            :provider-rules="config?.spaceProviderRules"
            @select-change="onSpaceTreeSelection"
          />
        </div>
        <div v-if="showValidationHint" class="validation-message">
          <InlineMessage
            variant="info"
            title="Selection hint"
            :description="validationHint!"
          />
        </div>
      </div>
    </template>
    <template
      v-if="showValidationHint || config?.askResetWorkflow"
      #confirmation
    >
      <div class="spaced-container">
        <Checkbox
          v-if="config?.askResetWorkflow && selected?.type === 'item'"
          v-model="resetWorkflow"
          :disabled="resetMode === SpaceProvider.ResetOnUploadEnum.MANDATORY"
        >
          Reset Workflow(s) before upload
        </Checkbox>
      </div>
    </template>

    <template #controls>
      <Button compact with-border @click="cancel">
        <strong>Cancel</strong>
      </Button>
      <Button
        compact
        primary
        class="submit-button"
        :disabled="!isValid"
        @click="onSubmit"
      >
        <strong>Choose</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 600px;
  --modal-height: 85%;

  & :deep(.inner) {
    top: 48%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  & :deep(.notice) {
    overflow: hidden;

    /* workaround to have a transparent notice until it gets refactored to a single slot -> NXT-3131 */
    background-color: transparent !important;
    height: 100%;
  }
}

.space-tree-container {
  overflow: auto;
  padding: 0 var(--modal-padding);
  margin: 0 calc(var(--modal-padding) * -1);
  height: 100%;
}

.space-tree {
  min-width: max-content;
}

.spaced-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--modal-padding);
}

.validation-message {
  margin-top: auto;
}
</style>
