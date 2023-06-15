<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import Button from "webapps-common/ui/components/Button.vue";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import Label from "webapps-common/ui/components/forms/Label.vue";

import { useWorkflowNameValidator } from "@/composables/useWorkflowNameValidator";

const NAME_TEMPLATE = "KNIME_project";

const store = useStore();

const inputRef = ref<InstanceType<typeof InputField>>(null);
const workflowName = ref(NAME_TEMPLATE);

const isCreateWorkflowModalOpen = computed(
  () => store.state.spaces.createWorkflowModalConfig.isOpen
);

const activeSpace = computed(() =>
  store.getters["spaces/getWorkflowGroupContent"](
    store.state.spaces.createWorkflowModalConfig.projectId
  )
);
const existingWorkflowNames = computed<Array<string>>(() => {
  const items = activeSpace.value.items ?? [];

  return items.map(({ name }) => name);
});

const { isValid, errorMessage, cleanName } = useWorkflowNameValidator({
  blacklistedNames: existingWorkflowNames,
  name: workflowName,
});

const closeModal = () => {
  store.commit("spaces/setCreateWorkflowModalConfig", {
    isOpen: false,
    projectId: null,
  });
};

const onSubmit = () => {
  try {
    // do not wait to finish this action, it takes time and will update the state of the validation (showing an error)
    store.dispatch("spaces/createWorkflow", {
      projectId: store.state.spaces.createWorkflowModalConfig.projectId,
      workflowName: cleanName(workflowName.value),
    });

    closeModal();
  } catch (error) {
    consola.log("There was an error creating the workflow", error);
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
  { immediate: true }
);
</script>

<template>
  <Modal
    v-show="isCreateWorkflowModalOpen"
    ref="modalRef"
    :active="isCreateWorkflowModalOpen"
    title="Create a new workflow"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #confirmation>
      <Label text="Workflow name">
        <div>
          <InputField
            ref="inputRef"
            v-model="workflowName"
            type="text"
            title="Workflow name"
            :is-valid="isValid"
            @keyup="onkeyup"
          />
          <div v-if="!isValid" class="item-error">
            <span>{{ errorMessage }}</span>
          </div>
        </div>
      </Label>
    </template>
    <template #controls>
      <Button with-border @click="closeModal">
        <strong>Cancel</strong>
      </Button>
      <Button primary :disabled="!isValid" @click="onSubmit">
        <strong>Create</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 400px;
}

.item-error {
  font-size: 12px;
  font-weight: 400;
  color: var(--theme-color-error);
  margin-top: 7px;
  white-space: normal;
}
</style>
