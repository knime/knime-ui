<script>

const validateStyleRanges = function (styleRanges)  {
    if (!Array.isArray(styleRanges)) {
        return false;
    }
    for (let i = 0; i < styleRanges.length; i++) {
        let range = styleRanges[i];
        if (typeof range.length !== 'number' || typeof range.start !== 'number') {
            return false;
        }
        let nextRange = styleRanges[i + 1];
        if (nextRange && range.start + range.length > nextRange.start) {
            return false;
        }
    }
    return true;
};

export default {
    props: {
        text: {
            type: String,
            default: ''
        },
        styleRanges: {
            type: Array,
            default: () => [],
            validator: validateStyleRanges
        }
    },
    computed: {
        styledText() {
            return this.styleRanges.map(styleRange => ({
                ...styleRange,
                text: this.text.substr(styleRange.start, styleRange.length)
            }));
        }
    }
};
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div>
    <span
      v-for="(part, i) in styledText"
      :key="`text-${i}`"
      :style="{
        fontSize: part.fontSize +'px',
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
}

span {
  white-space: pre-wrap;
}
</style>
