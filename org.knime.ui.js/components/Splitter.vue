<script>
/**
 * Splitter component
 */
export default {
    props: {
        direction: {
            type: String,
            default: 'column',
            validator: val => ['column', 'row'].includes(val)
        },
        id: {
            type: String,
            required: true
        },
        secondarySize: {
            type: String,
            default: '40%',
            validator: (str) => /^\d+[%\w]+$/.test(str)
        }
    },
    data() {
        return {
            isMove: false,
            currentSecondarySize: this.secondarySize
        };
    },
    computed: {
        isColumn() {
            return this.direction === 'column';
        },
        isRow() {
            return this.direction === 'row';
        }
    },
    watch: {
        secondaryHeight() {
            if (this.supportLocalStorage()) {
                localStorage.setItem(`ui-splitter-${this.id}`, this.currentSecondarySize);
            }
        }
    },
    beforeMount() {
        if (this.supportLocalStorage()) {
            this.currentSecondarySize = localStorage.getItem(`ui-splitter-${this.id}`) || this.secondarySize;
        }
    },
    methods: {
        supportLocalStorage() {
            return typeof localStorage !== 'undefined';
        },
        beginMove(e) {
            this.$refs.handle.setPointerCapture(e.pointerId);
            this.isMove = true;
        },
        stopMove(e) {
            this.$refs.handle.releasePointerCapture(e.pointerId);
            this.isMove = false;
        },
        move(e) {
            if (this.isMove) {
                const rect = this.$refs.secondary.getBoundingClientRect();
                if (this.isColumn) {
                    this.currentSecondarySize = `${rect.height + (rect.y - e.clientY)}px`;
                } else {
                    this.currentSecondarySize = `${rect.width + (rect.x - e.clientX)}px`;
                }
            }
        }
    }
};
</script>

<template>
  <div
    :id="id"
    :class="['splitter', direction]"
  >
    <div class="primary">
      <slot>Primary</slot>
    </div>
    <div
      ref="handle"
      :class="{'handle': true, 'active': isMove }"
      @pointerdown="beginMove"
      @pointerup="stopMove"
      @pointermove="move"
    />
    <div
      ref="secondary"
      class="secondary"
      :style="{ 'height': isColumn && currentSecondarySize, 'width': isRow && currentSecondarySize }"
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
    flex: 0 0 auto;
    min-height: 15%;
    overflow: hidden;
  }

  &.column {
    flex-direction: column;

    & .primary {
      min-height: 25%;
    }

    & .secondary {
      min-height: 15%;
    }

    & .handle {
      padding-top: 3px;
      padding-bottom: 3px;
      border-top: 1px solid var(--knime-silver-sand);
      cursor: ns-resize;

      &.active {
        cursor: row-resize;
      }
    }
  }

  &.row {
    flex-direction: row;

    & .primary {
      min-width: 25%;
    }

    & .secondary {
      min-width: 15%;
    }

    & .handle {
      padding-left: 3px;
      padding-right: 3px;
      border-left: 1px solid var(--knime-silver-sand);
      cursor: ew-resize;

      &.active {
        cursor: col-resize;
      }
    }
  }

  & .handle {
    &:hover {
      border-color: var(--knime-dove-gray);
    }

    &.active {
      border-color: var(--knime-masala);
    }
  }
}
</style>
