<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import { Button } from "@knime/components";

import { useComponentLayoutEditorStore } from "@/store/componentLayoutEditor/componentLayoutEditor";

import AvailableNodesAndElements from "./AvailableNodesAndElements.vue";
import Row from "./layout/Row.vue";

const componentLayoutEditorStore = useComponentLayoutEditorStore();
const { layout, availableNodes } = storeToRefs(componentLayoutEditorStore);

const onClear = () => {
  componentLayoutEditorStore.clearLayout();
};

const onReset = () => {
  componentLayoutEditorStore.resetLayout();
};

const handleDragStart = () => {
  componentLayoutEditorStore.setIsDragging(true);
};

const handleDragEnd = () => {
  componentLayoutEditorStore.setIsDragging(false);
};

onMounted(() => {
  componentLayoutEditorStore.setLayout({
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
        class="layout-preview"
        :is-first-level="true"
        item-key="id"
        @start="handleDragStart"
        @end="handleDragEnd"
      >
        <template #item="{ element, index }">
          <Row
            :key="index"
            :row="element"
            :deletable="layout.rows.length > 1"
          />
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.container {
  background-color: var(--knime-white);
  display: flex;
}

.controls {
  background-color: var(--knime-gray-light-semi);
  height: 50vh;
  padding: var(--space-12) var(--space-12) 0 var(--space-16);
}

.layout {
  overflow-y: auto;
  height: 50vh;
  min-height: 100px;
  padding: var(--space-12) var(--space-16) 0 var(--space-16);
}

.layout-preview {
  /* fill height to be a drag zone on first level */
  min-height: calc(100% - 50px);
  padding-bottom: 20px;
  margin-bottom: 10px;

  /* hide buttons of dragging element and it's children */
  /* stylelint-disable-next-line selector-class-pattern */
  & .sortable-drag button:not(.resizeHandle) {
    visibility: hidden;
  }
}

.alert {
  color: var(--knime-carrot);
}
</style>
