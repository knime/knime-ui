<script setup lang="ts">
import { computed, ref } from "vue";

import Button from "webapps-common/ui/components/Button.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CheckIcon from "webapps-common/ui/assets/img/icons/check.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";

import type { WorkflowState } from "@/store/workflow";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import ProjectMetadataLastEdit from "./ProjectMetadataLastEdit.vue";
import MetadataDescription from "./MetadataDescription.vue";
import ProjectMetadataTags from "./ProjectMetadataTags.vue";

interface Props {
  workflow: WorkflowState["activeWorkflow"];
  isEditing: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "editStart"): void;
  (e: "editSave"): void;
  (e: "editCancel"): void;
}>();

const projectMetadata = computed(() => props.workflow.projectMetadata);
const description = computed(() => projectMetadata.value.description);
const lastEdit = computed(() => projectMetadata.value.lastEdit.toString());

const editedDescription = ref(description.value);
</script>

<template>
  <div class="header">
    <ProjectMetadataLastEdit :last-edit="lastEdit" />

    <div class="buttons">
      <Button v-if="!isEditing" compact primary @click="emit('editStart')">
        Edit metadata
      </Button>

      <FunctionButton v-if="isEditing" primary @click="emit('editSave')">
        <CheckIcon />
      </FunctionButton>

      <FunctionButton
        v-if="isEditing"
        class="cancel-edit-button"
        @click="emit('editCancel')"
      >
        <CloseIcon />
      </FunctionButton>
    </div>
  </div>

  <MetadataDescription
    :editable="isEditing"
    :description="description"
    @change="editedDescription = $event"
  />

  <ExternalResourcesList :links="projectMetadata.links" />

  <ProjectMetadataTags :tags="projectMetadata.tags" />
</template>

<style lang="postcss" scoped>
.header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;

  & .buttons {
    display: flex;
    gap: 4px;
    margin-left: auto;

    & .cancel-edit-button {
      --theme-button-function-background-color: white;
    }
  }
}
</style>
