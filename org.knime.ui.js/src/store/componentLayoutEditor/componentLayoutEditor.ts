import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { nodesMock } from "./mocks";
import type {
  ComponentLayout,
  ComponentLayoutColumn,
  ComponentLayoutEditorNode,
  ComponentLayoutRow,
} from "./types";
import {
  cleanLayout,
  generateRowTemplates,
  getAllColumnArrays,
  getAllContentArrays,
  getEmptyLayout,
} from "./utils";

export const useComponentLayoutEditorStore = defineStore(
  "componentLayoutEditor",
  () => {
    /**
     * Modal
     */
    const isOpen = ref<boolean>(false);

    const setIsOpen = (value: boolean) => {
      isOpen.value = value;
    };

    /**
     * Dragging state
     */
    const isDragging = ref<boolean>(false);

    const setIsDragging = (value: boolean) => {
      isDragging.value = value;
    };

    /**
     * Layout state
     */
    const layout = ref<ComponentLayout>(getEmptyLayout());
    const initialLayout = ref<string | null>(null);

    const setLayout = (value: ComponentLayout) => {
      const cleanedLayout = cleanLayout(value);

      const layoutAsString = JSON.stringify(cleanedLayout);

      // replace current layout with new one
      layout.value = JSON.parse(layoutAsString);

      // save as initial layout
      initialLayout.value = layoutAsString;
    };

    const clearLayout = () => {
      layout.value = getEmptyLayout();
    };

    const resetLayout = () => {
      if (initialLayout.value !== null) {
        layout.value = JSON.parse(initialLayout.value);
      }
    };

    // TODO: Type
    const updateColumnContent = (data) => {
      // TODO: Reach into state?
      data.column.content = data.newContent;
    };

    const updateFirstLevelRows = (rows: ComponentLayoutRow[]) => {
      layout.value.rows = rows;
    };

    /**
     * Nodes
     */
    const nodes = ref<ComponentLayoutEditorNode[]>(nodesMock);

    const nodeIdsInLayout = computed(() => {
      const allContentArrays = getAllContentArrays(layout.value.rows);
      return (
        allContentArrays
          .flat(1)
          .filter((item) => item.hasOwnProperty("nodeID"))
          // TODO: Fix types
          .map((item) => (item as unknown as ComponentLayoutEditorNode).nodeID)
      );
    });

    const availableNodes = computed(() => {
      return nodes.value.filter(
        ({ nodeID }) => !nodeIdsInLayout.value.includes(nodeID),
      );
    });

    /**
     * Layout elements
     */
    const elements = ref(generateRowTemplates());

    /**
     * Resizing columns
     */
    const resizeColumnInfo = ref<{
      column: ComponentLayoutColumn;
      clientX: number;
      gridStepWidth: number;
      originalWidthXS: number;
      columns?: ComponentLayoutColumn[];
      nextSibling?: ComponentLayoutColumn;
      widthOfOtherSiblings?: number;
    } | null>(null);

    const setResizeColumnInfo = (value: {
      column: ComponentLayoutColumn;
      clientX: number;
      gridStepWidth: number;
      originalWidthXS: number;
    }) => {
      if (value === null) {
        resizeColumnInfo.value = null;
        return;
      }

      // to prevent wrapping we need to resize the next sibling as well...
      const resizingColumn = value.column;
      const columns = getAllColumnArrays(layout.value.rows).find(
        (columnArray) => columnArray.includes(resizingColumn),
      );
      const nextSibling = columns?.[columns.indexOf(resizingColumn) + 1];
      const allOtherSiblings = columns?.filter(
        (column) => ![resizingColumn, nextSibling].includes(column),
      );
      const widthOfOtherSiblings = allOtherSiblings?.reduce(
        (total, column) => total + column.widthXS,
        0,
      );

      // ...therefore we save further information about the siblings to be used in resizeColumn()
      resizeColumnInfo.value = {
        ...value,
        columns,
        nextSibling,
        widthOfOtherSiblings,
      };
    };

    return {
      // Modal
      isOpen,
      setIsOpen,

      // Dragging state
      isDragging,
      setIsDragging,

      // Layout state
      layout,
      setLayout,
      clearLayout,
      resetLayout,
      updateColumnContent,
      updateFirstLevelRows,

      // Nodes
      nodes,
      availableNodes,

      // Layout elements
      elements,

      // Resizing columns
      resizeColumnInfo,
      setResizeColumnInfo,
    };
  },
);
