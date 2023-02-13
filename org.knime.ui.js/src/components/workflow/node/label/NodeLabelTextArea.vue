<script>
import { getMetaOrCtrlKey } from '@/util/navigator';
import NodeLabelText from './NodeLabelText.vue';

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
            
            // width
            // eslint-disable-next-line no-magic-numbers
            const width = this.$refs.ghost.scrollWidth + 6;
            textarea.style.width = `${width}px`;

            // height
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        },
        onSave(event) {
            const metaOrCtrlKey = getMetaOrCtrlKey();

            if (event[metaOrCtrlKey]) {
                this.$emit('save');
            }
        }
    }
};
</script>

<template>
  <NodeLabelText
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
        @keydown.enter="onSave"
        @keydown.esc.prevent="$emit('cancel')"
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
    outline: 1px solid var(--knime-stone-dark);
  }
}
</style>
