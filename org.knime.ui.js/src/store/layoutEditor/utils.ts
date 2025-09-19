import { reactive } from "vue";

import {
  type LayoutEditorColumn,
  type LayoutEditorItem,
  type LayoutEditorNode,
  type LayoutEditorNodeType,
  type LayoutEditorRowItem,
  type LayoutEditorViewLayout,
  type RowElementTemplate,
  isRowItem,
  isViewItem,
} from "@/store/layoutEditor/types/view";
import { layoutEditorGridSize } from "@/style/shapes";

import type {
  ConfigurationLayout,
  ConfigurationLayoutEditorNode,
} from "./types/configuration";

export const getEmptyLayout = (): LayoutEditorViewLayout => {
  const column = reactive<LayoutEditorColumn>({
    content: [],
    widthXS: layoutEditorGridSize,
  });

  return {
    rows: [{ type: "row", columns: [column] }],
    // when the layout is cleared, disable legacy mode by default
    parentLayoutLegacyMode: false,
  };
};

export const getAllColumnArrays = function (layout: LayoutEditorRowItem[]) {
  return layout.reduce((result: LayoutEditorColumn[][], item) => {
    if (
      item.type === "row" &&
      Array.isArray(item.columns) &&
      item.columns.length
    ) {
      result.push(item.columns);
      item.columns.forEach((column) => {
        if (Array.isArray(column.content) && column.content.length) {
          result = result.concat(
            getAllColumnArrays(column.content as LayoutEditorRowItem[]),
          );
        }
      });
    }
    return result;
  }, []);
};

export const getAllContentArrays = function (layout: LayoutEditorRowItem[]) {
  const allColumnArrays = getAllColumnArrays(layout);
  const allContentArrays = allColumnArrays.reduce(
    (result: Array<LayoutEditorItem[]>, columns) => {
      columns.forEach((column) => {
        if (Array.isArray(column.content) && column.content.length) {
          result.push(column.content);
        }
      });
      return result;
    },
    [],
  );

  // add first level as well
  allContentArrays.push(layout);

  return allContentArrays;
};

export const generateRowTemplates = (): RowElementTemplate[] => {
  const rowColumns = [1, 2, 3, 4]; // eslint-disable-line no-magic-numbers

  return rowColumns.map((numberOfColumns) => {
    const columns: LayoutEditorColumn[] = [];
    for (let i = 0; i < numberOfColumns; i++) {
      columns.push({
        content: [],
        widthXS: layoutEditorGridSize / numberOfColumns,
      });
    }
    return {
      name: `${numberOfColumns}-column`,
      data: { type: "row", columns },
    };
  });
};

// clean up the layout:
// - remove columns without a 'content' property
// - remove rows without a 'columns' property
// - remove multiple nodes with the same nodeID
// - add missing widthXS
// - remove duplicate widths if equal
export const cleanLayout = function (
  layout: LayoutEditorViewLayout,
): LayoutEditorViewLayout {
  const nodeIDs: string[] = [];

  const recursiveClean = function (rows: Array<LayoutEditorItem>) {
    const newLayout = rows.filter((item) => {
      if (isRowItem(item)) {
        if (Array.isArray(item.columns)) {
          item.columns = item.columns.filter((column) => {
            if (Array.isArray(column.content)) {
              column.content = recursiveClean(column.content);
              // add widthXS if not existing
              if (!column.hasOwnProperty("widthXS")) {
                column.widthXS = layoutEditorGridSize;
              }
              return true;
            }
            // remove column without 'content' array
            return false;
          });
          return true;
        }
        // remove rows without 'columns' array
        return false;
      } else if (isViewItem(item)) {
        // if nodes are loaded without legacy mode, ensure they respect the current settings
        if (typeof item.useLegacyMode === "undefined") {
          item.useLegacyMode = layout.parentLayoutLegacyMode;
        }
        if (nodeIDs.includes(item.nodeID)) {
          // remove duplicate nodes
          return false;
        }
        nodeIDs.push(item.nodeID);
        return true;
      }
      return true;
    });

    return newLayout;
  };

  return {
    rows: recursiveClean(layout.rows),
    parentLayoutLegacyMode: layout.parentLayoutLegacyMode,
  } as LayoutEditorViewLayout;
};

export const createViewFromNode = ({ layout }: LayoutEditorNode) =>
  JSON.parse(JSON.stringify(layout));

export const createViewFromRowTemplate = ({
  data,
}: RowElementTemplate): LayoutEditorRowItem => JSON.parse(JSON.stringify(data));

type VueSortableEvent = {
  relatedContext: { component: { componentData: { isFirstLevel: boolean } } };
  draggedContext: { element: { type: LayoutEditorNodeType | "row" } };
};
export const checkMove = (event: VueSortableEvent) => {
  // only allow rows to be dropped in first level
  const targetComponent = event.relatedContext.component;
  if (targetComponent?.componentData?.isFirstLevel) {
    if (event.draggedContext.element.type === "row") {
      return true;
    }
    return false;
  }
  return true;
};

export const fillConfigurationLayout = (
  inputLayout: Partial<ConfigurationLayout>,
  nodes: ConfigurationLayoutEditorNode[],
): ConfigurationLayout => {
  const layout: ConfigurationLayout =
    "rows" in inputLayout ? (inputLayout as ConfigurationLayout) : { rows: [] };

  return nodes.reduce((updatedLayout, { nodeID, type }) => {
    // if node is already in layout, do not modify layout
    if (
      updatedLayout.rows.find(
        (row) => row.columns[0].content[0].nodeID === nodeID,
      )
    ) {
      return updatedLayout;
    }

    // otherwise, add node
    return {
      ...updatedLayout,
      rows: [
        ...updatedLayout.rows,
        { type: "row", columns: [{ content: [{ nodeID, type }] }] },
      ],
    };
  }, layout);
};

export const parseNodeDescription = (raw: string) => {
  try {
    return JSON.parse(`"${raw}"`);
  } catch (error) {
    consola.warn("Failed to parse node description", error);
    return raw;
  }
};
