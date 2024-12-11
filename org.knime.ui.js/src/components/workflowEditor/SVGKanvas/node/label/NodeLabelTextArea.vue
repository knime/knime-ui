<script>
import { nextTick } from "vue";

import { navigatorUtils } from "@knime/utils";

import NodeLabelText from "./NodeLabelText.vue";

export default {
  components: { NodeLabelText },
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    kind: {
      type: String,
      default: "",
    },
    portOffset: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  emits: ["update:modelValue", "save", "cancel"],
  async mounted() {
    await nextTick();

    this.resizeTextarea();

    if (this.$refs.textarea) {
      this.$refs.textarea.focus();
      this.$refs.textarea.select();
    }
  },
  methods: {
    onInput(event) {
      const value = event.target.value;
      this.$refs.textarea.value = value;
      this.$refs.ghost.innerText = value;

      // apply the styles that resize the textarea according to the content
      this.resizeTextarea();

      this.$emit("update:modelValue", value);
    },
    resizeTextarea() {
      const textarea = this.$refs.textarea;

      // width
      // eslint-disable-next-line no-magic-numbers
      const width = this.$refs.ghost.scrollWidth + 6;
      textarea.style.width = `${width}px`;

      // height
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    },
    onSave(event) {
      const metaOrCtrlKey = navigatorUtils.getMetaOrCtrlKey();

      if (event[metaOrCtrlKey]) {
        this.$emit("save");
      }
    },
  },
};
</script>

<template>
  <NodeLabelText class="editor" :kind="kind" :port-offset="portOffset">
    <span ref="ghost" class="ghost" aria-hidden="true">
      {{ modelValue }}
    </span>
    <textarea
      ref="textarea"
      rows="1"
      class="label-textarea native-context-menu"
      :value="modelValue"
      @pointerdown.stop
      @input="onInput"
      @keydown.enter="onSave"
      @keydown.esc.prevent.stop="$emit('cancel')"
    />
  </NodeLabelText>
</template>

<style lang="postcss" scoped>
.ghost {
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

.label-textarea {
  display: block;
  text-align: inherit;
  border: 0;
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

/* change some styles of NodeLabel in edit mode */
.editor {
  outline: 1px solid var(--knime-stone-dark);

  /* FF does not support background of <foreignObject> */
  & :deep(.wrapper) {
    background-color: var(--knime-white);
  }

  &:focus-within {
    outline: 1px solid var(--knime-stone-dark);
  }
}
</style>
