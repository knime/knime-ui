<script setup lang="ts">
import { computed, reactive, ref } from "vue";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CheckIcon from "webapps-common/ui/assets/img/icons/check.svg";
import PencilIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";

import { TypedText, type Link } from "@/api/gateway-api/generated-api";
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
const description = computed(() => projectMetadata.value.description.value);
const lastEdit = computed(() => projectMetadata.value.lastEdit.toString());

const isValid = ref(true);
const hasEdited = ref(false);

const editedState = reactive({
  description: description.value,
  links: projectMetadata.value.links || [],
  tags: projectMetadata.value.tags || [],
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

const emitSave = () => {
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

  emit("editSave", payload);
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
    @change="setEditedState('description', $event)"
  />

  <ExternalResourcesList
    :editable="isEditing"
    :links="projectMetadata.links"
    @valid="isValid = $event"
    @change="setEditedState('links', $event)"
  />

  <ProjectMetadataTags
    :editable="isEditing"
    :tags="projectMetadata.tags"
    @change="setEditedState('tags', $event)"
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
