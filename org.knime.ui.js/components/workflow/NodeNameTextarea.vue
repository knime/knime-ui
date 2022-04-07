<script>
import NodeNameText from '~/components/workflow/NodeNameText';

/**
 * Inline editor for the node name. Emits 'save' and 'close' events. Implements v-model pattern. On input it might
 * emit 'invalidCharacter' if the input matches given 'pattern' prop.
 */
export default {
    components: { NodeNameText },
    props: {
        value: {
            type: String,
            default: ''
        },
        pattern: {
            default: null,
            type: RegExp
        },
        /* start width to avoid jumping on replace of <NodeName> */
        startWidth: {
            type: Number,
            default: null
        },
        /* start height to avoid jumping on replace of <NodeName> */
        startHeight: {
            type: Number,
            default: null
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
            let value = event.target.value;
            value = value.replace(/(\r\n|\n|\r)/gm, ''); // remove all new lines

            // remove invalid characters here as well, they could have been sneaked in via paste or drop
            if (this.pattern && this.pattern.test(value)) {
                this.$emit('invalidCharacter');
                value = value.replace(this.pattern, '');
            }

            this.$refs.textarea.value = value;
            this.$refs.ghost.innerText = value;
            
            // trigger callback to update size on the autosize wrapper
            sizeChangeCallback();

            // apply the styles that resize the textarea according to the content
            this.resizeTextarea();

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
        onEscape(event) {
            event.preventDefault();
            this.$emit('close');
        },
        resizeTextarea() {
            const textarea = this.$refs.textarea;
            if (!textarea) {
                return;
            }
            // width
            const width = Math.min(
                Math.max(this.$refs.ghost.scrollWidth + 2, this.$shapes.nodeNameEditorMinWidth),
                this.$shapes.maxNodeNameWidth
            );
            textarea.style.width = `${width}px`;
            
            // height
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }
};
</script>

<template>
  <NodeNameText
    show-overflow
    class="editor"
    :start-width="startWidth"
    :start-height="startHeight"
    @width-change="$emit('width-change', $event)"
    @height-change="$emit('height-change', $event)"
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
        class="name-textarea"
        :value="value"
        @pointerdown.stop
        @input="onInput($event, sizeChange)"
        @keydown="onKeyDown"
        @keydown.enter="onEnter"
        @keydown.esc="onEscape"
      />
    </template>
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
  & >>> .wrapper {
    background-color: var(--knime-white);
  }

  &:focus-within {
    outline: 1px solid var(--knime-masala);
  }
}
</style>
