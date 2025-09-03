import { computed, ref } from "vue";
import { API } from "@api";
import { isEqual } from "lodash-es";
import { defineStore } from "pinia";

import { layoutEditorGridSize } from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { useNodeTemplatesStore } from "../nodeTemplates/nodeTemplates";

import type {
  ConfigurationLayout,
  ConfigurationLayoutEditorNode,
} from "./types/configuration";
import {
  type LayoutContext,
  type LayoutEditorColumn,
  type LayoutEditorItem,
  type LayoutEditorItemSizingConfig,
  type LayoutEditorNestedLayoutItem,
  type LayoutEditorNode,
  type LayoutEditorRowItem,
  type LayoutEditorViewItem,
  type LayoutEditorViewLayout,
  type ResizeColumnInfo,
  type RowElementTemplate,
  isViewItem,
} from "./types/view";
import {
  cleanLayout,
  createViewFromNode,
  fillConfigurationLayout,
  generateRowTemplates,
  getAllColumnArrays,
  getAllContentArrays,
  getEmptyLayout,
} from "./utils";

export const useLayoutEditorStore = defineStore("layoutEditor", () => {
  const { toastPresets } = getToastPresets();

  const layoutContext = ref<LayoutContext>(null);

  const setLayoutContext = (value: LayoutContext) => {
    layoutContext.value = value;
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
  const layout = ref<LayoutEditorViewLayout>(getEmptyLayout());
  const initialLayout = ref<string | null>(null);

  const setLayout = (value: LayoutEditorViewLayout) => {
    if (!value.rows) {
      layout.value = getEmptyLayout();
      return;
    }

    // if we don't have a legacy mode set for whatever reason, it must be legacy
    if (typeof value.parentLayoutLegacyMode === "undefined") {
      value.parentLayoutLegacyMode = true;
    }

    const cleanedLayout = cleanLayout(value);

    const layoutAsString = JSON.stringify(cleanedLayout);

    layout.value = JSON.parse(layoutAsString);

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

  /**
   * Columns
   */
  const addColumn = (row: LayoutEditorRowItem) => {
    let newNumberOfColumns = row.columns.length + 1;
    const width = Math.floor(layoutEditorGridSize / newNumberOfColumns);
    row.columns.push({ content: [], widthXS: width });

    row.columns.forEach((column) => {
      column.widthXS = width;
    });

    const totalWidth = width * newNumberOfColumns;
    if (totalWidth < layoutEditorGridSize) {
      const delta = layoutEditorGridSize - totalWidth;
      row.columns[row.columns.length - 1].widthXS += delta;
    }
  };

  const updateColumnContent = (data: {
    column: LayoutEditorColumn;
    newContent: LayoutEditorItem[];
  }) => {
    // ensure newly added nodes respect the current legacy mode settings
    for (let i = 0; i < data.newContent.length; i++) {
      const item = data.newContent[i];
      if (isViewItem(item) && !isEqual(item, data.column.content[i])) {
        item.useLegacyMode = layout.value.parentLayoutLegacyMode;
      }
    }
    data.column.content = data.newContent;
  };

  const deleteColumn = (columnToDelete: LayoutEditorColumn) => {
    const allColumnArrays = getAllColumnArrays(layout.value.rows);

    for (let columnArray of allColumnArrays) {
      let index = columnArray.indexOf(columnToDelete);

      if (index < 0) {
        continue;
      }

      // resize siblings to fill total grid width
      const lostWidth = columnToDelete.widthXS;
      const leftSibling = columnArray[index - 1];
      const rightSibling = columnArray[index + 1];
      if (leftSibling && rightSibling) {
        // there are left and right siblings, so split width to fill, if divisible by 2
        const numberOfColumnsToSplit = 2;
        if (lostWidth % numberOfColumnsToSplit === 0) {
          const lostWidthSplit = lostWidth / numberOfColumnsToSplit;
          leftSibling.widthXS += lostWidthSplit;
          rightSibling.widthXS += lostWidthSplit;
        } else {
          leftSibling.widthXS += lostWidth;
        }
      } else if (leftSibling) {
        leftSibling.widthXS += lostWidth;
      } else {
        rightSibling.widthXS += lostWidth;
      }

      // finally remove the column
      columnArray.splice(index, 1);

      break;
    }
  };

  const deleteContentItem = (itemToDelete: LayoutEditorItem) => {
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
  const nodes = ref<LayoutEditorNode[]>([]);

  const nodeIdsInLayout = computed(() => {
    const allContentArrays = getAllContentArrays(layout.value.rows);
    return allContentArrays
      .flat(1)
      .filter((item) => item.hasOwnProperty("nodeID"))
      .map(
        (item) =>
          (item as LayoutEditorViewItem | LayoutEditorNestedLayoutItem).nodeID,
      );
  });

  const availableNodes = computed(() => {
    return nodes.value.filter(
      ({ nodeID }) => !nodeIdsInLayout.value.includes(nodeID),
    );
  });

  const setNodes = (newNodes: LayoutEditorNode[]) => {
    nodes.value = newNodes;
  };

  const addNode = (node: LayoutEditorNode) => {
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
  const elements = ref<RowElementTemplate[]>(generateRowTemplates());

  const addElement = (element: LayoutEditorRowItem) => {
    layout.value.rows.push(element);
  };

  /**
   * Column sizing
   */
  const resizeColumnInfo = ref<ResizeColumnInfo>(null);

  const isWrappingLayout = computed(() => {
    const allColumnArrays = getAllColumnArrays(layout.value.rows);
    const firstWrappingRow = allColumnArrays.find((columns) => {
      const totalWidth = columns.reduce(
        (total, column) => total + column.widthXS,
        0,
      );
      return totalWidth > layoutEditorGridSize;
    });
    return Boolean(firstWrappingRow);
  });

  const setResizeColumnInfo = (value: ResizeColumnInfo) => {
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
    if (newWidth === resizeInfo.column.widthXS) {
      return;
    }

    // min size for column
    if (newWidth < 1) {
      newWidth = 1;
    }

    // calc size of next sibling to prevent wrapping
    const currentWidth = resizeInfo.column.widthXS;
    let delta = currentWidth - newWidth;
    let newSiblingWidth = (resizeInfo.nextSibling?.widthXS ?? 0) + delta;
    if (newSiblingWidth < 1) {
      newSiblingWidth = 1;
    }

    // also make sure the total width doesn't exceed the gridSize
    const totalWidth =
      (resizeInfo.widthOfOtherSiblings ?? 0) + newWidth + newSiblingWidth;
    if (totalWidth <= layoutEditorGridSize) {
      // currently we don't support responsive layouts, so set all sizes
      if (resizeInfo.nextSibling) {
        resizeInfo.nextSibling.widthXS = newSiblingWidth;
      }
      resizeInfo.column.widthXS = newWidth;
    }
  };

  const updateContentItemConfig = (data: {
    config: LayoutEditorItemSizingConfig;
    item: LayoutEditorViewItem | LayoutEditorNestedLayoutItem;
  }) => {
    // if set to auto, get default resizeMethod from node
    if (data.config.resizeMethod === "auto") {
      const defaultNode = nodes.value.find(
        (node) => node.nodeID === data.item.nodeID,
      );
      data.config.resizeMethod =
        defaultNode && defaultNode.layout.resizeMethod?.indexOf("view") === 0
          ? defaultNode.layout.resizeMethod
          : "viewLowestElement";
    }

    // apply new config; delete unset props
    for (let prop in data.config) {
      const value = data.config[prop];
      if (value) {
        data.item[prop] = value;
      } else {
        delete data.item[prop];
      }
    }
  };

  /**
   * Legacy mode
   */
  const setUseLegacyMode = (value: boolean) => {
    // set parent layout legacy mode
    layout.value.parentLayoutLegacyMode = value;
    // set view legacy mode
    getAllContentArrays(layout.value.rows).forEach((contentArray) => {
      contentArray.forEach((content) => {
        if (
          isViewItem(content) &&
          typeof content.useLegacyMode !== "undefined"
        ) {
          content.useLegacyMode = value;
        }
      });
    });
  };

  const isLegacyModeOutOfSync = computed(() => {
    return getAllContentArrays(layout.value.rows).some((contentArray) =>
      contentArray.some((content) => {
        if (
          isViewItem(content) &&
          typeof content.useLegacyMode !== "undefined"
        ) {
          return content.useLegacyMode !== layout.value.parentLayoutLegacyMode;
        }
        return false;
      }),
    );
  });

  /**
   * Configuration layout
   */
  const configurationLayout = ref<ConfigurationLayout>({ rows: [] });

  const setConfigurationLayout = (value: ConfigurationLayout) => {
    const layoutAsString = JSON.stringify(value);

    configurationLayout.value = JSON.parse(layoutAsString);
  };

  const configurationNodes = ref<ConfigurationLayoutEditorNode[]>([]);

  const setConfigurationNodes = (newNodes: ConfigurationLayoutEditorNode[]) => {
    configurationNodes.value = newNodes;
  };

  /**
   * Loading and saving workflow layout data
   */
  const load = async () => {
    if (layoutContext.value === null) {
      return;
    }

    try {
      const viewLayout = JSON.parse(
        await API.componenteditor.getViewLayout(layoutContext.value),
      );
      const viewNodes = JSON.parse(
        await API.componenteditor.getViewNodes(layoutContext.value),
      );
      const configurationLayout = JSON.parse(
        await API.componenteditor.getConfigurationLayout(layoutContext.value),
      );
      const configurationNodes = JSON.parse(
        await API.componenteditor.getConfigurationNodes(layoutContext.value),
      );

      const nodeTemplateIds = [...viewNodes, ...configurationNodes].map(
        (node) => node.templateId,
      );
      await useNodeTemplatesStore().getNodeTemplates({ nodeTemplateIds });

      const filledConfigurationLayout = configurationNodes.reduce(
        fillConfigurationLayout,
        configurationLayout,
      );

      setLayout(viewLayout);
      setNodes(viewNodes);
      setConfigurationLayout(filledConfigurationLayout);
      setConfigurationNodes(configurationNodes);
    } catch (error) {
      toastPresets.workflow.layoutEditor.loadLayoutAndNodes({ error });
    }
  };

  const save = async () => {
    if (layoutContext.value === null) {
      return;
    }

    try {
      await API.componenteditor.setViewLayout({
        ...layoutContext.value,
        componentViewLayout: JSON.stringify(layout.value),
      });
      await API.componenteditor.setConfigurationLayout({
        ...layoutContext.value,
        componentConfigurationLayout: JSON.stringify(configurationLayout.value),
      });
      layoutContext.value = null;
    } catch (error) {
      toastPresets.workflow.layoutEditor.setLayout({ error });
    }
  };

  return {
    layoutContext,
    setLayoutContext,

    // Dragging state
    isDragging,
    setIsDragging,

    // Layout state
    layout,
    setLayout,
    clearLayout,
    resetLayout,
    addColumn,
    updateColumnContent,
    deleteColumn,
    deleteContentItem,

    // Nodes
    nodes,
    availableNodes,
    setNodes,
    addNode,

    // Layout elements
    elements,
    addElement,

    // Column sizing
    resizeColumnInfo,
    isWrappingLayout,
    setResizeColumnInfo,
    resizeColumn,
    updateContentItemConfig,

    // Legacy mode
    setUseLegacyMode,
    isLegacyModeOutOfSync,

    // Configuration layout
    configurationLayout,
    setConfigurationLayout,
    configurationNodes,
    setConfigurationNodes,

    // Loading and saving workflow layout data
    load,
    save,
  };
});
