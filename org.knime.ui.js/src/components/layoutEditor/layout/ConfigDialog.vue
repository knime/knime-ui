<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import { InlineMessage, InputField } from "@knime/components";
import { KdsValueSwitch } from "@knime/kds-components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  LayoutEditorItemSizingConfig,
  LayoutEditorViewItem,
} from "@/store/layoutEditor/types/view";

type Props = {
  item: LayoutEditorViewItem;
};

const props = defineProps<Props>();
const emit = defineEmits(["close"]);

const layoutEditorStore = useLayoutEditorStore();

const initialItemConfig: LayoutEditorItemSizingConfig = {
  resizeMethod: props.item.resizeMethod,
  minWidth: props.item.minWidth,
  maxWidth: props.item.maxWidth,
  minHeight: props.item.minHeight,
  maxHeight: props.item.maxHeight,
};
const initialResizeMode = initialItemConfig.resizeMethod?.includes(
  "aspectRatio",
)
  ? initialItemConfig.resizeMethod
  : "auto";

const itemConfig = ref(initialItemConfig);
const resizeMode = ref(initialResizeMode);

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
    event.stopPropagation();
  }
};

onMounted(() => {
  // capture is required to get this event before the modal does (both listen to window)
  window.addEventListener("keydown", handleKeyDown, { capture: true });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown, { capture: true });
});

watch(resizeMode, (newResizeMode) => {
  itemConfig.value.resizeMethod = newResizeMode;

  // aspect ratio options don't support min/max sizes
  if (newResizeMode !== "auto") {
    itemConfig.value.minWidth = null;
    itemConfig.value.maxWidth = null;
    itemConfig.value.minHeight = null;
    itemConfig.value.maxHeight = null;
  }
});

watch(
  itemConfig,
  () => {
    layoutEditorStore.updateContentItemConfig({
      item: props.item,
      config: itemConfig.value,
    });
  },
  { deep: true },
);
</script>

<template>
  <div class="config-dialog">
    <div class="grid">
      <div class="resize-method-config">
        <KdsValueSwitch
          v-model="resizeMode"
          :possible-values="[
            { id: 'auto', text: 'Auto' },
            { id: 'aspectRatio16by9', text: '16:9' },
            { id: 'aspectRatio4by3', text: '4:3' },
            { id: 'aspectRatio1by1', text: '1:1' },
          ]"
          size="small"
        />
      </div>

      <InlineMessage
        v-if="resizeMode === 'auto'"
        variant="info"
        title="Height calculation"
      >
        Will be derived automatically depending on content.
      </InlineMessage>

      <table v-if="resizeMode === 'auto'" class="size-table">
        <thead>
          <tr>
            <th />
            <th scope="col">Width</th>
            <th scope="col">Height</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Min</th>
            <td>
              <InputField
                v-model="itemConfig.minWidth"
                type="number"
                min="0"
                compact
              >
                <template #iconRight><span class="unit">px</span></template>
              </InputField>
            </td>
            <td>
              <InputField
                v-model="itemConfig.minHeight"
                type="number"
                min="0"
                compact
              >
                <template #iconRight><span class="unit">px</span></template>
              </InputField>
            </td>
          </tr>
          <tr>
            <th scope="row">Max</th>
            <td>
              <InputField
                v-model="itemConfig.maxWidth"
                type="number"
                min="0"
                compact
              >
                <template #iconRight><span class="unit">px</span></template>
              </InputField>
            </td>
            <td>
              <InputField
                v-model="itemConfig.maxHeight"
                type="number"
                min="0"
                compact
              >
                <template #iconRight><span class="unit">px</span></template>
              </InputField>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.config-dialog {
  box-shadow: var(--shadow-elevation-2);
  color: inherit;
  text-align: left;
  border: none;
  cursor: default;
  font-size: inherit;
  background: var(--knime-white);
  padding: var(--space-16);
  z-index: v-bind("layoutEditorZIndices.configDialog");
}

.resize-method-config {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.grid {
  display: grid;
  align-items: center;
  gap: var(--space-16);
}

.size-table {
  border-collapse: separate;
  border-spacing: var(--space-8);

  & th {
    font-weight: 500;
    font-size: 12px;
  }

  & td {
    max-width: 90px;

    & .unit {
      font-size: 12px;
    }
  }
}
</style>
