<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Modal, RadioButtons } from "@knime/components";
import { Button } from "@knime/kds-components";

import { LinkVariant } from "@/api/gateway-api/generated-api";
import type { LinkVariantInfo } from "@/api/gateway-api/generated-api";
import { useChangeLinkVariantModal } from "@/composables/useChangeLinkVariantModal";

const { isActive, config, cancel, confirm } = useChangeLinkVariantModal();

const currentLinkVariant = computed<LinkVariant.VariantEnum | null>(
  () => config.value?.currentLinkVariant ?? null,
);
const linkVariants = computed<LinkVariantInfo[]>(
  () => config.value?.linkVariants ?? [],
);
const selectedLinkVariant = ref<LinkVariant.VariantEnum | null>(null);

type RadioValue = {
  id: LinkVariant.VariantEnum;
  text: string;
  subtext: string;
};

const toRadioValue = (
  variant: LinkVariantInfo | null | undefined,
): RadioValue | null => {
  const variantValue = variant?.variant?.variant;
  if (!variantValue) {
    return null;
  }

  const descriptionParts = [variant?.description, variant?.linkValidity].filter(
    (part): part is string => Boolean(part),
  );

  return {
    id: variantValue,
    text: variant?.title ?? variantValue,
    subtext: descriptionParts.join(" "),
  };
};

const radioValues = computed(() =>
  linkVariants.value
    .map(toRadioValue)
    .filter((value): value is RadioValue => value !== null),
);

const isConfirmDisabled = computed(() => {
  if (!selectedLinkVariant.value) {
    return true;
  }
  if (!radioValues.value.length) {
    return true;
  }
  if (
    currentLinkVariant.value &&
    selectedLinkVariant.value === currentLinkVariant.value
  ) {
    return true;
  }
  return false;
});

const onSelectionChange = (value: string) => {
  selectedLinkVariant.value = value as LinkVariant.VariantEnum;
};

const onConfirm = () => {
  if (!selectedLinkVariant.value) {
    return;
  }
  confirm(selectedLinkVariant.value);
};

watch(
  () => isActive.value,
  (active) => {
    if (!active) {
      selectedLinkVariant.value = null;
      return;
    }
    selectedLinkVariant.value =
      currentLinkVariant.value ?? radioValues.value[0]?.id ?? null;
  },
  { immediate: true },
);

watch(radioValues, (options) => {
  if (!options.length) {
    selectedLinkVariant.value = null;
    return;
  }
  if (
    !selectedLinkVariant.value ||
    !options.some((option) => option.id === selectedLinkVariant.value)
  ) {
    selectedLinkVariant.value = options[0].id;
  }
});
</script>

<template>
  <Modal
    v-show="isActive"
    :active="isActive"
    title="Change link type"
    style-type="info"
    class="modal"
    @cancel="cancel"
  >
    <template #notice>
      <RadioButtons
        v-if="radioValues.length"
        :possible-values="radioValues"
        :model-value="selectedLinkVariant ?? undefined"
        alignment="vertical"
        @update:model-value="onSelectionChange"
      />
    </template>
    <template #controls>
      <Button variant="outlined" label="Cancel" @click="cancel" />
      <Button label="Choose" :disabled="isConfirmDisabled" @click="onConfirm" />
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  & :deep(.notice) {
    overflow: hidden;

    /* workaround to have a transparent notice until it gets refactored to a single slot -> NXT-3131 */
    background-color: transparent !important;
    height: 100%;
  }
}
</style>
