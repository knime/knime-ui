<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import type { Bounds } from '@/api/gateway-api/generated-api';
import { type Directions, DIRECTIONS, getNewBounds, getGridAdjustedBounds } from './transform-control-utils';
import { mapGetters } from 'vuex';

export default defineComponent({
    props: {
        disabled: {
            type: Boolean,
            default: true
        },

        initialValue: {
            type: Object as PropType<Bounds>,
            default: () => ({ x: 0, y: 0, width: 0, height: 0 })
        }
    },

    emits: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transformEnd: (_payload: { newBounds: Bounds }) => true
    },

    data() {
        return {
            directions: DIRECTIONS,
            CONTROL_SIZE: 6,
            innerValue: getGridAdjustedBounds(this.initialValue)
        };
    },

    computed: {
        ...mapGetters('canvas', ['screenToCanvasCoordinates'])
    },

    watch: {
        initialValue: {
            handler() {
                this.innerValue = getGridAdjustedBounds(this.initialValue);
            },
            immediate: true
        }
    },

    methods: {
        onStart({ event, direction }: { event: PointerEvent, direction: Directions }) {
            const startX = this.innerValue.x;
            const startY = this.innerValue.y;
            const origWidth = this.innerValue.width;
            const origHeight = this.innerValue.height;
            // eslint-disable-next-line no-extra-parens
            (event.target as HTMLElement).setPointerCapture(event.pointerId);

            const transformHandler = (_event) => {
                _event.stopPropagation();
                _event.preventDefault();
                const { clientX, clientY } = _event;
                const [moveX, moveY] = this.screenToCanvasCoordinates([clientX, clientY]);

                this.innerValue = getNewBounds(
                    this.innerValue,
                    {
                        startX,
                        startY,
                        origWidth,
                        origHeight,
                        moveX,
                        moveY,
                        direction
                    }
                );
            };

            const mouseUpHandler = () => {
                window.removeEventListener('mousemove', transformHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
            };

            window.addEventListener('mousemove', transformHandler);
            window.addEventListener('mouseup', mouseUpHandler);
        },

        onStop() {
            this.$emit('transformEnd', { newBounds: this.innerValue });
        },

        getControlPosition(controlDirection: Directions) {
            const OFFSET = this.CONTROL_SIZE / 2;

            const { x, y, width, height } = this.innerValue;
            const centerX = () => x + width / 2 - this.CONTROL_SIZE / 2;
            const centerY = () => y + height / 2 - this.CONTROL_SIZE / 2;

            const flushX = () => x + width - this.CONTROL_SIZE + OFFSET;
            const flushY = () => y + height - this.CONTROL_SIZE + OFFSET;

            const offset = (pos: number) => pos - OFFSET;

            const positionMap: Record<Directions, { x: number; y: number }> = {
                nw: { x: offset(x), y: offset(y) },
                n: { x: centerX(), y: offset(y) },
                ne: { x: flushX(), y: offset(y) },
                e: { x: flushX(), y: centerY() },
                se: { x: flushX(), y: flushY() },
                s: { x: centerX(), y: flushY() },
                sw: { x: offset(x), y: flushY() },
                w: { x: offset(x), y: centerY() }
            };

            return positionMap[controlDirection] || { x, y };
        },

        getCursorStyle(direction: Directions) {
            return {
                cursor: `${direction}-resize`
            };
        }
    }
});
</script>

<template>
  <g>
    <slot :transformed-bounds="innerValue" />

    <rect
      v-if="!disabled"
      :width="innerValue.width"
      :height="innerValue.height"
      :x="innerValue.x"
      :y="innerValue.y"
      class="transform-box"
    />

    <template v-if="!disabled">
      <rect
        v-for="direction in directions"
        :key="direction"
        :x="getControlPosition(direction).x"
        :y="getControlPosition(direction).y"
        :width="CONTROL_SIZE"
        :height="CONTROL_SIZE"
        class="transform-control"
        :class="`transform-control-${direction}`"
        :style="getCursorStyle(direction)"
        @click.stop
        @pointerdown.self.stop="onStart({ event: $event, direction })"
        @pointerup="onStop"
      />
    </template>
  </g>
</template>

<style lang="postcss" scoped>
.transform-box {
    fill: transparent;
    stroke-width: 1px;
    stroke: var(--knime-masala);
    z-index: 1;
}
.transform-control {
    fill: var(--knime-masala);
}
</style>
