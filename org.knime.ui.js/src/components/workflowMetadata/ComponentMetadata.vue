<script setup lang="ts">
import { computed, reactive, toRaw, watch } from "vue";

import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import type {
  AvailablePortTypes,
  ComponentMetadata,
  Workflow,
} from "@/api/custom-types";

import { toExtendedPortObject } from "@/util/portDataMapper";

import MetadataDescription from "./MetadataDescription.vue";
import ComponentMetadataNodeFeatures from "./ComponentMetadataNodeFeatures.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";
import MetadataTags from "./MetadataTags.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import type { Link, TypedText } from "@/api/gateway-api/generated-api";
import type { NodeFeatures } from "./ComponentMetadataNodeFeatures.vue";
import { ComponentNodeAndDescription } from "@/api/gateway-api/generated-api";

interface Props {
  workflow: Workflow;
  availablePortTypes: AvailablePortTypes;
}

const props = defineProps<Props>();

const componentMetadata = computed<ComponentMetadata>(
  () => props.workflow.componentMetadata,
);

const currentProjectId = computed(() => props.workflow.projectId);
const currentWorkflowId = computed(() => props.workflow.info.containerId);

// node icon preview
const nodePreview = computed(() => {
  const { inPorts = [], outPorts = [], type, icon } = componentMetadata.value;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    icon,
    type,
    isComponent: true,
    hasDynPorts: false,
  };
});

const nodeFeatures = computed(() => {
  const {
    inPorts = [],
    outPorts = [],
    options,
    views,
  } = componentMetadata.value;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    views,
    options,
  };
});

const ID_SEPARATOR = "#@#";

type MetadataDraft = {
  isEditing: boolean;
  isValid: boolean;
  hasEdited: boolean;
  data: {
    description: string;
    links: Link[];
    tags: string[];
    nodeFeatures: NodeFeatures;
    icon: string; // base64 url-encoded
    type: ComponentNodeAndDescription.TypeEnum;
  };
};

const currentDraftID = computed(
  () => `${currentProjectId.value}${ID_SEPARATOR}${currentWorkflowId.value}`,
);

const metadataDrafts = reactive<Record<string, MetadataDraft>>({});

const isEditing = computed(
  () => metadataDrafts[currentDraftID.value].isEditing,
);

const getInitialDraftData = () => {
  return {
    description: componentMetadata.value.description,
    links: structuredClone(toRaw(componentMetadata.value.links || [])),
    tags: structuredClone(toRaw(componentMetadata.value.tags || [])),
    nodeFeatures: nodeFeatures.value,
    icon: componentMetadata.value.icon,
    type: componentMetadata.value.type,
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
  nodeFeatures: NodeFeatures;
  icon: string; // base64 url-encoded
  type: ComponentNodeAndDescription.TypeEnum;
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
    nodeFeatures: draft.data.nodeFeatures,
    icon: draft.data.icon,
    type: draft.data.type,
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
      "You are still editing the Component metadata, do you want to save your changes?",
    );

    if (result) {
      onSave(prev);
    } else {
      createNewDraft(prev);
    }
  }
});

watch(
  componentMetadata,
  () => {
    if (!componentMetadata.value) {
      return;
    }

    createNewDraft(currentDraftID.value);
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="header">
    <h2 class="component-name">
      <span class="node-preview">
        <NodePreview v-bind="nodePreview" />
      </span>

      <span class="component-title" :title="componentMetadata.name">{{
        componentMetadata.name
      }}</span>
    </h2>
    <!-- <MetadataLastEdit :last-edit="lastEdit" /> -->
    <MetadataHeaderButtons
      :is-editing="isEditing"
      :is-valid="isValid"
      @start-edit="onStartEdit"
      @save="onSave(currentDraftID)"
      @cancel-edit="onCancelEdit"
    />
  </div>

  <MetadataDescription
    :original-description="componentMetadata.description"
    :model-value="getMetadataFieldValue('description')"
    :editable="isEditing"
    @update:model-value="updateMetadataField('description', $event)"
  />

  <!-- Type and Icon -->

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

  <ComponentMetadataNodeFeatures
    :model-value="nodeFeatures"
    :editable="isEditing"
    @update:model-value="updateMetadataField('nodeFeatures', $event)"
  />
</template>

<style lang="postcss" scoped>
.header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px; /* TODO: NXT-1164 maybe make line height smaller */
}

.component-name {
  display: flex;
  align-items: center;

  & .component-title {
    text-overflow: ellipsis;
    overflow-wrap: initial;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
  }

  & .node-preview {
    display: block;
    height: 80px;
    width: 80px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
  }
}
</style>
