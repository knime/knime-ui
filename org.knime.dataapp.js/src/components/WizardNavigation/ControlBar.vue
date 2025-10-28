<script lang="ts">
/**
 * Sticky footer component with 3 slots for controls.
 */
export default {
  props: {
    centerAll: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<template>
  <section>
    <div class="grid-container">
      <div :class="['grid-item-12', 'controls', { 'center-all': centerAll }]">
        <div class="control-container left-space">
          <slot name="leftItem" />
        </div>
        <div class="control-container center-space">
          <slot name="centerItem" />
        </div>
        <div class="control-container right-space">
          <slot name="rightItem" />
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
section {
  position: fixed;
  z-index: 2;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: var(--knime-gray-ultra-light);
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);

  /* prevent disappearing controls on small screens */
  min-width: 0;
  white-space: nowrap;

  & .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;

    & .control-container {
      width: 33%;
      display: flex;

      &.left-space {
        justify-content: flex-start;
      }

      &.center-space {
        justify-content: center;
      }

      &.right-space {
        justify-content: flex-end;
      }
    }

    &.center-all .control-container {
      justify-content: center;
    }
  }
}

@media only screen and (width <= 900px) {
  section {
    & .controls {
      & .control-container {
        transform: scale(0.7);

        &.left-space {
          transform-origin: left;
        }

        &.center-space {
          transform-origin: center;
        }

        &.right-space {
          transform-origin: right;

          & :deep(label) {
            margin-right: 15px;
          }
        }
      }
    }
  }
}
</style>
