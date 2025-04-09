<script setup lang="ts">
import { computed, ref, toRaw, toRef, toRefs } from "vue";
import { API } from "@api";

import {
  type Link,
  type ProjectMetadata,
  TypedText,
} from "@/api/gateway-api/generated-api";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";

import MetadataDescription from "./MetadataDescription.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";
import MetadataLastEdit from "./MetadataLastEdit.vue";
import MetadataTags from "./MetadataTags.vue";
import { useDraft } from "./useDraft";
import { useSaveMetadata } from "./useSaveMetadata";

interface Props {
  projectMetadata: ProjectMetadata;
  projectId: string;
  workflowId: string;
  singleMetanodeSelectedId: string | null;
  canOpenWorkflowConfiguration: boolean;
  canEdit: boolean;
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

const wrapper = ref<InstanceType<typeof SidebarPanelLayout>>();
const wrapperElement = computed<HTMLDivElement | undefined>(
  () => wrapper.value?.$el,
);

const { saveContent } = useSaveMetadata({
  metadataDraft,
  originalData: toRef(props, "projectMetadata"),
  metadataWrapperElement: wrapperElement,
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
  <SidebarPanelLayout
    ref="wrapper"
    class="project-metadata"
    data-test-id="project-metadata"
  >
    <template #header>
      <MetadataLastEdit :last-edit="lastEdit" />
      <MetadataHeaderButtons
        v-if="canEdit"
        :is-editing="isEditing"
        :is-valid="isValid"
        :can-open-workflow-configuration="canOpenWorkflowConfiguration"
        @start-edit="preserveWhitespaceBeforeEdit"
        @save="saveContent()"
        @cancel-edit="cancelEdit"
        @open-workflow-configuration="openWorkflowConfiguration"
      />
    </template>
    <SidebarPanelScrollContainer>
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
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>
