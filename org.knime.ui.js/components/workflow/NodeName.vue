<script>
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

/**
 * A rectangular box containing text. It uses <foreignObject> and automatically updates the size based on the contents.
 * It offers limits to the size and always centers around the node.
 */
export default {
    components: { AutoSizeForeignObject },
    props: {
        editable: {
            type: Boolean,
            default: false
        },
        editor: {
            type: Boolean,
            default: false
        },
        value: {
            type: String,
            default: ''
        },
        pattern: {
            default: null,
            type: RegExp
        }
    },
    data() {
        return {
            editorText: this.value
        };
    },
    computed: {
        maxWidth() {
            return this.$shapes.maxNodeNameWidth;
        }
    },
    watch: {
        value(newValue) {
            this.editorText = newValue;
            this.adjustDimensions();
        }
    },
    mounted() {
        this.adjustDimensions();
        this.$nextTick(() => {
            if (this.editor) {
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
            this.$emit('save', this.editorText);
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
            this.$refs.container?.adjustDimensions();
        }
    }
};
</script>

<template>
  <AutoSizeForeignObject
    ref="container"
    :class="['container', {editable, editor}]"
    :max-width="maxWidth"
    :y-shift="-$shapes.nodeNameMargin"
    :parent-width="$shapes.nodeSize"
    :adjust-dimension-before-hook="resizeTextarea"
    shift-by-height
    @width="$emit('width', $event)"
    @height="$emit('height', $event)"
  >
    <div
      class="nodeName"
      @click.prevent.stop="$emit('click', $event)"
      @contextmenu.prevent="$emit('contextmenu', $event)"
      @dblclick.left.prevent.stop="editable ? $emit('request-edit') : null"
      @mouseleave="$emit('mouseleave', $event)"
      @mouseenter="$emit('mouseenter', $event)"
    >
      <span
        :style="{'max-width': `${maxWidth}px`}"
        :title="editor ? '' : (editable ? 'Double click to edit: ' : '') + value"
        class="text"
      ><textarea
        v-if="editor"
        ref="textarea"
        v-model="editorText"
        rows="1"
        class="textarea"
        @pointerdown.stop
        @input="onInput"
        @keydown="onKeyDown"
        @keydown.enter="onEnter"
        @keydown.esc="onEsc"
      /><template v-else>{{ value }}</template></span>
    </div>
  </AutoSizeForeignObject>
</template>

<style lang="postcss" scoped>
.container {
  font-family: "Roboto Condensed", sans-serif;
  cursor: default;
  user-select: none;

  &.editable:hover {
    cursor: pointer;
  }

  &.editor {
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

  & .text {
    font-family: "Roboto Condensed", sans-serif;
    font-style: normal;
    font-weight: bold;
    font-size: calc(var(--node-name-font-size-shape) * 1px);
    margin: 0;
    white-space: pre-wrap;
    text-align: inherit;
  }

  &:not(.editor) .text {
    /* multiline overflow ellipsis -
       also supported in Firefox (yes with -webkit prefix) https://caniuse.com/css-line-clamp */
    word-wrap: break-word;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--node-name-max-lines-shape);
    overflow: hidden;
  }

  & .textarea {
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

  & .nodeName {
    text-align: center;

    padding: calc(var(--node-name-padding-shape) * 1px);
    overflow: hidden;
    line-height: calc(var(--node-name-line-height-shape) * 1px);
  }
}
</style>
