<script setup lang="ts">
import { computed, reactive, toRaw, watch } from "vue";
import { useStore } from "vuex";

import { TypedText, type Link } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import MetadataLastEdit from "./MetadataLastEdit.vue";
import MetadataDescription from "./MetadataDescription.vue";
import MetadataTags from "./MetadataTags.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";

const ID_SEPARATOR = "#@#";

type MetadataDraft = {
  isEditing: boolean;
  isValid: boolean;
  hasEdited: boolean;
  data: {
    description: string;
    links: Link[];
    tags: string[];
  };
};

const store = useStore<RootStoreState>();
const workflow = computed(() => store.state.workflow.activeWorkflow);
const projectMetadata = computed(() => workflow.value.projectMetadata);
const currentProjectId = computed(() => workflow.value.projectId);
const currentWorkflowId = computed(() => workflow.value.info.containerId);
const lastEdit = computed(() => projectMetadata.value.lastEdit.toString());

const currentDraftID = computed(
  () => `${currentProjectId.value}${ID_SEPARATOR}${currentWorkflowId.value}`,
);

const metadataDrafts = reactive<Record<string, MetadataDraft>>({});

const isEditing = computed(
  () => metadataDrafts[currentDraftID.value].isEditing,
);

const isWorkflowWritable = computed(() => store.getters["workflow/isWritable"]);

const getInitialDraftData = () => {
  return projectMetadata.value
    ? {
        description: projectMetadata.value.description.value,
        links: structuredClone(toRaw(projectMetadata.value.links || [])),
        tags: structuredClone(toRaw(projectMetadata.value.tags || [])),
      }
    : {
        description: "",
        links: [],
        tags: [],
      };
};

const createNewDraft = (draftId: string) => {
  metadataDrafts[draftId] = {
    isEditing: false,
    isValid: true,
    hasEdited: false,
    data: getInitialDraftData(),
  };
};

type SaveEventPayload = {
  projectId: string;
  workflowId: string;
  description: TypedText;
  links: Array<Link>;
  tags: Array<string>;
};

const emit = defineEmits<{
  (e: "save", payload: SaveEventPayload): void;
}>();

const isValid = computed(() => metadataDrafts[currentDraftID.value].isValid);

const onValidChange = (isValid: boolean) => {
  metadataDrafts[currentDraftID.value].isValid = isValid;
};

const onStartEdit = () => {
  metadataDrafts[currentDraftID.value].isEditing = true;
};

const onCancelEdit = () => {
  createNewDraft(currentDraftID.value);
};

const getMetadataFieldValue = <K extends keyof MetadataDraft["data"]>(
  fieldName: K,
) => {
  return metadataDrafts[currentDraftID.value].data[fieldName];
};

const updateMetadataField = <K extends keyof MetadataDraft["data"]>(
  fieldName: K,
  value: MetadataDraft["data"][K],
) => {
  metadataDrafts[currentDraftID.value].data[fieldName] = value;
  metadataDrafts[currentDraftID.value].hasEdited = true;
};

const onSave = (draftId: string) => {
  const draft = metadataDrafts[draftId];

  const [projectId, workflowId] = draftId.split(ID_SEPARATOR);

  if (!draft.hasEdited) {
    onCancelEdit();
    return;
  }

  draft.isEditing = false;
  draft.hasEdited = false;

  emit("save", {
    projectId,
    workflowId,
    links: draft.data.links,
    tags: draft.data.tags,
    description: {
      value: draft.data.description,
      contentType: TypedText.ContentTypeEnum.Plain,
    },
  });
};

watch(currentDraftID, (_, prev) => {
  if (
    metadataDrafts[prev] &&
    metadataDrafts[prev].isEditing &&
    metadataDrafts[prev].hasEdited &&
    metadataDrafts[prev].isValid
  ) {
    const result = window.confirm(
      "You are still editing the Workflow metadata, do you want to save your changes?",
    );

    if (result) {
      onSave(prev);
    } else {
      createNewDraft(prev);
    }
  }
});

watch(
  projectMetadata,
  () => {
    if (!projectMetadata.value) {
      return;
    }

    createNewDraft(currentDraftID.value);
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="header">
    <MetadataLastEdit :last-edit="lastEdit" />
    <MetadataHeaderButtons
      v-if="isWorkflowWritable"
      :is-editing="isEditing"
      :is-valid="isValid"
      @start-edit="onStartEdit"
      @save="onSave(currentDraftID)"
      @cancel-edit="onCancelEdit"
    />
  </div>

  <MetadataDescription
    :original-description="projectMetadata.description.value"
    :model-value="getMetadataFieldValue('description')"
    :editable="isEditing"
    @update:model-value="updateMetadataField('description', $event)"
  />

  <ExternalResourcesList
    :model-value="getMetadataFieldValue('links')"
    :editable="isEditing"
    @update:model-value="updateMetadataField('links', $event)"
    @valid="onValidChange"
  />

  <MetadataTags
    :editable="isEditing"
    :model-value="getMetadataFieldValue('tags')"
    @update:model-value="updateMetadataField('tags', $event)"
  />
</template>

<style lang="postcss" scoped>
.header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
</style>
