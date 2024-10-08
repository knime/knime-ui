<script>
import { nextTick } from "vue";
import NodeNameText from "./NodeNameText.vue";

/**
 * Inline editor for the node name. Emits 'save' and 'cancel' events. Implements v-model pattern. On input, it might
 * emit 'invalidCharacter' if the input matches forbiddenCharacters.
 */
export default {
  components: { NodeNameText },
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    /* start width to avoid jumping on replace of <NodeName> */
    startWidth: {
      type: Number,
      default: null,
    },
    /* start height to avoid jumping on replace of <NodeName> */
    startHeight: {
      type: Number,
      default: null,
    },
    invalidCharacters: {
      type: RegExp,
      default: null,
    },
  },
  emits: [
    "update:modelValue",
    "save",
    "cancel",
    "widthChange",
    "heightChange",
    "invalidInput",
  ],
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
      let value = event.target.value;
      value = value.replace(/(\r\n|\n|\r)/gm, ""); // remove all new lines

      // remove invalid characters here as well, they could have been sneaked in via paste or drop
      if (this.invalidCharacters && this.invalidCharacters.test(value)) {
        this.$emit("invalidInput");
        value = value.replace(this.invalidCharacters, "");
      }

      this.$refs.textarea.value = value;
      this.$refs.ghost.innerText = value;

      // apply the styles that resize the textarea according to the content
      this.resizeTextarea();

      this.$emit("update:modelValue", value);
    },
    onKeyDown(event) {
      // prevent inserting invalid characters
      if (this.invalidCharacters && this.invalidCharacters.test(event.key)) {
        this.$emit("invalidInput");
        event.preventDefault();
      }
    },
    onEnter(event) {
      event.preventDefault();
      this.$emit("save");
    },
    onEscape(event) {
      event.preventDefault();
      this.$emit("cancel");
    },
    resizeTextarea() {
      const textarea = this.$refs.textarea;
      if (!textarea) {
        return;
      }
      // width
      const width = Math.min(
        Math.max(
          this.$refs.ghost.scrollWidth + 2,
          this.$shapes.nodeNameEditorMinWidth,
        ),
        this.$shapes.maxNodeNameWidth,
      );
      textarea.style.width = `${width}px`;

      // height
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    },
  },
};
</script>

<template>
  <NodeNameText
    show-overflow
    class="editor"
    :start-width="startWidth"
    :start-height="startHeight"
    @width-change="$emit('widthChange', $event)"
    @height-change="$emit('heightChange', $event)"
  >
    <span ref="ghost" class="ghost" aria-hidden="true">
      {{ modelValue }}
    </span>
    <textarea
      ref="textarea"
      rows="1"
      class="name-textarea native-context-menu"
      :value="modelValue"
      @pointerdown.stop
      @input="onInput"
      @keydown="onKeyDown"
      @keydown.enter.exact="onEnter"
      @keydown.esc="onEscape"
    />
  </NodeNameText>
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

.name-textarea {
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

/* change some styles of NodeName in edit mode */
.editor {
  outline: 1px solid var(--knime-silver-sand);

  /* FF does not support background of <foreignObject> */
  & :deep(.wrapper) {
    background-color: var(--knime-white);
  }

  &:focus-within {
    outline: 1px solid var(--knime-masala);
  }
}
</style>
