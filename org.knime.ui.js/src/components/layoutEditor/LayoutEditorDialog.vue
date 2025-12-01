<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import type { Component } from "vue";
import { storeToRefs } from "pinia";

import { TabBar } from "@knime/components";
import { KdsButton, KdsModal } from "@knime/kds-components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import * as layoutEditorZIndices from "./z-indices";

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
  <KdsModal
    :active="layoutContext !== null"
    title="Layout editor"
    variant="plain"
    class="modal"
    width="full"
    height="full"
    @close="closeModal"
  >
    <div class="tab-bar">
      <TabBar v-model="activeTab" :possible-values="tabs" />
    </div>
    <div class="active-tab">
      <Component :is="activeTabComponent" />
    </div>
    <template #footer>
      <KdsButton
        class="cancel-button"
        :disabled="isSubmitted"
        variant="transparent"
        label="Cancel"
        @click="closeModal"
      />
      <KdsButton
        variant="filled"
        class="submit-button"
        label="Apply"
        :disabled="
          isSubmitted ||
          advancedEditorData.validity === 'invalid' ||
          advancedEditorData.validity === 'checking'
        "
        @click="onSubmit"
      />
    </template>
  </KdsModal>
</template>

<style lang="postcss" scoped>
.tab-bar {
  flex-shrink: 0;
}

.active-tab {
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  /** we need a height for the overflow to work, the flex-grow makes this take up all available space */
  height: 10%;
}

.cancel-button,
.submit-button {
  z-index: v-bind("layoutEditorZIndices.modalControls");
}
</style>
