<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import type { Component } from "vue";
import { storeToRefs } from "pinia";

import { Button, LoadingIcon, Modal, TabBar } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

type LayoutEditorTabValue =
  | "viewLayoutEditor"
  | "advancedLayoutEditor"
  | "configurationLayout";

type LayoutEditorTabs = {
  value: LayoutEditorTabValue;
  label: string;
  component: Component;
  disabled?: boolean;
};

const ViewLayoutEditor = defineAsyncComponent({
  loader: () => import("./ViewLayoutEditor.vue"),
});

const AdvancedLayoutEditor = defineAsyncComponent({
  loader: () => import("./AdvancedLayoutEditor/AdvancedLayoutEditor.vue"),
});

const ConfigurationLayoutEditor = defineAsyncComponent({
  loader: () => import("./ConfigurationLayoutEditor.vue"),
});

const isSubmitted = ref(false);
const activeTab = ref<LayoutEditorTabValue>("viewLayoutEditor");

const layoutEditorStore = useLayoutEditorStore();
const { layoutContext, isDragging, advancedEditorData } =
  storeToRefs(layoutEditorStore);

const closeModal = () => {
  if (isDragging.value) {
    return;
  }
  if (isSubmitted.value) {
    return;
  }

  layoutEditorStore.close();
};

const onSubmit = async () => {
  await layoutEditorStore.save();
  isSubmitted.value = false;
};

watch(layoutContext, () => {
  // reset tab state when layout editor is closed
  if (layoutContext.value === null) {
    activeTab.value = "viewLayoutEditor";
  }
});

watch(layoutContext, layoutEditorStore.load);

const tabs = computed<LayoutEditorTabs[]>(() => [
  {
    value: "viewLayoutEditor",
    label: "Data App Layout",
    component: ViewLayoutEditor,
    disabled:
      advancedEditorData.value.validity === "invalid" ||
      advancedEditorData.value.validity === "checking",
  },
  {
    value: "advancedLayoutEditor",
    label: "Advanced Layout",
    component: AdvancedLayoutEditor,
  },
  {
    value: "configurationLayout",
    label: "Configuration Dialog Layout",
    component: ConfigurationLayoutEditor,
    disabled:
      advancedEditorData.value.validity === "invalid" ||
      advancedEditorData.value.validity === "checking",
  },
]);

const activeTabComponent = computed(
  () => tabs.value.find(({ value }) => value === activeTab.value)!.component,
);
</script>

<template>
  <Modal
    :active="layoutContext !== null"
    title="Layout editor"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #notice>
      <TabBar v-model="activeTab" :possible-values="tabs" />
    </template>

    <template #confirmation>
      <Component :is="activeTabComponent" />
    </template>

    <template #controls>
      <Button compact with-border :disabled="isSubmitted" @click="closeModal">
        <strong>Cancel</strong>
      </Button>
      <Button
        compact
        primary
        class="submit-button"
        :disabled="
          isSubmitted ||
          advancedEditorData.validity === 'invalid' ||
          advancedEditorData.validity === 'checking'
        "
        @click="onSubmit"
      >
        <LoadingIcon v-if="isSubmitted" aria-hidden="true" focusable="false" />
        <strong>Apply</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal.info {
  --modal-height: 95vh;
  --modal-width: 95vw;
  --z-index-common-modal: v-bind("$zIndices.layerModals");
  --background: var(--knime-gray-ultra-light);

  background: var(--background);
  isolation: isolate;

  & :deep(.inner) {
    top: 50%;
    display: flex;
    flex-direction: column;
    background: var(--background);

    & > .notice {
      background: var(--background);
      overflow: hidden;
      padding: 0;
    }

    & > .confirmation {
      overflow: hidden;
      height: 100%;
      padding: 0;
    }

    & > .controls {
      border-top: 1px solid var(--knime-silver-sand);
    }
  }
}
</style>
