<script>
/* eslint-disable no-magic-numbers */
import TransformControls from './TransformControls.vue';
import * as echarts from 'echarts';
import { barChart as bar, lineChart as line, heatmapChart as heatmap } from './chart-options';
import { mixin as clickaway } from 'vue-clickaway2';

const renderChart = (element, chartTypeOptions) => {
    // initialize the echarts instance
    const myChart = echarts.init(element);
    // Draw the chart
    myChart.setOption(chartTypeOptions);

    return myChart;
};

export default {
    components: {
        TransformControls
    },
    mixins: [clickaway],
    data() {
        return {
            isTransforming: null,
            blocks: {
                'block-1': {
                    id: 'block-1',
                    coords: { x: 17, y: 342, width: 272, height: 202 },
                    chart: 'bar'
                },
                'block-2': {
                    id: 'block-2',
                    coords: { x: 300, y: 342, width: 445, height: 260 },
                    chart: 'line'
                },
                'block-3': {
                    id: 'block-3',
                    coords: { x: 19, y: 660, width: 751, height: 310 },
                    chart: 'heatmap'
                },
                'block-4': {
                    id: 'block-4',
                    coords: { x: 540, y: 20, width: 220, height: 63 },
                    type: 'text',
                    content: 'Browser Usage Data'
                }
            },
            chartRefs: {}
        };
    },
    mounted() {
        Object.values(this.blocks).forEach((block) => {
            const { chart } = block;

            if (chart) {
                const chartContainer = document.querySelector(`#${block.id} .chart-container`);

                if (chartContainer) {
                    const chartOptions = { line, bar, heatmap };
                    const chartInstance = renderChart(chartContainer, chartOptions[chart]);
        
                    this.chartRefs[block.id] = chartInstance;
                }
            }
        });
    },
    methods: {
        modeBlock(id, { clientX, clientY }) {
            // this.isTransforming = null;
            let startX = clientX;
            let startY = clientY;
            const pageElem = this.$refs.page;
            const elem = document.getElementById(id);

            const guideV = document.querySelector(`.guide-v`);
            const guideH = document.querySelector(`.guide-h`);

            const { height: elemHeight, width: elemWidth } = elem.getBoundingClientRect();
            const { height: pageHeight, width: pageWidth } = pageElem.getBoundingClientRect();

            const onMove = (moveEvent) => {
                const newX = startX - moveEvent.clientX;
                const newY = startY - moveEvent.clientY;
                startX = moveEvent.clientX;
                startY = moveEvent.clientY;

                const newTop = elem.offsetTop - newY > 0 && elem.offsetTop - newY + elemHeight < pageHeight
                    ? elem.offsetTop - newY
                    : elem.offsetTop;

                const newLeft = elem.offsetLeft - newX > 0 && elem.offsetLeft - newX + elemWidth < pageWidth
                    ? elem.offsetLeft - newX
                    : elem.offsetLeft;

                const moveGuides = ({ top, left }) => {
                    guideV.style.left = `${left + elemWidth / 2}px`;
                    
                    guideH.style.top = `${top + elemHeight / 2}px`;
                    
                    guideV.style.display = 'block';
                    guideH.style.display = 'block';
                };

                moveGuides({ top: newTop, left: newLeft });

                // function startGuides(targetEl) {
                //     let c = getMyCorners(targetEl);
                //     moveGuides(c.top, c.right);
                //     $('.guide').show();
                // }

                this.updateBlockCoords(id, { x: newLeft, y: newTop });
            };

            const onMoveEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onMoveEnd);
                guideV.style.display = 'none';
                guideH.style.display = 'none';
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onMoveEnd);
        },
        updateBlockCoords(id, coords) {
            this.blocks = {
                ...this.blocks,
                [id]: {
                    ...this.blocks[id],
                    coords: {
                        ...this.blocks[id].coords,
                        ...coords
                    }
                }
            };
            this.chartRefs[id]?.resize();
        }
    }
};
</script>

<template>
  <div class="layout-wrapper">
    <div
      ref="page"
      class="layout-page"
      @click.self="isTransforming = null"
    >
      <div class="guide-h" />
      <div class="guide-v" />

      <div
        v-for="block in blocks"
        :id="block.id"
        :key="block.id"
        class="block"
        :class="{ border: isTransforming !== block.id }"
        :style="{
          top: `${block.coords.y}px`,
          left: `${block.coords.x}px`,
          width: `${block.coords.width}px`,
          height: `${block.coords.height}px`
        }"
        @click="isTransforming = block.id"
        @mousedown="modeBlock(block.id, $event)"
      >
        <TransformControls
          v-if="isTransforming === block.id"
          :value="block.coords"
          @change="updateBlockCoords(block.id, $event)"
        />
        
        <div
          v-if="block.chart"
          class="chart-container"
        />

        <h1 v-if="block.type === 'text'">
          {{ block.content }}
        </h1>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.layout-wrapper {
    background: #eee;
    width: calc(100vw - 51px);

    padding: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.layout-page {
    position: relative;
    background: white;
    height: 1123px;
    width: 794px;
    box-shadow: 0px 1px 4px rgb(0 0 0 / 26%)
}

.block {
    user-select: none;
    position: absolute;
    overflow: hidden;
    
    &.border {
        border: 1px dashed var(--knime-silver-sand);
    }
}

.chart-container {
  height: 100%;
}

h1 {
    margin: 0
}

.guide-h, .guide-v {
    position: absolute;
    display: none;
    left: 0;
    top: 0;
}

.guide-h {
  border-top: 1px dashed var(--knime-coral-dark);
  width: 100vw;
}

.guide-v {
  border-left: 1px dashed var(--knime-coral-dark);
  height: 100vh;
}
</style>
