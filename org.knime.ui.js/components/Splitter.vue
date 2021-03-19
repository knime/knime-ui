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
            secondaryHeight: this.secondarySize
        };
    },
    watch: {
        secondaryHeight() {
            if (this.supportLocalStorage()) {
                localStorage.setItem(`ui-splitter-${this.id}`, this.secondaryHeight);
            }
        }
    },
    beforeMount() {
        if (this.supportLocalStorage()) {
            this.secondaryHeight = localStorage.getItem(`ui-splitter-${this.id}`) || this.secondarySize;
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
                this.secondaryHeight = `${rect.height + (rect.y - e.clientY)}px`;
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
    flex: 0 0 auto;
    min-height: 15%;
    overflow: hidden;
  }

  &.column {
    flex-direction: column;

    & .handle {
      cursor: ns-resize;

      &.active {
        cursor: row-resize;
      }
    }
  }

  &.row {
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
