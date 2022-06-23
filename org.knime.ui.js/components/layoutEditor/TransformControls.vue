<script>
import { DIRECTIONS, getNewBounds } from './transform-control-utils';

export default {
    model: {
        prop: 'value',
        event: 'change'
    },
    props: {
        value: {
            type: Object,
            default: () => ({ x: 0, y: 0, width: 0, height: 0 })
        }
    },

    data() {
        return {
            directions: DIRECTIONS,
            isTransforming: false
        };
    },

    methods: {
        onStart({ event, direction }) {
            let startX = event.clientX;
            let startY = event.clientY;

            const el = document.querySelector('.transform-box');
            
            const transformHandler = ({ clientX: moveX, clientY: moveY }) => {
                el.style.cursor = `${direction}-resize`;

                this.$emit('change', getNewBounds(this.value, { startX, startY, moveX, moveY, direction }));
                startX = moveX;
                startY = moveY;
            };

            const mouseUpHandler = () => {
                el.style.cursor = 'initial';
                document.removeEventListener('mousemove', transformHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };

            document.addEventListener('mousemove', transformHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        },

        onStop({ event }) {
            this.isTransforming = false;
            this.$emit('transform:stop', { event });
        }
    }
};
</script>

<template>
  <div class="transform-box">
    <div
      v-for="direction in directions"
      :key="direction"
      class="transform-control"
      :class="`transform-control-${direction}`"
      @mousedown.self.stop="onStart({ event: $event, direction })"
      @mouseup="onStop({ event: $event })"
    />
  </div>
</template>

<style lang="postcss" scoped>
.transform-box {
    width: calc(100% - 4px);
    border: 2px solid;
    position: absolute;
    top: 0;
    left: 0;
    height: calc(100% - 4px);
    z-index: 1;
    margin: 2px;

    & .transform-control {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 2px solid;
        background: black;
    }

    & .transform-control-nw {
        left: -5px;
        top: -5px;
        cursor: nw-resize;
    }
    
    & .transform-control-n {
        top: -5px;
        left: calc(50% - 15px);
        cursor: n-resize;
    }

    & .transform-control-ne {
        right: -5px;
        top: -5px;
        cursor: ne-resize;
    }

    & .transform-control-w {
        left: -5px;
        top: calc(50% - 10px);
        cursor: w-resize;
    }

    & .transform-control-e {
        right: -5px;
        top: calc(50% - 10px);
        cursor: e-resize;
    }

    & .transform-control-sw {
        left: -5px;
        bottom: -5px;
        cursor: sw-resize;
    }

    & .transform-control-s {
        bottom: -5px;
        left: calc(50% - 15px);
        cursor: s-resize;
    }
    
    & .transform-control-se {
        right: -5px;
        bottom: -5px;
        cursor: se-resize;
    }
}
</style>
