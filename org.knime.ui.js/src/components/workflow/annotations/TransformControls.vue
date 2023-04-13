<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapGetters } from 'vuex';

import type { Bounds } from '@/api/gateway-api/generated-api';
// eslint-disable-next-line object-curly-newline
import {
    type Directions,
    DIRECTIONS,
    transformBounds,
    getGridAdjustedBounds,
    getTransformControlPosition,
    CONTROL_SIZE
// eslint-disable-next-line object-curly-newline
} from './transform-control-utils';

export default defineComponent({
    props: {
        showTransformControls: {
            type: Boolean,
            default: false
        },

        initialValue: {
            type: Object as PropType<Bounds>,
            default: () => ({ x: 0, y: 0, width: 0, height: 0 })
        },

        showSelection: {
            type: Boolean,
            default: false
        }
    },

    emits: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transformEnd: (_payload: { bounds: Bounds }) => true
    },

    data() {
        return {
            directions: DIRECTIONS,
            CONTROL_SIZE,
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
            immediate: true,
            deep: true
        }
    },

    methods: {
        onStart({ direction, event }: { event: PointerEvent, direction: Directions }) {
            const startX = this.innerValue.x;
            const startY = this.innerValue.y;
            const origWidth = this.innerValue.width;
            const origHeight = this.innerValue.height;

            // eslint-disable-next-line no-extra-parens
            (event.target as HTMLElement).setPointerCapture(event.pointerId);

            const transformHandler = (_event: MouseEvent) => {
                _event.stopPropagation();
                _event.preventDefault();
                const { clientX, clientY } = _event;
                const [moveX, moveY] = this.screenToCanvasCoordinates([clientX, clientY]);

                this.innerValue = transformBounds(
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

        onStop(event: PointerEvent) {
            // eslint-disable-next-line no-extra-parens
            (event.target as HTMLElement).releasePointerCapture(event.pointerId);
            this.$emit('transformEnd', { bounds: this.innerValue });
        },

        getControlPosition(direction: Directions) {
            return getTransformControlPosition({
                bounds: this.innerValue,
                direction
            });
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
  <g class="transform">
    <slot :transformed-bounds="innerValue" />

    <Portal to="annotation-transform">
      <rect
        v-if="showSelection"
        :width="innerValue.width"
        :height="innerValue.height"
        :x="innerValue.x"
        :y="innerValue.y"
        class="transform-box"
        :stroke="$colors.selection.activeBorder"
        :stroke-width="$shapes.selectedAnnotationStrokeWidth"
        :rx="$shapes.selectedItemBorderRadius"
      />

      <template v-if="showTransformControls">
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
          @pointerup.self.stop="onStop"
        />
      </template>
    </Portal>
  </g>
</template>

<style lang="postcss" scoped>
.transform-box {
    fill: transparent;
    z-index: 1;
    pointer-events: none;
}

.transform-control {
    fill: var(--knime-cornflower);
    stroke: var(--knime-white);
    stroke-width: 1px;
}
</style>
