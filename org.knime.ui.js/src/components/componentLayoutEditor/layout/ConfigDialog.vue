<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import { InputField, ValueSwitch } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  ComponentLayoutView,
  ComponentLayoutViewConfig,
} from "@/store/layoutEditor/types";

interface Props {
  item: ComponentLayoutView;
}

const props = defineProps<Props>();
const emit = defineEmits(["close"]);

const layoutEditorStore = useLayoutEditorStore();

const initialItemConfig: ComponentLayoutViewConfig = {
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

// TODO: Escape currently closes the whole modal, not just config dialog
// But it's not a regression, so not urgent
onMounted(() => {
  window.addEventListener("keypress", handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener("keypress", handleKeyUp);
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
      <div class="item">
        <ValueSwitch
          v-model="resizeMode"
          :possible-values="[
            { id: 'aspectRatio', text: 'Aspect ratio' },
            { id: 'auto', text: 'Auto' },
          ]"
        />
      </div>
      <div class="item">
        <ValueSwitch
          v-if="resizeMode === 'aspectRatio'"
          v-model="itemConfig.resizeMethod"
          :possible-values="[
            { id: 'aspectRatio16by9', text: '16:9' },
            { id: 'aspectRatio4by3', text: '4:3' },
            { id: 'aspectRatio1by1', text: 'square' },
          ]"
        />
        <small v-else>
          Height dynamically calculated depending on content.
        </small>
      </div>

      <template v-if="resizeMode === 'auto'">
        <div class="item text-center">Width</div>
        <div class="item text-center">Height</div>

        <div class="item">Min</div>
        <div class="item">
          <InputField
            v-model="itemConfig.minWidth"
            type="number"
            step="1"
            min="0"
          >
            <template #iconRight>
              <span>px</span>
            </template>
          </InputField>
        </div>
        <div class="item">
          <InputField
            v-model="itemConfig.minHeight"
            type="number"
            step="1"
            min="0"
          >
            <template #iconRight>
              <span>px</span>
            </template>
          </InputField>
        </div>

        <div class="item">Max</div>
        <div class="item">
          <InputField
            v-model="itemConfig.maxWidth"
            type="number"
            step="1"
            min="0"
          >
            <template #iconRight>
              <span>px</span>
            </template>
          </InputField>
        </div>
        <div class="item">
          <InputField
            v-model="itemConfig.maxHeight"
            type="number"
            step="1"
            min="0"
          >
            <template #iconRight>
              <span>px</span>
            </template>
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
  grid-template-areas: "a b";
  grid-template-columns: repeat(2, 1fr);
}

.full-grid {
  grid-template-areas:
    "a a a a a a b b b b b b"
    "c c c c c c d d d d d d"
    "e e f f f f f g g g g g"
    "h h i i i i i j j j j j";
  grid-template-columns: repeat(12, 1fr);
}

.text-center {
  text-align: center;
}

.grid > div:nth-child(1) {
  grid-area: a;
}

.grid > div:nth-child(2) {
  grid-area: b;
}

.grid > div:nth-child(3) {
  grid-area: c;
}

.grid > div:nth-child(4) {
  grid-area: d;
}

.grid > div:nth-child(5) {
  grid-area: e;
}

.grid > div:nth-child(6) {
  grid-area: f;
}

.grid > div:nth-child(7) {
  grid-area: g;
}

.grid > div:nth-child(8) {
  grid-area: h;
}

.grid > div:nth-child(9) {
  grid-area: i;
}

.grid > div:nth-child(10) {
  grid-area: j;
}
</style>
