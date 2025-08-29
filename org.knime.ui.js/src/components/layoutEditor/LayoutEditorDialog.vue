<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button, LoadingIcon, Modal, TabBar } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import ConfigurationLayoutEditor from "./ConfigurationLayoutEditor.vue";
import ViewLayoutEditor from "./ViewLayoutEditor.vue";

type LayoutEditorTabValue =
  | "viewLayoutEditor"
  | "advancedViewLayoutEditor"
  | "configurationLayout";

type LayoutEditorTabs = {
  value: LayoutEditorTabValue;
  label: string;
};

const tabs: LayoutEditorTabs[] = [
  {
    value: "viewLayoutEditor",
    label: "Composite View Layout",
  },
  {
    value: "advancedViewLayoutEditor",
    label: "Advanced Composite View Layout",
  },
  {
    value: "configurationLayout",
    label: "Configuration Dialog Layout",
  },
];

const isSubmitted = ref(false);
const activeTab = ref<LayoutEditorTabValue>("viewLayoutEditor");

const layoutEditorStore = useLayoutEditorStore();
const { layoutContext } = storeToRefs(layoutEditorStore);

const closeModal = () => {
  if (isSubmitted.value) {
    return;
  }
  layoutEditorStore.setLayoutContext(null);
};

const onSubmit = async () => {
  await layoutEditorStore.save();
  isSubmitted.value = false;
};

watch(layoutContext, layoutEditorStore.load);
</script>

<template>
  <Modal
    :active="layoutContext !== null"
    title="Create a new workflow"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #notice>
      <TabBar v-model="activeTab" :possible-values="tabs" :disabled="false" />
    </template>

    <template #confirmation>
      <ViewLayoutEditor v-if="activeTab === 'viewLayoutEditor'" />

      <ConfigurationLayoutEditor
        v-else-if="activeTab === 'configurationLayout'"
      />
    </template>

    <template #controls>
      <Button compact with-border :disabled="isSubmitted" @click="closeModal">
        <strong>Cancel</strong>
      </Button>
      <Button
        compact
        primary
        class="submit-button"
        :disabled="isSubmitted"
        @click="onSubmit"
      >
        <LoadingIcon v-if="isSubmitted" aria-hidden="true" focusable="false" />
        <strong>Finish</strong>
      </Button>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal.info {
  --modal-height: 95vh;
  --modal-width: 95vw;

  & :deep(.inner) {
    top: 50%;
    display: flex;
    flex-direction: column;
  }

  & :deep(.notice) {
    background-color: var(--knime-white);
    overflow: hidden;
    padding: 0;
  }

  & :deep(.confirmation) {
    overflow: hidden;
    height: 100%;
    padding: 0;
  }
}
</style>
