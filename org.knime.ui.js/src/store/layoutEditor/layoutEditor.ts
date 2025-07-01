import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { GRID_SIZE } from "./const";
import { nodesMock } from "./mocks";
import type {
  ComponentLayout,
  ComponentLayoutColumn,
  ComponentLayoutEditorNode,
  ComponentLayoutRow,
} from "./types";
import {
  cleanLayout,
  createViewFromNode,
  generateRowTemplates,
  getAllColumnArrays,
  getAllContentArrays,
  getEmptyLayout,
} from "./utils";

export const useLayoutEditorStore = defineStore("layoutEditor", () => {
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

  // TODO: Type
  const deleteContentItem = (itemToDelete) => {
    const allContentArrays = getAllContentArrays(layout.value.rows);

    for (let contentArray of allContentArrays) {
      let index = contentArray.indexOf(itemToDelete);
      if (index >= 0) {
        // remove item
        contentArray.splice(index, 1);
        break;
      }
    }
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

  const setNodes = (newNodes: ComponentLayoutEditorNode[]) => {
    nodes.value = newNodes;
  };

  const addNode = (node: ComponentLayoutEditorNode) => {
    const view = createViewFromNode(node);

    // find last row
    const lastRow = layout.value.rows[layout.value.rows.length - 1];

    // find and add to first empty column (currently without supporting nesting)
    const emptyColumn = lastRow.columns.find(
      ({ content }) => content.length === 0,
    );
    if (emptyColumn) {
      emptyColumn.content.push(view);
    } else {
      // or last column, if no empty column exists
      lastRow.columns[lastRow.columns.length - 1].content.push(view);
    }
  };

  /**
   * Layout elements
   */
  const elements = ref(generateRowTemplates());

  // TODO: Type
  const addElement = (element) => {
    layout.value.rows.push(element);
  };

  /**
   * Columns
   */
  const addColumn = (row: ComponentLayoutRow) => {
    let newNumberOfColumns = row.columns.length + 1;
    const width = Math.floor(GRID_SIZE / newNumberOfColumns);
    row.columns.push({
      content: [],
      widthXS: width,
    });

    const totalWidth = width * newNumberOfColumns;
    if (totalWidth < GRID_SIZE) {
      const delta = GRID_SIZE - totalWidth;
      const column = row.columns[row.columns.length - 1];
      column.widthXS += delta;
    }
  };

  const deleteColumn = (columnToDelete: ComponentLayoutColumn) => {
    const allColumnArrays = getAllColumnArrays(layout.value.rows);

    for (let columnArray of allColumnArrays) {
      let index = columnArray.indexOf(columnToDelete);

      if (index < 0) {
        continue;
      }

      // resize siblings to fill total grid width
      const lostWidth = columnToDelete.widthXS;
      const sibling1 = columnArray[index - 1];
      const sibling2 = columnArray[index + 1];
      if (sibling1 && sibling2) {
        // there is a left and right sibling, so split width to fill, if divisible by 2
        const numberOfColumnsToSplit = 2;
        if (lostWidth % numberOfColumnsToSplit === 0) {
          const lostWidthSplit = lostWidth / numberOfColumnsToSplit;
          sibling1.widthXS += lostWidthSplit;
          sibling2.widthXS += lostWidthSplit;
        } else {
          sibling1.widthXS += lostWidth;
        }
      } else if (sibling1) {
        // only left sibling, so increase width
        sibling1.widthXS += lostWidth;
      } else {
        // only right sibling, so increase width
        sibling2.widthXS += lostWidth;
      }

      // finally remove the column
      columnArray.splice(index, 1);

      break;
    }
  };

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

  const setResizeColumnInfo = (
    value: {
      column: ComponentLayoutColumn;
      clientX: number;
      gridStepWidth: number;
      originalWidthXS: number;
    } | null,
  ) => {
    if (value === null) {
      resizeColumnInfo.value = null;
      return;
    }

    // to prevent wrapping we need to resize the next sibling as well...
    const resizingColumn = value.column;
    const columns = getAllColumnArrays(layout.value.rows).find((columnArray) =>
      columnArray.includes(resizingColumn),
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

  const resizeColumn = (newWidth: number) => {
    const resizeInfo = resizeColumnInfo.value;

    if (resizeInfo === null) {
      return;
    }

    // min size for column
    if (newWidth < 1) {
      newWidth = 1;
    }

    // calc size of next sibling to prevent wrapping
    const currentWidth = resizeInfo.column.widthXS;
    let delta = currentWidth - newWidth;
    let newSiblingWidth = resizeInfo.nextSibling?.widthXS ?? 0 + delta;
    if (newSiblingWidth < 1) {
      newSiblingWidth = 1;
    }

    // also make sure the total width doesn't exceed the gridSize
    const totalWidth =
      resizeInfo.widthOfOtherSiblings ?? 0 + newWidth + newSiblingWidth;
    if (totalWidth <= GRID_SIZE) {
      // currently we don't support responsive layouts, so set all sizes
      if (resizeInfo.nextSibling) {
        resizeInfo.nextSibling.widthXS = newSiblingWidth;
      }
      resizeInfo.column.widthXS = newWidth;
    }
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
    deleteContentItem,

    // Nodes
    nodes,
    availableNodes,
    setNodes,
    addNode,

    // Layout elements
    elements,
    addElement,

    // Columns
    addColumn,
    deleteColumn,

    // Resizing columns
    resizeColumnInfo,
    setResizeColumnInfo,
    resizeColumn,
  };
});
