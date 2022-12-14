<script>
import NodeLabelText from './NodeLabelText.vue';

/**
 * Inline editor for the node label. Emits 'save' and 'cancel' events. Implements v-model pattern. On input, it might
 * emit 'invalidCharacter' if the input matches forbiddenCharacters.
 */
export default {
    components: { NodeLabelText },
    props: {
        value: {
            type: String,
            default: ''
        },
        kind: {
            type: String,
            default: ''
        }
    },
    mounted() {
        this.$nextTick(() => {
            this.resizeTextarea();

            if (this.$refs.textarea) {
                this.$refs.textarea.focus();
                this.$refs.textarea.select();
            }
        });
    },
    methods: {
        onInput(event, sizeChangeCallback) {
            const value = event.target.value;
            this.$refs.textarea.value = value;
            this.$refs.ghost.innerText = value;

            // trigger callback to update size on the autosize wrapper
            sizeChangeCallback();

            // apply the styles that resize the textarea according to the content
            this.resizeTextarea();

            this.$emit('input', value);
        },
        resizeTextarea() {
            const textarea = this.$refs.textarea;
            if (!textarea) {
                return;
            }
            // width
            const width = this.$refs.ghost.scrollWidth + 2;
            textarea.style.width = `${width}px`;

            // height
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }
};
</script>

<template>
  <NodeLabelText
    show-overflow
    class="editor"
    :kind="kind"
  >
    <template #default="{ on: { sizeChange } }">
      <span
        ref="ghost"
        class="ghost"
        aria-hidden="true"
      >
        {{ value }}
      </span>
      <textarea
        ref="textarea"
        rows="1"
        class="label-textarea native-context-menu"
        :value="value"
        @pointerdown.stop
        @input="onInput($event, sizeChange)"
        @keydown.meta.enter.exact="$emit('save')"
        @keydown.esc.prevent="$emit('save')"
      />
    </template>
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
  & >>> .wrapper {
    background-color: var(--knime-white);
  }

  &:focus-within {
    outline: 1px solid var(--knime-masala);
  }
}
</style>
