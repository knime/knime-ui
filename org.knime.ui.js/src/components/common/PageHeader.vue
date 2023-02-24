<script>
export default {
    props: {
        title: {
            type: String,
            required: true
        },
        subtitle: {
            type: String,
            default: null
        },
        leftOffset: {
            type: Number,
            default: 0
        }
    }
};
</script>

<template>
  <header>
    <div class="grid-container">
      <div
        v-if="leftOffset"
        :class="`grid-item-${leftOffset}`"
      />
      <div class="button">
        <slot name="button" />
      </div>
      <div
        :class="['title-wrapper', `grid-item-${12 - leftOffset}`, $slots.button ? 'with-button' : '']"
      >
        <span
          v-if="subtitle"
          class="subtitle"
        >
          <slot
            name="icon"
            class="icon"
          />
          {{ subtitle }}
        </span>
        <h1
          class="title"
          :class="{ padded: !subtitle }"
        >
          {{ title }}
        </h1>
      </div>
    </div>
  </header>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

header {
  margin-top: 51px;
  font-family: Roboto, sans-serif;
  min-height: 150px;

  & .grid-container {
    position: relative;
    height: 100%;
  }

  & .button {
    padding-right: 20px;
    margin-left: -60px;
    align-self: center;
  }

  @media only screen and (max-width: 1180px) {
    & .button {
      margin-left: 0;
      position: absolute;
    }

    & .title-wrapper.with-button {
      margin-left: 60px;
    }
  }

  & .title-wrapper {
    display: flex !important;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
  }

  & .subtitle {
    font-size: 16px;
    color: var(--knime-masala);
    display: flex;

    & :slotted(svg) {
      @mixin svg-icon-size 18;

      margin-right: 5px;
      stroke: var(--knime-masala);
    }
  }

  & .title {
    line-height: 42px;
    margin: 0;
    font-size: 36px;
    font-weight: 700;
    color: var(--knime-masala);

    &.padded {
      padding-top: 18px;
    }
  }
}
</style>
