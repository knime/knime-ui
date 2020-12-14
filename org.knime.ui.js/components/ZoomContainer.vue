<script>
import { mapGetters } from 'vuex';

export default {
    props: {
        scroller: {
            type: HTMLDivElement,
            required: true
        }
    },
    data() {
        return {
            dragging: false
        };
    },
    computed: {
        ...mapGetters('zoom', {
            zoomFactor: 'factor'
        })
    },
    methods: {
        clamp(delta) {
            if (delta === 0) { return 0; }
            return delta < 0 ? -1 : 1;
        },
        onMouseWheel(e) {
            let deltaY = this.clamp(-e.deltaY);
            
            let oldZoomFactor = this.zoomFactor;
            this.$store.commit('zoom/increaseLevel', deltaY);
            if (oldZoomFactor === this.zoomFactor) { return; }
            
            /**
             * Scroll image such that the mouse pointer targets the same point as before (if possible).
             * The formula comes from the observation that for a point (xOrig, yOrig) on the canvas,
             *
             *   zoomFactor * xOrig = scrollLeft + x
             *
             * so
             *
             *   xOrig = (scrollLeft_1 + x_1) / zoomFactor_1 = (scrollLeft_2 + x_2) / zoomFactor_2
             *
             * and solving for scrollLeft_2 yields
             *
             *   scrollLeft_2 = zoomFactor_2 / zoomFactor_1 * (scrollLeft_1 + x_1) - x_2
             *
             * Likewise for y.
             */
            // debugger;
            // let { scroller } = this.$refs;
            let scroller = this.$parent.$el;
            let bcr = scroller.getBoundingClientRect();
            let x = e.clientX - bcr.left;
            let y = e.clientY - bcr.top;
            let oldScrollLeft = scroller.scrollLeft;
            let oldScrollTop = scroller.scrollTop;
            this.$nextTick(() => {
                scroller.scrollLeft = this.zoomFactor / oldZoomFactor * (oldScrollLeft + x) - x;
                scroller.scrollTop = this.zoomFactor / oldZoomFactor * (oldScrollTop + y) - y;
            }, 0);
        }
        // onMouseMove(e) {
        //     if (this.dragging) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //         console.log(e);
        //     }
        // },
        // onMiddleMouseDown(e) {
        //     console.log(e);

        //     this.dragging = true;
        // },
        // onMiddleMouseUp(e) {
        //     console.log(e);
        //     this.dragging = false;
        // }
    }
};
</script>

<template>
  <!-- <div
    ref="scroller2"
    class="scroller"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
  > -->
  <div
    class="content"
    :style="{ transform: `scale(${zoomFactor})` }"
    @wheel.meta.prevent="onMouseWheel"
    @wheel.ctrl.prevent="onMouseWheel"
  >
    <slot />
  </div>
  <!-- </div> -->
</template>

<style scoped>
.scroller {
  /* width: 100%;
  height: 100%;
  overflow: auto; */
}

.content {
  transform-origin: left top;
  transition: ease 400ms all;
}
</style>
