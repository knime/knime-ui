<script setup lang="ts">
import { computed, ref } from "vue";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CheckIcon from "webapps-common/ui/assets/img/icons/check.svg";
import PencilIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";

import type { Link } from "@/api/gateway-api/generated-api";
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
  (
    e: "editSave",
    payload: {
      description: string;
      links: Array<Link>;
      tags: Array<string>;
    }
  ): void;
  (e: "editCancel"): void;
}>();

const projectMetadata = computed(() => props.workflow.projectMetadata);
const description = computed(() => projectMetadata.value.description);
const lastEdit = computed(() => projectMetadata.value.lastEdit.toString());

const isValid = ref(true);
const editedDescription = ref(description.value || "");
const editedLinks = ref<Array<Link>>(projectMetadata.value.links || []);
const editedTags = ref(projectMetadata.value.tags || []);

const emitSave = () => {
  emit("editSave", {
    description: editedDescription.value,
    links: editedLinks.value,
    tags: editedTags.value,
  });
};
</script>

<template>
  <div class="header">
    <ProjectMetadataLastEdit :last-edit="lastEdit" />

    <div class="buttons">
      <FunctionButton
        v-if="!isEditing"
        :disabled="!isValid"
        title="Edit metadata"
        @click="emit('editStart')"
      >
        <PencilIcon />
      </FunctionButton>

      <FunctionButton
        v-if="isEditing"
        :disabled="!isValid"
        primary
        @click="emitSave"
      >
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

  <ExternalResourcesList
    :editable="isEditing"
    :links="projectMetadata.links"
    @change="editedLinks = $event"
    @valid="isValid = $event"
  />

  <ProjectMetadataTags
    :editable="isEditing"
    :tags="projectMetadata.tags"
    @change="editedTags = $event"
  />
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
