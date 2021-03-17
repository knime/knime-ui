<script>
export default {
    props: {
        direction: {
            type: String,
            default: 'horizontal',
            validator: val => ['horizontal', 'vertical'].includes(val)
        }
    },
    data() {
        return {
            isMove: false,
            secondaryHeight: null
        };
    },
    methods: {
        beginMove(e) {
            this.$refs.handle.onpointermove = this.move;
            this.$refs.handle.setPointerCapture(e.pointerId);
            this.isMove = true;
        },
        stopMove(e) {
            this.$refs.handle.onpointermove = null;
            this.$refs.handle.releasePointerCapture(e.pointerId);
            this.isMove = false;
        },
        move(e) {
            const rect = this.$refs.secondary.getBoundingClientRect();
            this.secondaryHeight = `${rect.height + (rect.y - e.clientY)}px`;
        }
    }
};
</script>

<template>
  <div :class="['splitter', direction]">
    <div class="primary">
      <slot>Primary</slot>
    </div>
    <div
      ref="handle"
      :class="{'handle': true, 'active': isMove }"
      @pointerdown="beginMove"
      @pointerup="stopMove"
    />
    <div
      ref="secondary"
      class="secondary"
      :style="{'height': secondaryHeight}"
    >
      <slot name="secondary">Secondary</slot>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import "webapps-common/ui/css/variables";

.splitter {
  flex: 1 1 auto;
  overflow: hidden;
  align-items: stretch;
  display: flex;

  & .primary {
    overflow: auto;
    flex: 1 1 auto;
    min-height: 25%;
  }

  & .secondary {
    flex: 1 1 auto;
    height: 40%;
    min-height: 15%;
    overflow: hidden;
  }

  &.horizontal {
    flex-direction: column;

    & .handle {
      cursor: ns-resize;

      &.active {
        cursor: row-resize;
      }
    }
  }

  &.vertical {
    flex-direction: row;

    & .handle {
      cursor: ew-resize;

      &.active {
        cursor: col-resize;
      }
    }
  }

  & .handle {
    padding-top: 3px;
    padding-bottom: 3px;
    border-top: 1px solid var(--knime-silver-sand);

    &:hover {
      border-color: var(--knime-dove-gray);
    }

    &.active {
      border-color: var(--knime-masala);
    }
  }
}
</style>
