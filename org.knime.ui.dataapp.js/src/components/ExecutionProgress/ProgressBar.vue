<script>
export default {
  props: {
    percentage: {
      type: Number,
      required: false,
      default: null,
    },
  },
  computed: {
    progressStyle() {
      return isNaN(this.percentage) || this.percentage < 1
        ? "width:1%;"
        : `width:${this.percentage}%;`;
    },
  },
};
</script>

<template>
  <div class="bar-wrapper">
    <div class="bar" :style="progressStyle" />
  </div>
</template>

<style lang="postcss" scoped>
.bar-wrapper {
  position: absolute;
  width: 100%;
  display: flex;
  align-items: flex-start;
  left: 0;
  top: -5px;
  height: 10px;
}

.bar {
  height: 100%;
  background-color: var(--theme-slider-background-color);
  max-width: 100%;
  border-radius: var(--theme-slider-border-radius);
  transition: width 1s;
}
</style>
