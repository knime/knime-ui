<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { InlineMessage, Modal } from "@knime/components";
import { Button, Checkbox } from "@knime/kds-components";

import {
  ShareComponentCommand,
  SpaceProvider,
} from "@/api/gateway-api/generated-api";
import SpaceTree, {
  type SpaceTreeSelection,
} from "@/components/spaces/SpaceTree.vue";
import AdvancedLinkSettings from "../AdvancedLinkSettings.vue";

import { getDefaultLinkType } from "./getDefaultLinkType";
import { useDestinationPicker } from "./useDestinationPicker";

const { isActive, config, cancel, confirm } = useDestinationPicker();

const isValid = ref<boolean>(false);
const validationHint = ref<string | null>(null);
const resetWorkflow = ref(false);
const includeData = ref(false);
const linkType = ref<ShareComponentCommand.LinkTypeEnum>();
const resetMode = ref<SpaceProvider.ResetOnUploadEnum>();

const selected = ref<SpaceTreeSelection>(null);

const onSpaceTreeSelection = (selection: SpaceTreeSelection) => {
  selected.value = selection;
  if (selection?.type === "item") {
    resetMode.value = selection.resetOnUpload!;
    resetWorkflow.value =
      selection.resetOnUpload !== SpaceProvider.ResetOnUploadEnum.NOPREFERENCE;
  } else {
    resetMode.value = undefined;
  }

  const { valid, hint } = config.value!.validate(selection);
  isValid.value = valid;
  validationHint.value = hint ?? null;
};

const showAdvancedLinkSettings = ref(false);

const onSubmit = () => {
  // use the default if the user never selected anything
  const defaultLinkType =
    selected.value?.type === "item"
      ? getDefaultLinkType(selected.value?.spaceId)
      : undefined;

  confirm({
    ...selected.value!,
    resetWorkflow: resetWorkflow.value,
    includeData: includeData.value,
    linkType: linkType.value ?? defaultLinkType,
  });
};

const resetModalState = () => {
  showAdvancedLinkSettings.value = false;
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
            auto-expand
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
      v-if="
        showValidationHint ||
        config?.askResetWorkflow ||
        config?.askLinkSettings
      "
      #confirmation
    >
      <div class="spaced-container">
        <template v-if="selected?.type === 'item'">
          <Checkbox
            v-if="config?.askResetWorkflow"
            v-model="resetWorkflow"
            label="Reset Workflow(s) before upload"
            :disabled="resetMode === SpaceProvider.ResetOnUploadEnum.MANDATORY"
          />
          <template v-if="config?.askLinkSettings">
            <Button
              v-if="!showAdvancedLinkSettings"
              compact
              label="Show advanced settings"
              variant="transparent"
              class="show-advanced-link-settings"
              @click="showAdvancedLinkSettings = true"
            />
            <AdvancedLinkSettings
              v-if="showAdvancedLinkSettings"
              v-model:link-type="linkType"
              v-model:include-data="includeData"
              :source-space-id="config.askLinkSettings.sourceSpaceId"
              :selected-space-id="selected.spaceId"
            />
          </template>
        </template>
      </div>
    </template>

    <template #controls>
      <Button variant="outlined" label="Cancel" @click="cancel" />
      <Button :disabled="!isValid" label="Choose" @click="onSubmit" />
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
  }

  & :deep(.confirmation) {
    padding-top: 0;
  }

  & :deep(.notice) {
    overflow: hidden;

    /* workaround to have a transparent notice until it gets refactored to a single slot -> NXT-3131 */
    background-color: transparent !important;
    height: 100%;
  }
}

.show-advanced-link-settings {
  text-align: left;
  padding-left: 0;
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
