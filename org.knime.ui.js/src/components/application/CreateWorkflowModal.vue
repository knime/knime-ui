<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { InputField, Label, useNameValidator } from "@knime/components";
import { KdsButton, KdsModal } from "@knime/kds-components";

import { getToastPresets } from "@/services/toastPresets";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";

const NAME_TEMPLATE = "KNIME_project";

const isSubmitted = ref(false);
const inputRef = ref<InstanceType<typeof InputField>>();
const workflowName = ref(NAME_TEMPLATE);

const spacesStore = useSpacesStore();
const { createWorkflowModalConfig } = storeToRefs(spacesStore);

const isCreateWorkflowModalOpen = computed(
  () => createWorkflowModalConfig.value.isOpen,
);

const { createWorkflow, openProject } = useSpaceOperationsStore();

const spaceCachingStore = useSpaceCachingStore();
const { getWorkflowGroupContent, projectPath } = storeToRefs(spaceCachingStore);

const activeSpace = computed(() =>
  getWorkflowGroupContent.value(
    spacesStore.createWorkflowModalConfig.projectId ?? "",
  ),
);
const existingWorkflowNames = computed<Array<string>>(() => {
  const items = activeSpace.value?.items ?? [];

  return items.map(({ name }) => name);
});

const { isValid, errorMessage, cleanedName } = useNameValidator({
  blacklistedNames: existingWorkflowNames,
  name: workflowName,
});

const closeModal = () => {
  if (isSubmitted.value) {
    return;
  }

  spacesStore.setCreateWorkflowModalConfig({
    isOpen: false,
    projectId: null,
  });
};

const onSubmit = async () => {
  if (isSubmitted.value) {
    return;
  }
  isSubmitted.value = true;
  try {
    const { projectId } = spacesStore.createWorkflowModalConfig;

    if (!projectId) {
      consola.error("project id not found. cannot create workflow");
      return;
    }

    const { spaceProviderId, spaceId } = projectPath.value[projectId];

    const { id: itemId } = await createWorkflow({
      projectId,
      workflowName: cleanedName.value,
    });

    isSubmitted.value = false;
    closeModal();

    await openProject({
      providerId: spaceProviderId,
      spaceId,
      itemId,
    });
  } catch (error) {
    isSubmitted.value = false;
    consola.error("There was an error creating the workflow", error);
    closeModal();
    const { toastPresets } = getToastPresets();
    toastPresets.spaces.crud.createWorkflowFailed({ error });
  }
};

const onkeyup = async (keyupEvent: KeyboardEvent) => {
  if (keyupEvent.key === "Enter" && isValid.value) {
    await onSubmit();
  }
};

const setNameSuggestion = () => {
  const isNameInUse = (value: string) =>
    existingWorkflowNames.value.some((name) => name === value);

  if (!isNameInUse(NAME_TEMPLATE)) {
    workflowName.value = NAME_TEMPLATE;
    return;
  }

  let counter = 1;
  while (isNameInUse(`${NAME_TEMPLATE}${counter}`)) {
    counter++;
  }

  workflowName.value = `${NAME_TEMPLATE}${counter}`;
};

watch(
  isCreateWorkflowModalOpen,
  () => {
    if (isCreateWorkflowModalOpen.value) {
      setNameSuggestion();
      setTimeout(() => {
        const inputElement = inputRef.value?.$refs?.input as HTMLInputElement;
        inputElement?.setSelectionRange(0, workflowName.value.length);
        inputElement?.focus();
        // eslint-disable-next-line no-magic-numbers
      }, 200);
    }
  },
  { immediate: true },
);
</script>

<template>
  <KdsModal
    :active="isCreateWorkflowModalOpen"
    title="Create a new workflow"
    width="large"
    @close="closeModal"
  >
    <template #body>
      <Label text="Workflow name">
        <div>
          <InputField
            id="workflow-input"
            ref="inputRef"
            v-model="workflowName"
            type="text"
            title="Workflow name"
            :disabled="isSubmitted"
            :is-valid="isValid || isSubmitted"
            aria-label="Workflow name"
            @keyup="onkeyup"
          />
          <div v-if="!isValid && !isSubmitted" class="item-error">
            <span>{{ errorMessage }}</span>
          </div>
        </div>
      </Label>
    </template>
    <template #footer>
      <KdsButton
        variant="transparent"
        :disabled="isSubmitted"
        label="Cancel"
        @click="closeModal"
      />
      <KdsButton
        label="Create"
        variant="filled"
        :disabled="!isValid || isSubmitted"
        @click="onSubmit"
      />
    </template>
  </KdsModal>
</template>

<style lang="postcss" scoped>
.item-error {
  font-size: 12px;
  font-weight: 400;
  color: var(--theme-color-error);
  margin-top: 7px;
  white-space: normal;
}
</style>
