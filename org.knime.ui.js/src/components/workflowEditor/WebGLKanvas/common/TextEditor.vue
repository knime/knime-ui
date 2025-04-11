<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { useFocus } from "@vueuse/core";
import { isNumber } from "lodash-es";

import { getMetaOrCtrlKey } from "@knime/utils";

type Props = {
  value: string;
  maxLength: number;
  maxWidth?: number;
  minWidth?: number;
  widthOffset?: number;
  invalidCharacters?: RegExp;
  saveOnEnter?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  maxWidth: undefined,
  minWidth: undefined,
  invalidCharacters: undefined,
  widthOffset: 0,
  saveOnEnter: false,
});

const emit = defineEmits<{
  save: [];
  "update:value": [string];
  cancel: [];
  invalidInput: [];
  textDimensionChange: [{ width: number; height: number }];
}>();

const textarea = useTemplateRef("textarea");
const ghost = useTemplateRef("ghost");
const modelValue = ref(props.value);

useFocus(textarea, { initialValue: true });

const resizeTextarea = () => {
  if (!textarea.value || !ghost.value) {
    return;
  }
  // width

  const doMinMax = isNumber(props.maxWidth) && isNumber(props.minWidth);

  const width = doMinMax
    ? Math.min(
        Math.max(ghost.value.scrollWidth + props.widthOffset, props.minWidth),
        props.maxWidth,
      )
    : ghost.value.scrollWidth + props.widthOffset;

  textarea.value.style.width = `${width}px`;

  // height
  textarea.value.style.height = "auto";
  const height = textarea.value.scrollHeight;
  textarea.value.style.height = `${height}px`;

  emit("textDimensionChange", { width, height });
};

const onInput = () => {
  if (!textarea.value || !ghost.value) {
    return;
  }

  let value = textarea.value.value;
  if (props.saveOnEnter) {
    value = value.replace(/(\r\n|\n|\r)/gm, ""); // remove all new lines
  }

  // remove invalid characters here as well, they could have been sneaked in via paste or drop
  if (props.invalidCharacters && props.invalidCharacters.test(value)) {
    emit("invalidInput");
    value = value.replace(props.invalidCharacters, "");
  }

  textarea.value.value = value;
  ghost.value.innerText = value;

  // apply the styles that resize the textarea according to the content
  resizeTextarea();

  modelValue.value = value;
  emit("update:value", value);
};

onMounted(() => {
  onInput();
  resizeTextarea();
});

const onEnterKey = (event: KeyboardEvent) => {
  if (!props.saveOnEnter && !event[getMetaOrCtrlKey()]) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  emit("save");
};
</script>

<template>
  <div class="text-editor native-context-menu">
    <span ref="ghost" class="ghost" aria-hidden="true">{{ modelValue }}</span>
    <textarea
      ref="textarea"
      :value="modelValue"
      :maxlength="maxLength"
      rows="1"
      @keydown.esc.stop.prevent="$emit('cancel')"
      @input="onInput"
      @keydown.enter="onEnterKey"
    />
  </div>
</template>

<style lang="postcss" scoped>
.text-editor {
  border: 1px solid var(--knime-silver-sand);
  background-color: var(--knime-white);
  font-family: "Roboto Condensed", sans-serif;
  font-style: normal;
  font-weight: 700;
  font-size: calc(v-bind("$shapes.nodeNameFontSize") * 1px);
  margin: 0;
  text-align: inherit;
  -webkit-font-smoothing: antialiased;
  width: fit-content;
  line-height: 1.26;

  &:focus-within {
    border: 1px solid var(--knime-masala);
  }

  & > .ghost {
    visibility: hidden;
    position: absolute;
    top: -10000px;
    left: -10000px;
    text-align: inherit;
    border: 0;
    padding: 0;
    margin: 0;
    font: inherit; /* inherit all font styles from parent element */
    letter-spacing: inherit;
    overflow: hidden;
    color: inherit;
    outline: none;
  }

  & > textarea {
    display: block;
    text-align: inherit;
    border: 0;
    padding: 0;
    margin: 0;
    resize: none;
    background-color: transparent;
    font: inherit; /* inherit all font styles from parent element */
    letter-spacing: inherit;
    overflow: hidden;
    color: inherit;
    outline: none;

    &::placeholder {
      color: var(--knime-silver-sand);
    }
  }
}
</style>
