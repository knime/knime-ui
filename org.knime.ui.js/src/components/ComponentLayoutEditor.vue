<script setup lang="ts">
import { onMounted, ref } from "vue";
import Draggable from "vuedraggable";

import { Button } from "@knime/components";

import { useComponentLayoutEditor } from "@/composables/useComponentLayoutEditor";

import AvailableNodesAndElements from "./AvailableNodesAndElements.vue";

const {
  getAvailableNodes,
  layout,
  setLayout,
  clearLayout,
  resetLayout,
  setDragging,
} = useComponentLayoutEditor();

const availableNodes = ref(getAvailableNodes());

console.log(layout);

const onClear = () => {
  clearLayout();
};

const onReset = () => {
  resetLayout();
};

const handleDragStart = () => {
  setDragging(true);
};

const handleDragEnd = () => {
  setDragging(false);
};

onMounted(() => {
  setLayout({
    rows: [
      {
        type: "row",
        columns: [
          {
            content: [
              {
                type: "view",
                scrolling: false,
                nodeID: "1",
                useLegacyMode: false,
                resizeMethod: "aspectRatio4by3",
                autoResize: true,
                sizeHeight: true,
                sizeWidth: false,
              },
              {
                type: "row",
                columns: [
                  {
                    content: [
                      {
                        type: "view",
                        scrolling: false,
                        nodeID: "2",
                        useLegacyMode: true,
                        resizeMethod: "aspectRatio16by9",
                        autoResize: true,
                        sizeHeight: true,
                        sizeWidth: false,
                      },
                      {
                        type: "view",
                        scrolling: false,
                        nodeID: "3",
                        useLegacyMode: true,
                        resizeMethod: "aspectRatio16by9",
                        autoResize: true,
                        sizeHeight: true,
                        sizeWidth: false,
                      },
                      {
                        type: "view",
                        scrolling: false,
                        nodeID: "4",
                        useLegacyMode: true,
                        resizeMethod: "viewLowestElement",
                        autoResize: true,
                        sizeHeight: true,
                        sizeWidth: false,
                      },
                    ],
                    widthXS: 6,
                  },
                  {
                    content: [
                      {
                        type: "row",
                        columns: [
                          {
                            content: [
                              {
                                type: "view",
                                scrolling: false,
                                nodeID: "7",
                                useLegacyMode: true,
                                resizeMethod: "viewLowestElement",
                                autoResize: true,
                                sizeHeight: true,
                                sizeWidth: false,
                              },
                            ],
                            widthXS: 12,
                          },
                        ],
                      },
                      {
                        type: "row",
                        columns: [
                          {
                            content: [
                              {
                                type: "view",
                                scrolling: false,
                                nodeID: "3",
                                useLegacyMode: true,
                                resizeMethod: "aspectRatio16by9",
                                autoResize: true,
                                sizeHeight: true,
                                sizeWidth: false,
                              },
                            ],
                            widthXS: 6,
                          },
                          {
                            content: [
                              {
                                type: "view",
                                scrolling: false,
                                nodeID: "2",
                                useLegacyMode: true,
                                resizeMethod: "aspectRatio16by9",
                                autoResize: true,
                                sizeHeight: true,
                                sizeWidth: false,
                              },
                            ],
                            widthXS: 6,
                          },
                        ],
                      },
                    ],
                    widthXS: 6,
                  },
                ],
              },
            ],
            widthXS: 6,
          },
          {
            content: [
              {
                type: "view",
                scrolling: false,
                nodeID: "1",
                useLegacyMode: true,
                resizeMethod: "aspectRatio16by9",
                autoResize: true,
                sizeHeight: true,
                sizeWidth: false,
              },
            ],
            widthXS: 6,
          },
        ],
      },
      {
        type: "row",
        columns: [
          {
            content: [
              {
                type: "view",
                scrolling: false,
                nodeID: "1",
                useLegacyMode: true,
                resizeMethod: "aspectRatio16by9",
                autoResize: true,
                sizeHeight: true,
                sizeWidth: false,
              },
              {
                type: "view",
                scrolling: false,
                nodeID: "100",
                useLegacyMode: true,
                resizeMethod: "aspectRatio16by9",
                autoResize: true,
                sizeHeight: true,
                sizeWidth: false,
              },
            ],
            widthXS: 12,
          },
        ],
      },
    ],
  });
});
</script>

<template>
  <div class="container">
    <div class="controls">
      <Button
        compact
        with-border
        style="margin-right: 4px"
        title="remove all views and rows"
        @click="onClear"
      >
        clear layout
      </Button>
      <Button
        compact
        with-border
        title="revert to initial state"
        @click="onReset"
      >
        reset layout
      </Button>

      <AvailableNodesAndElements />
    </div>

    <div class="layout">
      <div v-if="availableNodes.length" class="alert" role="alert">
        Views not added into the layout and not disabled in Tab 'Node Usage'
        will be shown below layout. To circumvent unexpected behavior, add all
        views into the layout.
      </div>

      <Draggable
        v-model:list="layout.rows"
        group="content"
        :is-first-level="true"
        item-key="id"
        @start="handleDragStart"
        @end="handleDragEnd"
      >
        <template #item="{ element, index }">
          <div :key="index" :style="{ border: '1px solid red' }">
            {{ element.type }}
          </div>
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.container {
  display: flex;
}

.layout {
  min-height: 100px;
  padding-top: var(--space-8);
}

.alert {
  color: var(--knime-carrot);
}
</style>
