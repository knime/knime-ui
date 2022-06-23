<script>
/* eslint-disable no-magic-numbers */
import TransformControls from './TransformControls.vue';
import * as echarts from 'echarts';

const renderChart = (element) => {
    // initialize the echarts instance
    const myChart = echarts.init(element);
    // Draw the chart
    myChart.setOption({
        title: {
            text: 'ECharts Getting Started Example'
        },
        tooltip: {},
        xAxis: {
            data: ['shirt', 'cardigan', 'chiffon', 'pants', 'heels', 'socks']
        },
        yAxis: {},
        series: [
            {
                name: 'sales',
                type: 'bar',
                data: [5, 20, 36, 10, 10, 20]
            }
        ]
    });

    return myChart;
};

export default {
    components: {
        TransformControls
    },
    data() {
        return {
            isTransforming: null,
            blocks: {
                'block:1': {
                    id: 'block:1',
                    coords: { x: 10, y: 10, width: 150, height: 150 }
                },
                'block:2': {
                    id: 'block:2',
                    coords: { x: 170, y: 240, width: 150, height: 150 }
                },
                'block:3': {
                    id: 'block:3',
                    coords: { x: 300, y: 10, width: 150, height: 150 }
                }
            },
            chartRefs: {}
        };
    },
    mounted() {
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach((view, index) => {
            const chartInstance = renderChart(view);
            this.chartRefs[`block:${index + 1}`] = chartInstance;
        });
    },
    methods: {
        modeBlock(id, { clientX, clientY }) {
            // this.isTransforming = null;
            let startX = clientX;
            let startY = clientY;
            const pageElem = this.$refs.page;
            const elem = document.getElementById(id);

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

                this.updateBlockCoords(id, { x: newLeft, y: newTop });
            };

            const onMoveEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onMoveEnd);
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
    >
      <div
        v-for="block in blocks"
        :id="block.id"
        :key="block.id"
        class="block"
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
        
        <div class="chart-container" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.layout-wrapper {
    background: #eee;
    width: calc(100vw - 51px);
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.layout-page {
    position: relative;
    background: white;
    width: 80%;
    height: 80%;
    box-shadow: 0px 1px 4px rgb(0 0 0 / 26%)
}

.block {
    user-select: none;
    border: 1px solid;
    position: absolute;
}

.chart-container {
  height: 100%;
}
</style>
