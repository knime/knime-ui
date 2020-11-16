<script>
/**
 * Check validity of styleRanges array.
 * @param {Array} styleRanges A list of style ranges to be applied to the given text. Each entry must contain numerical
 * `start` and `length` properties.
 * @param {String=} text Optional. If this text is given, the validator checks if its lengths matches the length of the
 * styleRange array. Otherwise this test is skipped.
 * @returns {boolean} true if the styleRange is valid
 */
import { applyStyleRanges } from '~/util/styleRanges';
export default {
    props: {
        text: {
            type: String,
            default: ''
        },
        /**
         * Style ranges as produced by SWT. These take the form
         * {
         *     start: <Number>,
         *     length: <Number>,
         *     …styleAttributes
         * }
         *
         * @example
         * [{
         *     start: 1,
         *     length: 3,
         *     bold: true,
         *     italic: true,
         *     fontSize: 14
         * }, {
         *     …
         * }]
         */
        styleRanges: {
            type: Array,
            default: () => []
        }
    },
    computed: {
        styledText() {
            let { textRanges, isValid } = applyStyleRanges(this.styleRanges, this.text);
            if (!isValid) {
                consola.warn(`Invalid styleRanges: ${JSON.stringify(this.styleRanges)}. Using default style.`);
            }
            return textRanges;
        }
    }
};
</script>

<template>
  <div>
    <span
      v-for="(part, i) in styledText"
      :key="`text-${i}`"
      :style="{
        fontSize: part.fontSize ? part.fontSize +'px' : null,
        color: part.color,
        fontWeight: part.bold ? 'bold': null,
        fontStyle: part.italic ? 'italic' : null
      }"
    >{{ part.text }}</span>
  </div>
</template>

<style lang="postcss" scoped>
div {
  overflow: hidden;
  line-height: 1.1;
}

span {
  white-space: pre-wrap;
}
</style>
