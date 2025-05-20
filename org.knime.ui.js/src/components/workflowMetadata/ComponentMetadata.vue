<script setup lang="ts">
import { computed, ref, toRaw, toRef } from "vue";

import { NodePreview } from "@knime/components";

import type { AvailablePortTypes, ComponentMetadata } from "@/api/custom-types";
import {
  type ComponentNodeAndDescription,
  type ComponentPortDescription,
  type Link,
  TypedText,
  UpdateComponentMetadataCommand,
} from "@/api/gateway-api/generated-api";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import ComponentIconEditor from "@/components/workflowMetadata/ComponentIconEditor.vue";
import ComponentTypeEditor from "@/components/workflowMetadata/ComponentTypeEditor.vue";
import { toExtendedPortObject } from "@/util/portDataMapper";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";
import { sanitizeHTML } from "@/util/sanitization";
import SidebarPanelLayout from "../common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "../common/side-panel/SidebarPanelScrollContainer.vue";
import SidebarPanelSubHeading from "../common/side-panel/SidebarPanelSubHeading.vue";

import ComponentMetadataNodeFeatures from "./ComponentMetadataNodeFeatures.vue";
import MetadataDescription from "./MetadataDescription.vue";
import MetadataHeaderButtons from "./MetadataHeaderButtons.vue";
import MetadataTags from "./MetadataTags.vue";
import { useDraft } from "./useDraft";
import { useSaveMetadata } from "./useSaveMetadata";

interface Props {
  componentMetadata: ComponentMetadata;
  projectId: string;
  componentId: string; // this is the same as the workflowId if the component is "open"
  availablePortTypes: AvailablePortTypes;
  availableComponentTypes: string[];
  isWorkflowWritable: boolean;
  singleMetanodeSelectedId: string | null;
}

const props = defineProps<Props>();

const componentMetadata = computed<ComponentMetadata>(
  () => props.componentMetadata,
);

const nodeFeatures = computed(() => {
  const {
    inPorts = [],
    outPorts = [],
    options = [],
    views = [],
  } = componentMetadata.value;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    views,
    options,
  };
});

export type MetadataDraftData = {
  description: string;
  links: Link[];
  tags: string[];
  inPorts: Array<ComponentPortDescription>;
  outPorts: Array<ComponentPortDescription>;
  icon: string | null; // base64 url-encoded
  type: ComponentNodeAndDescription.TypeEnum | string | null;
};

const getInitialDraftData = () => {
  const inPorts = (nodeFeatures.value.inPorts || []).map((port) => ({
    name: port.name,
    description: sanitizeHTML(port.description),
  }));

  const outPorts = (nodeFeatures.value.outPorts || []).map((port) => ({
    name: port.name,
    description: sanitizeHTML(port.description),
  }));

  return {
    description: componentMetadata.value.description?.value ?? "",
    links: structuredClone(toRaw(componentMetadata.value.links || [])),
    tags: structuredClone(toRaw(componentMetadata.value.tags || [])),
    inPorts,
    outPorts,
    icon: componentMetadata.value.icon || "",
    type: componentMetadata.value.type || null,
  };
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
  createNewDraft: () => {
    return {
      isEditing: false,
      isValid: true,
      hasEdited: false,
      data: getInitialDraftData(),
    };
  },
});

export type SaveEventPayload = {
  projectId: string;
  workflowId: string;
  description: TypedText;
  links: Array<Link>;
  tags: Array<string>;
  inPorts: Array<ComponentPortDescription>;
  outPorts: Array<ComponentPortDescription>;
  icon: string | null; // base64 url-encoded
  type: UpdateComponentMetadataCommand.TypeEnum | string | null;
};

const emit = defineEmits<{
  (e: "save", payload: SaveEventPayload): void;
}>();

const onValidChange = (isValid: boolean) => {
  metadataDraft.value.isValid = isValid;
};

const icon = computed(() => getMetadataFieldValue("icon"));

// node icon preview
const nodePreview = computed(() => {
  const { inPorts = [], outPorts = [] } = componentMetadata.value;

  // use data that might be changed due to the edit process
  const type = getMetadataFieldValue("type");
  const icon = getMetadataFieldValue("icon") || null;

  return {
    inPorts: inPorts.map(toExtendedPortObject(props.availablePortTypes)),
    outPorts: outPorts.map(toExtendedPortObject(props.availablePortTypes)),
    icon,
    type,
    isComponent: true,
    hasDynPorts: false,
  };
});

const wrapper = ref<InstanceType<typeof SidebarPanelLayout>>();
const wrapperElement = computed<HTMLElement>(() => wrapper.value?.$el);

const { saveContent } = useSaveMetadata({
  metadataDraft,
  originalData: toRef(props, "componentMetadata"),
  metadataWrapperElement: wrapperElement,
  triggerSave: () => {
    emit("save", {
      projectId: props.projectId,
      workflowId: props.componentId,
      links: metadataDraft.value.data.links,
      tags: metadataDraft.value.data.tags,
      description: {
        value: metadataDraft.value.data.description,
        contentType: TypedText.ContentTypeEnum.Html,
      },
      inPorts: metadataDraft.value.data.inPorts,
      outPorts: metadataDraft.value.data.outPorts,
      icon: metadataDraft.value.data.icon || null,
      type: metadataDraft.value.data.type,
    });
  },
  resetDraft,
  cancelEdit,
  singleMetanodeSelectedId: toRef(props, "singleMetanodeSelectedId"),
});

const preserveWhitespaceBeforeEdit = () => {
  if (
    componentMetadata.value.description?.contentType ===
    TypedText.ContentTypeEnum.Plain
  ) {
    metadataDraft.value.data.description = recreateLinebreaks(
      componentMetadata.value.description?.value ?? "",
    );
  }

  startEdit();
};
</script>

<template>
  <SidebarPanelLayout ref="wrapper">
    <template #header>
      <div class="header">
        <h2 class="component-name">
          <span class="node-preview">
            <!-- @vue-expect-error -- NodePreview is not properly typed -->
            <NodePreview v-bind="nodePreview" />
          </span>

          <span class="component-title" :title="componentMetadata.name">{{
            componentMetadata.name
          }}</span>
        </h2>
      </div>

      <MetadataHeaderButtons
        v-if="isWorkflowWritable"
        :is-editing="isEditing"
        :is-valid="isValid"
        @start-edit="preserveWhitespaceBeforeEdit()"
        @save="saveContent()"
        @cancel-edit="cancelEdit"
      />
    </template>
    <SidebarPanelScrollContainer>
      <MetadataDescription
        :original-description="componentMetadata.description?.value ?? ''"
        :model-value="getMetadataFieldValue('description')"
        :editable="isEditing"
        :is-legacy="
          componentMetadata.description?.contentType ===
          TypedText.ContentTypeEnum.Plain
        "
        @update:model-value="updateMetadataField('description', $event)"
      />

      <!-- Type and Icon -->
      <template v-if="isEditing">
        <SidebarPanelSubHeading>Type and icon</SidebarPanelSubHeading>
        <ComponentIconEditor
          :model-value="icon"
          @update:model-value="updateMetadataField('icon', $event)"
        />
        <ComponentTypeEditor
          :component-types="availableComponentTypes"
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
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.header {
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
