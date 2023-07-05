<script setup lang="ts">
import { computed, reactive, ref, toRaw } from "vue";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CheckIcon from "webapps-common/ui/assets/img/icons/check.svg";
import PencilIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";

import { TypedText, type Link } from "@/api/gateway-api/generated-api";
import type { WorkflowState } from "@/store/workflow";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";

import ProjectMetadataLastEdit from "./ProjectMetadataLastEdit.vue";
import MetadataDescription from "./MetadataDescription.vue";
import ProjectMetadataTags from "./ProjectMetadataTags.vue";

interface Props {
  workflow: WorkflowState["activeWorkflow"];
  isEditing: boolean;
}

const props = defineProps<Props>();

type SaveEventPayload = {
  description: TypedText;
  links: Array<Link>;
  tags: Array<string>;
};

const emit = defineEmits<{
  (e: "editStart"): void;
  (e: "editSave", payload: SaveEventPayload): void;
  (e: "editCancel"): void;
}>();

const projectMetadata = computed(() => props.workflow.projectMetadata);
const description = computed(() => {
  const isPlainText =
    projectMetadata.value.description.contentType ===
    TypedText.ContentTypeEnum.Plain;

  return isPlainText
    ? recreateLinebreaks(projectMetadata.value.description.value)
    : projectMetadata.value.description.value;
});
const lastEdit = computed(() => projectMetadata.value.lastEdit.toString());

const isValid = ref(true);
const hasEdited = ref(false);

const editedState = reactive({
  description: description.value,
  links: structuredClone(toRaw(projectMetadata.value.links || [])),
  tags: structuredClone(toRaw(projectMetadata.value.tags || [])),
});

const hasChangedDescription = computed(() => {
  return editedState.description !== `<p>${description.value.trim()}</p>`;
});

const setEditedState = <K extends keyof typeof editedState>(
  key: K,
  value: (typeof editedState)[K]
) => {
  editedState[key] = value;
  hasEdited.value = key !== "description" || hasChangedDescription.value;
};

const onSave = () => {
  const payload: SaveEventPayload = hasEdited.value
    ? {
        ...editedState,
        description: {
          contentType: TypedText.ContentTypeEnum.Html,
          value: editedState.description,
        },
      }
    : {
        links: projectMetadata.value.links,
        tags: projectMetadata.value.tags,
        description: {
          contentType: TypedText.ContentTypeEnum.Plain,
          value: description.value,
        },
      };

  hasEdited.value = false;
  emit("editSave", payload);
};

const onCancel = () => {
  editedState.description = description.value;
  editedState.links = projectMetadata.value.links ?? [];
  editedState.tags = projectMetadata.value.tags ?? [];

  hasEdited.value = false;
  emit("editCancel");
};
</script>

<template>
  <div class="header">
    <ProjectMetadataLastEdit :last-edit="lastEdit" />

    <div class="buttons">
      <FunctionButton
        v-if="!isEditing"
        title="Edit metadata"
        @click="emit('editStart')"
      >
        <PencilIcon />
      </FunctionButton>

      <FunctionButton
        v-if="isEditing"
        :disabled="!isValid"
        primary
        @click="onSave"
      >
        <CheckIcon />
      </FunctionButton>

      <FunctionButton
        v-if="isEditing"
        class="cancel-edit-button"
        @click="onCancel"
      >
        <CloseIcon />
      </FunctionButton>
    </div>
  </div>

  <MetadataDescription
    :model-value="editedState.description"
    :editable="isEditing"
    @update:model-value="setEditedState('description', $event)"
  />

  <ExternalResourcesList
    :model-value="editedState.links"
    :editable="isEditing"
    @valid="isValid = $event"
    @update:model-value="setEditedState('links', $event)"
  />

  <ProjectMetadataTags
    :editable="isEditing"
    :model-value="editedState.tags"
    @update:model-value="setEditedState('tags', $event)"
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
