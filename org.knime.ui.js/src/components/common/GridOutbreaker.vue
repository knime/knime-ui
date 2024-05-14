<script>
export default {
  props: {
    columns: {
      type: Number,
      default: 9,
      // eslint-disable-next-line no-magic-numbers
      validator: (value) => value >= 1 && value <= 12,
    },

    color: {
      type: String,
      default: "transparent",
    },
    border: {
      type: String,
      default: null,
    },
  },

  computed: {
    styles() {
      const columns = this.columns;
      return {
        /* expect the component to be in grid-item-X, who's width is 100%. To get the column width,
                first subtract all spaces in between (N cols => N - 1 spaces) and divide by number of columns. */
        /* e.g (9 cols): --grid-outbreaker-column-width: calc((100% - (var(--grid-gap-width) * 8)) / 9); */
        "--grid-outbreaker-column-width": `calc((100% - (var(--grid-gap-width) * ${
          columns - 1
        })) / ${columns})`,
        "--outbreaker-background-color": this.color,
        "--outbreaker-border": this.border,
      };
    },
  },
};
</script>

<template>
  <div class="outbreaker-wrapper" :style="styles">
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.outbreaker-wrapper {
  & :deep(> *) {
    position: relative;
    isolation: isolate;

    /* set this CSS var in the parent component to define the background color */
    background-color: var(--outbreaker-background-color, transparent);

    &::before,
    &::after {
      position: absolute;
      content: "";
      height: 100%;
      top: 0;
      background-color: var(--outbreaker-background-color, transparent);
      z-index: 0; /* so it's behind the grid content, e.g. space card shadow can overlap */
    }

    /* left background extension then has width: 1 gap width + half column width */
    --grid-gap-plus-half-column: calc(
      var(--grid-gap-width) + (var(--grid-outbreaker-column-width) / 2)
    );

    &::before {
      width: var(--grid-gap-plus-half-column);
      left: calc(-1 * var(--grid-gap-plus-half-column));
      border-left: var(--outbreaker-border);

      @media only screen and (max-width: 1180px) {
        display: none;
      }

      @media only screen and (max-width: 900px) {
        display: initial;
      }
    }

    &::after {
      width: 50vw;
      right: -50vw;
    }

    & > * {
      /* needed for shadows to pop out */
      z-index: 1;
      position: relative;
    }
  }
}
</style>
