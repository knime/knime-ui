<script setup lang="ts">
import { computed, reactive, toRaw, watch } from "vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import type { AvailablePortTypes, ComponentMetadata } from "@/api/custom-types";

import { toExtendedPortObject } from "@/util/portDataMapper";

import MetadataDescription from "./MetadataDescription.vue";
import ComponentMetadataNodeFeatures from "./ComponentMetadataNodeFeatures.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";
import MetadataTags from "./MetadataTags.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import { TypedText } from "@/api/gateway-api/generated-api";

import type {
  Link,
  ComponentNodeAndDescription,
  ComponentPortDescription,
} from "@/api/gateway-api/generated-api";
import ComponentTypeEditor from "@/components/workflowMetadata/ComponentTypeEditor.vue";
import ComponentIconEditor from "@/components/workflowMetadata/ComponentIconEditor.vue";
import { useStore } from "@/composables/useStore";

interface Props {
  componentMetadata: ComponentMetadata;
  projectId: string;
  componentId: string; // this is the same as the workflowId if the component is "open"
  availablePortTypes: AvailablePortTypes;
}

const props = defineProps<Props>();

const componentMetadata = computed<ComponentMetadata>(
  () => props.componentMetadata,
);

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
    inPorts: Array<ComponentPortDescription>;
    outPorts: Array<ComponentPortDescription>;
    icon: string; // base64 url-encoded
    type: ComponentNodeAndDescription.TypeEnum | string;
  };
};

const currentDraftID = computed(
  () => `${props.projectId}${ID_SEPARATOR}${props.componentId}`,
);

const metadataDrafts = reactive<Record<string, MetadataDraft>>({});

const isEditing = computed(
  () => metadataDrafts[currentDraftID.value].isEditing,
);

const getInitialDraftData = () => {
  const inPorts = (nodeFeatures.value.inPorts || []).map((port) => ({
    name: port.name,
    description: port.description,
  }));

  const outPorts = (nodeFeatures.value.outPorts || []).map((port) => ({
    name: port.name,
    description: port.description,
  }));

  return {
    description: componentMetadata.value.description.value,
    links: structuredClone(toRaw(componentMetadata.value.links || [])),
    tags: structuredClone(toRaw(componentMetadata.value.tags || [])),
    inPorts,
    outPorts,
    icon: componentMetadata.value.icon || "",
    type: componentMetadata.value.type || "Component",
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
  inPorts: Array<ComponentPortDescription>;
  outPorts: Array<ComponentPortDescription>;
  icon: string; // base64 url-encoded
  type: ComponentNodeAndDescription.TypeEnum | string;
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

const icon = computed(() => getMetadataFieldValue("icon"));

// node icon preview
const nodePreview = computed(() => {
  const { inPorts = [], outPorts = [] } = componentMetadata.value;

  // use data that might be changed due to the edit process
  const type = getMetadataFieldValue("type");
  const icon = getMetadataFieldValue("icon") || null;

  return {
    inPorts: inPorts.map(toPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toPortObject(props.availablePortTypes)),
    icon,
    type,
    isComponent: true,
    hasDynPorts: false,
  };
});

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
    inPorts: draft.data.inPorts,
    outPorts: draft.data.outPorts,
    icon: draft.data.icon || null,
    type: draft.data.type,
  });
};

const store = useStore();
const componentTypes = computed(
  () => store.state.application.availableComponentTypes,
);

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
    :original-description="componentMetadata.description.value"
    :model-value="getMetadataFieldValue('description')"
    :editable="isEditing"
    @update:model-value="updateMetadataField('description', $event)"
  />

  <!-- Type and Icon -->
  <template v-if="isEditing">
    <h2 class="section form">Type and icon</h2>
    <ComponentIconEditor
      :model-value="icon"
      @update:model-value="updateMetadataField('icon', $event)"
    />
    <ComponentTypeEditor
      :component-types="componentTypes"
      :model-value="getMetadataFieldValue('type')"
      @update:model-value="updateMetadataField('type', $event)"
    />
  </template>

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
    :node-features="nodeFeatures"
    :in-ports="getMetadataFieldValue('inPorts')"
    :out-ports="getMetadataFieldValue('outPorts')"
    :editable="isEditing"
    @update:in-ports="updateMetadataField('inPorts', $event)"
    @update:out-ports="updateMetadataField('outPorts', $event)"
  />
</template>

<style lang="postcss" scoped>
.header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  & .component-name {
    display: flex;
    align-items: center;

    &:is(h2) {
      margin: 0;
    }

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
}
</style>
