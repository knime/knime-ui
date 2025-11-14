<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { Modal, RadioButtons } from "@knime/components";
import { Button } from "@knime/kds-components";

import type { LinkType } from "@/api/gateway-api/generated-api";
import {
  buildLinkTypeOptions,
  toLinkType,
} from "@/components/common/linkTypeOptions";
import { useChangeLinkTypeModal } from "@/composables/useChangeLinkTypeModal";

const { isActive, config, cancel, confirm } = useChangeLinkTypeModal();

const sourceSpaceId = computed(() => config.value?.sourceSpaceId ?? null);
const selectedSpaceId = computed(
  () => config.value?.selectedSpaceId ?? config.value?.sourceSpaceId ?? null,
);
const currentLinkType = computed<LinkType | null>(
  () => config.value?.currentLinkType ?? null,
);
computed(() => config.value?.currentLinkUrl ?? null);
const selectedLinkType = ref<LinkType.TypeEnum | null>(null);

const linkTypeOptions = computed(() =>
  buildLinkTypeOptions({
    sourceSpaceId: sourceSpaceId.value ?? undefined,
    selectedSpaceId: selectedSpaceId.value ?? undefined,
  }),
);

const radioValues = computed(() =>
  linkTypeOptions.value.map((option) => ({
    id: option.id,
    text: option.text,
    subtext: `${option.description} ${option.linkValidity}`,
  })),
);

const optionTextById = computed<Record<string, string>>(() =>
  Object.fromEntries(
    linkTypeOptions.value.map((option) => [option.id, option.text]),
  ),
);
computed(() => {
  if (!currentLinkType.value) {
    return "Not linked";
  }
  return (
    optionTextById.value[currentLinkType.value.type] ??
    currentLinkType.value.type
      .toLowerCase()
      .split("_")
      .map((segment) =>
        segment.length ? segment[0].toUpperCase() + segment.slice(1) : segment,
      )
      .join(" ")
  );
});
const isConfirmDisabled = computed(() => {
  if (!selectedLinkType.value) {
    return true;
  }
  if (!linkTypeOptions.value.length) {
    return true;
  }
  if (
    currentLinkType.value &&
    selectedLinkType.value === currentLinkType.value.type
  ) {
    return true;
  }
  return false;
});

const onSelectionChange = (value: string) => {
  selectedLinkType.value = value as LinkType.TypeEnum;
};

const onConfirm = () => {
  if (!selectedLinkType.value) {
    return;
  }
  confirm(toLinkType(selectedLinkType.value));
};

watch(
  () => isActive.value,
  (active) => {
    if (!active) {
      selectedLinkType.value = null;
      return;
    }
    selectedLinkType.value =
      currentLinkType.value?.type ??
      (linkTypeOptions.value[0]?.id as LinkType.TypeEnum | undefined) ??
      null;
  },
  { immediate: true },
);

watch(linkTypeOptions, (options) => {
  if (!options.length) {
    selectedLinkType.value = null;
    return;
  }
  if (
    !selectedLinkType.value ||
    !options.some((option) => option.id === selectedLinkType.value)
  ) {
    selectedLinkType.value = options[0].id as LinkType.TypeEnum;
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
        :model-value="selectedLinkType ?? undefined"
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
