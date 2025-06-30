<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import { InputField, ValueSwitch } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  LayoutEditorItem,
  LayoutEditorItemSizingConfig,
} from "@/store/layoutEditor/types/view";

type Props = {
  item: LayoutEditorItem;
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
  ? "aspectRatio"
  : "auto";

const itemConfig = ref(initialItemConfig);
const resizeMode = ref(initialResizeMode);

const handleKeyUp = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyUp);
});

watch(resizeMode, (newResizeMode) => {
  switch (newResizeMode) {
    case "aspectRatio":
      itemConfig.value.resizeMethod = "aspectRatio16by9";

      // aspect ratio currently doesn't support min/max sizes
      itemConfig.value.minWidth = null;
      itemConfig.value.maxWidth = null;
      itemConfig.value.minHeight = null;
      itemConfig.value.maxHeight = null;

      break;
    case "auto":
      itemConfig.value.resizeMethod = "auto";
      break;
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
    <div
      class="grid"
      :class="resizeMode === 'auto' ? 'full-grid' : 'basic-grid'"
    >
      <div :style="{ gridArea: 'cell1' }">
        <ValueSwitch
          v-model="resizeMode"
          :possible-values="[
            { id: 'aspectRatio', text: 'Aspect ratio' },
            { id: 'auto', text: 'Auto' },
          ]"
          compact
        />
      </div>
      <div :style="{ gridArea: 'cell2' }">
        <ValueSwitch
          v-if="resizeMode === 'aspectRatio'"
          v-model="itemConfig.resizeMethod"
          :possible-values="[
            { id: 'aspectRatio16by9', text: '16:9' },
            { id: 'aspectRatio4by3', text: '4:3' },
            { id: 'aspectRatio1by1', text: 'square' },
          ]"
          compact
        />
        <small v-else>
          Height dynamically calculated depending on content.
        </small>
      </div>

      <template v-if="resizeMode === 'auto'">
        <div :style="{ gridArea: 'cell3', textAlign: 'center' }">Width</div>
        <div :style="{ gridArea: 'cell4', textAlign: 'center' }">Height</div>

        <div :style="{ gridArea: 'cell5' }">Min</div>
        <div :style="{ gridArea: 'cell6' }">
          <InputField
            v-model="itemConfig.minWidth"
            type="number"
            min="0"
            compact
          >
            <template #iconRight>px</template>
          </InputField>
        </div>
        <div :style="{ gridArea: 'cell7' }">
          <InputField
            v-model="itemConfig.minHeight"
            type="number"
            min="0"
            compact
          >
            <template #iconRight>px</template>
          </InputField>
        </div>

        <div :style="{ gridArea: 'cell8' }">Max</div>
        <div :style="{ gridArea: 'cell9' }">
          <InputField
            v-model="itemConfig.maxWidth"
            type="number"
            min="0"
            compact
          >
            <template #iconRight>px</template>
          </InputField>
        </div>
        <div :style="{ gridArea: 'cell10' }">
          <InputField
            v-model="itemConfig.maxHeight"
            type="number"
            min="0"
            compact
          >
            <template #iconRight>px</template>
          </InputField>
        </div>
      </template>
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
  padding: var(--space-8);
  width: 360px;
  z-index: 100;
}

.grid {
  display: grid;
  align-items: center;
  gap: var(--space-8);
}

.basic-grid {
  grid-template-areas: "cell1 cell2";
  grid-template-columns: repeat(2, 1fr);
}

.full-grid {
  grid-template-areas:
    "cell1 cell1 cell1 cell1 cell1 cell1 cell2 cell2 cell2 cell2 cell2 cell2"
    "cell3 cell3 cell3 cell3 cell3 cell3 cell4 cell4 cell4 cell4 cell4 cell4"
    "cell5 cell5 cell6 cell6 cell6 cell6 cell6 cell7 cell7 cell7 cell7 cell7"
    "cell8 cell8 cell9 cell9 cell9 cell9 cell9 cell10 cell10 cell10 cell10 cell10";
  grid-template-columns: repeat(12, 1fr);
}
</style>
