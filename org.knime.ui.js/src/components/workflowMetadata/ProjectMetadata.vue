<script setup lang="ts">
import { computed, ref, toRaw, toRef, toRefs, type Ref } from "vue";

import { API } from "@api";
import {
  TypedText,
  type Link,
  type ProjectMetadata,
} from "@/api/gateway-api/generated-api";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { isDesktop } from "@/environment";

import MetadataLastEdit from "./MetadataLastEdit.vue";
import MetadataDescription from "./MetadataDescription.vue";
import MetadataTags from "./MetadataTags.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";
import { useDraft } from "./useDraft";
import { useSaveMetadata } from "./useSaveMetadata";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";

interface Props {
  projectMetadata: ProjectMetadata;
  projectId: string;
  workflowId: string;
  isWorkflowWritable: boolean;
  singleMetanodeSelectedId: string | null;
}

const props = defineProps<Props>();

const { projectMetadata } = toRefs(props);

const lastEdit = computed(() => projectMetadata.value.lastEdit?.toString());

const getInitialDraftData = () => {
  return projectMetadata.value
    ? {
        description: projectMetadata.value.description?.value ?? "",
        links: structuredClone(toRaw(projectMetadata.value.links || [])),
        tags: structuredClone(toRaw(projectMetadata.value.tags || [])),
      }
    : { description: "", links: [], tags: [] };
};

export type MetadataDraftData = {
  description: string;
  links: Link[];
  tags: string[];
};

const {
  metadataDraft,
  resetDraft,
  isEditing,
  isValid,
  startEdit,
  cancelEdit,
  getMetadataFieldValue,
  updateMetadataField,
} = useDraft<MetadataDraftData>({
  createNewDraft: () => ({
    isEditing: false,
    isValid: true,
    hasEdited: false,
    data: getInitialDraftData(),
  }),
});

const canOpenWorkflowConfiguration = computed(
  () => isDesktop && props.isWorkflowWritable,
);

export type SaveEventPayload = {
  projectId: string;
  workflowId: string;
  description: TypedText;
  links: Array<Link>;
  tags: Array<string>;
};

const emit = defineEmits<{
  (e: "save", payload: SaveEventPayload): void;
}>();

const onValidChange = (isValid: boolean) => {
  metadataDraft.value.isValid = isValid;
};

const openWorkflowConfiguration = () => {
  API.desktop.openWorkflowConfiguration(props.projectId);
};

const wrapper = ref<HTMLElement>();

const { saveContent } = useSaveMetadata({
  metadataDraft,
  originalData: toRef(props, "projectMetadata"),
  metadataWrapperElement: wrapper as Ref<HTMLElement>,
  triggerSave: () => {
    emit("save", {
      projectId: props.projectId,
      workflowId: props.workflowId,
      links: metadataDraft.value.data.links,
      tags: metadataDraft.value.data.tags,
      description: {
        value: metadataDraft.value.data.description,
        contentType: TypedText.ContentTypeEnum.Html,
      },
    });
  },
  resetDraft,
  cancelEdit,
  singleMetanodeSelectedId: toRef(props, "singleMetanodeSelectedId"),
});

const preserveWhitespaceBeforeEdit = () => {
  if (
    projectMetadata.value.description?.contentType ===
    TypedText.ContentTypeEnum.Plain
  ) {
    metadataDraft.value.data.description = recreateLinebreaks(
      projectMetadata.value.description?.value ?? "",
    );
  }

  startEdit();
};
</script>

<template>
  <div ref="wrapper">
    <div class="header">
      <MetadataLastEdit :last-edit="lastEdit" />
      <MetadataHeaderButtons
        v-if="isWorkflowWritable"
        :is-editing="isEditing"
        :is-valid="isValid"
        :can-open-workflow-configuration="canOpenWorkflowConfiguration"
        @start-edit="preserveWhitespaceBeforeEdit"
        @save="saveContent()"
        @cancel-edit="cancelEdit"
        @open-workflow-configuration="openWorkflowConfiguration"
      />
    </div>

    <MetadataDescription
      :original-description="projectMetadata.description?.value ?? ''"
      :model-value="getMetadataFieldValue('description')"
      :editable="isEditing"
      :is-legacy="
        projectMetadata.description?.contentType ===
        TypedText.ContentTypeEnum.Plain
      "
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
  </div>
</template>

<style lang="postcss" scoped>
.header {
  display: flex;
  position: sticky;
  align-items: center;
  margin-bottom: 12px;
}
</style>
