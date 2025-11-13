<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { InlineMessage } from "@knime/components";
import { BaseModal, Button, Checkbox } from "@knime/kds-components";

import {
  ShareComponentCommand,
  SpaceProvider,
} from "@/api/gateway-api/generated-api";
import SpaceTree, {
  type SpaceTreeSelection,
} from "@/components/spaces/SpaceTree.vue";

import AdvancedLinkSettings from "./AdvancedLinkSettings.vue";
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
  linkType.value = undefined;
  includeData.value = false;
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
  <BaseModal
    :active="isActive"
    class="modal"
    :title="config?.title"
    variant="plain"
    width="large"
    height="full"
    @close="cancel"
  >
    <template #default>
      <div class="destination-picker-wrapper">
        <div class="spaced-container">{{ config?.description }}</div>

        <div class="space-tree-container">
          <SpaceTree
            class="space-tree"
            :provider-rules="config?.spaceProviderRules"
            auto-expand
            @select-change="onSpaceTreeSelection"
          />
        </div>

        <div
          v-if="showValidationHint"
          class="spaced-container validation-message"
        >
          <InlineMessage
            variant="info"
            title="Selection hint"
            :description="validationHint!"
          />
        </div>

        <template v-if="config?.askResetWorkflow || config?.askLinkSettings">
          <div class="spaced-container">
            <template v-if="selected?.type === 'item'">
              <Checkbox
                v-if="config?.askResetWorkflow"
                v-model="resetWorkflow"
                label="Reset Workflow(s) before upload"
                :disabled="
                  resetMode === SpaceProvider.ResetOnUploadEnum.MANDATORY
                "
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
      </div>
    </template>
    <template #footer>
      <Button label="Cancel" variant="transparent" @click="cancel" />
      <Button
        label="Choose"
        :disabled="!isValid"
        variant="filled"
        @click="onSubmit"
      />
    </template>
  </BaseModal>
</template>

<style lang="postcss" scoped>
.destination-picker-wrapper {
  padding: var(--modal-padding-top) 0 var(--modal-padding-bottom) 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--modal-gap);
}

.spaced-container {
  padding: 0 var(--modal-padding-right) 0 var(--modal-padding-left);
  display: flex;
  flex-direction: column;
  gap: var(--modal-gap);
}

.space-tree-container {
  overflow: auto;
  height: 100%;
  padding: 0 var(--modal-padding-right) 0 var(--modal-padding-left);
}

.space-tree {
  min-width: max-content;
}

.validation-message {
  margin-top: auto;
}
</style>
