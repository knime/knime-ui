<script>

export default {
    props: {
        scrollMode: {
            type: String,
            default: 'auto',
            validator: (value) => ['auto', 'scroll'].includes(value)
        },

        withBackground: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<template>
  <main
    :class="{
      'scroll-auto': scrollMode === 'auto',
      'scroll-static': scrollMode === 'scroll',
      'with-background': withBackground
    }"
  >
    <slot />
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
  color: var(--knime-masala);
  /* align-items: stretch; */
  overflow-x: hidden;
  height: 100%;
  
  &.with-background {
    background-image: url("@/assets/workflow-entry-page-background.webp");
    background-repeat: no-repeat;
    background-position: bottom right;
    background-size: 100%;
  }

  &.scroll-auto {
    overflow-y: auto;
  }

  &.scroll-static {
    overflow-y: scroll;
  }
}
</style>
