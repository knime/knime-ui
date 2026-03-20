<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  KdsButton,
  KdsCheckbox,
  KdsInlineMessage,
  KdsModal,
} from "@knime/kds-components";

import { LinkVariant, SpaceProvider } from "@/api/gateway-api/generated-api";
import { toLinkVariant } from "@/components/common/linkVariantOptions";
import SpaceTree, {
  type SpaceTreeSelection,
} from "@/components/spaces/SpaceTree.vue";

import AdvancedLinkSettings from "./AdvancedLinkSettings.vue";
import { getDefaultLinkVariant } from "./getDefaultLinkVariant";
import { useDestinationPicker } from "./useDestinationPicker";

const { isActive, config, cancel, confirm } = useDestinationPicker();

const isValid = ref<boolean>(false);
const validationHint = ref<string | null>(null);
const resetWorkflow = ref(false);
const includeData = ref(false);
const linkVariant = ref<LinkVariant.VariantEnum>();
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
  const defaultLinkVariant =
    selected.value?.type === "item"
      ? getDefaultLinkVariant(selected.value?.spaceId)
      : undefined;

  const selectedLinkVariant = linkVariant.value ?? defaultLinkVariant;

  confirm({
    ...selected.value!,
    resetWorkflow: resetWorkflow.value,
    includeData: includeData.value,
    linkVariant: selectedLinkVariant
      ? toLinkVariant(selectedLinkVariant)
      : undefined,
  });
};

const resetModalState = () => {
  showAdvancedLinkSettings.value = false;
  linkVariant.value = undefined;
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
  <KdsModal
    :active="isActive"
    class="modal"
    :headline="config?.title"
    variant="plain"
    width="large"
    height="full"
    @close="cancel"
  >
    <template #body>
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
          <KdsInlineMessage
            variant="info"
            headline="Selection hint"
            :description="validationHint!"
          />
        </div>

        <template v-if="config?.askResetWorkflow || config?.askLinkSettings">
          <div class="spaced-container">
            <template v-if="selected?.type === 'item'">
              <KdsCheckbox
                v-if="config?.askResetWorkflow"
                v-model="resetWorkflow"
                label="Reset Workflow(s) before upload"
                :disabled="
                  resetMode === SpaceProvider.ResetOnUploadEnum.MANDATORY
                "
              />
              <template v-if="config?.askLinkSettings">
                <KdsButton
                  v-if="!showAdvancedLinkSettings"
                  label="Show advanced settings"
                  variant="transparent"
                  class="show-advanced-link-settings"
                  @click="showAdvancedLinkSettings = true"
                />
                <AdvancedLinkSettings
                  v-if="showAdvancedLinkSettings"
                  v-model:variant="linkVariant"
                  v-model:include-data="includeData"
                  :source-space-id="config.askLinkSettings.sourceSpaceId"
                  :selected-space-id="selected.spaceId"
                  :selected-space-provider-id="selected.spaceProviderId"
                  :selected-item-id="selected.itemId"
                />
              </template>
            </template>
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <KdsButton label="Cancel" variant="transparent" @click="cancel" />
      <KdsButton
        label="Choose"
        :disabled="!isValid"
        variant="filled"
        @click="onSubmit"
      />
    </template>
  </KdsModal>
</template>

<style lang="postcss" scoped>
.destination-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--modal-gap, 0);
  height: 100%;
  padding: var(--modal-padding-top, 0) 0 var(--modal-padding-bottom, 0) 0;
}

.spaced-container {
  display: flex;
  flex-direction: column;
  gap: var(--modal-gap, 0);
  padding: 0 var(--modal-padding-right, 0) 0 var(--modal-padding-left, 0);
}

.space-tree-container {
  height: 100%;
  padding: 0 var(--modal-padding-right, 0) 0 var(--modal-padding-left, 0);
  overflow: auto;
}

.space-tree {
  min-width: max-content;
}

.validation-message {
  margin-top: auto;
}
</style>
