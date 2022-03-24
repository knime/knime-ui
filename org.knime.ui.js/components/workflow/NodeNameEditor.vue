<script>

import NodeName from '~/components/workflow/NodeName';

/**
 * Inline editor for the node name
 */
export default {
    components: { NodeName },
    props: {
        value: {
            type: String,
            default: ''
        },
        pattern: {
            default: null,
            type: RegExp
        }
    },
    mounted() {
        this.$nextTick(() => {
            this.adjustDimensions();
            if (this.$refs.textarea) {
                this.$refs.textarea.focus();
                this.$refs.textarea.select();
            }
        });
    },
    methods: {
        onInput(event) {
            let value = event.target.value;
            value = value.replace(/(\r\n|\n|\r)/gm, ''); // remove all new lines

            // remove invalid characters here as well, they could have been sneaked in via paste or drop
            if (this.pattern && this.pattern.test(value)) {
                this.$emit('invalidCharacter');
                value = value.replace(this.pattern, '');
            }

            this.$refs.textarea.value = value;
            this.adjustDimensions();
            this.$emit('input', value);
        },
        onKeyDown(event) {
            // prevent inserting invalid characters
            if (this.pattern && this.pattern.source.includes(event.key.toLowerCase())) {
                this.$emit('invalidCharacter');
                event.preventDefault();
            }
        },
        onEnter(event) {
            event.preventDefault();
            this.$emit('save');
        },
        onEsc(event) {
            event.preventDefault();
            this.$emit('close');
        },
        resizeTextarea() {
            consola.trace('InlineTextarea: resizing');
            let textarea = this.$refs.textarea;
            if (!textarea) {
                return;
            }
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        },
        adjustDimensions() {
            this.$refs.nodeName?.adjustDimensions();
        }
    }
};
</script>

<template>
  <NodeName
    ref="nodeName"
    class="editor"
    show-overflow
    :adjust-dimension-before-hook="resizeTextarea"
    @width="$emit('width', $event)"
    @height="$emit('height', $event)"
  >
    <textarea
      ref="textarea"
      rows="1"
      class="name-textarea"
      :value="value"
      @pointerdown.stop
      @input="onInput"
      @keydown="onKeyDown"
      @keydown.enter="onEnter"
      @keydown.esc="onEsc"
    />
  </NodeName>
</template>

<style lang="postcss" scoped>
.name-textarea {
  display: block;
  width: 100%;
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
  background: var(--knime-white);

  &:focus-within {
    outline: 1px solid var(--knime-masala);
  }

  /* this fixes the position of the textarea */
  & >>> .wrapper {
    display: block;
  }
}
</style>
