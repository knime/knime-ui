import { reactive } from "vue";

import { GRID_SIZE } from "@/store/layoutEditor/const";
import type {
  ComponentLayout,
  ComponentLayoutColumn,
  ComponentLayoutColumnContent,
  ComponentLayoutNode,
  ComponentLayoutRow,
  RowTemplate,
} from "@/store/layoutEditor/types";

export const isRow = (
  layout: ComponentLayoutColumnContent,
): layout is ComponentLayoutRow =>
  Boolean((layout as ComponentLayoutRow).columns);

export const getEmptyLayout = (): ComponentLayout => {
  const column = reactive<ComponentLayoutColumn>({
    content: [],
    widthXS: GRID_SIZE,
  });

  return {
    rows: [{ type: "row", columns: [column] }],
  };
};

export const getAllColumnArrays = function (layout: ComponentLayoutRow[]) {
  return layout.reduce((result: ComponentLayoutColumn[][], item) => {
    if (
      item.type === "row" &&
      Array.isArray(item.columns) &&
      item.columns.length
    ) {
      result.push(item.columns);
      item.columns.forEach((column) => {
        if (Array.isArray(column.content) && column.content.length) {
          result = result.concat(
            getAllColumnArrays(column.content as ComponentLayoutRow[]),
          );
        }
      });
    }
    return result;
  }, []);
};

export const getAllContentArrays = function (layout: ComponentLayoutRow[]) {
  const allColumnArrays = getAllColumnArrays(layout);
  const allContentArrays = allColumnArrays.reduce(
    (result: Array<ComponentLayoutColumnContent[]>, columns) => {
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

export const generateRowTemplates = (): RowTemplate[] => {
  const rowColumns = [1, 2, 3, 4]; // eslint-disable-line no-magic-numbers

  return rowColumns.map((numberOfColumns) => {
    const columns: ComponentLayoutColumn[] = [];
    for (let i = 0; i < numberOfColumns; i++) {
      columns.push({ content: [], widthXS: GRID_SIZE / numberOfColumns });
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
export const cleanLayout = function (layout: ComponentLayout) {
  const nodeIDs: string[] = [];

  const recursiveClean = function (
    layout: Array<ComponentLayoutColumnContent>,
  ) {
    const newLayout = layout.filter((item) => {
      if (isRow(item)) {
        if (Array.isArray(item.columns)) {
          item.columns = item.columns.filter((column) => {
            if (Array.isArray(column.content)) {
              column.content = recursiveClean(column.content);

              // add widthXS if not existing
              if (!column.hasOwnProperty("widthXS")) {
                column.widthXS = GRID_SIZE;
              }

              return true;
            } else {
              // remove column without 'content' array
              return false;
            }
          });
          return true;
        } else {
          // remove rows without 'columns' array
          return false;
        }
      } else if (item.hasOwnProperty("nodeID")) {
        if (nodeIDs.includes(item.nodeID)) {
          // remove duplicate nodes
          return false;
        } else {
          nodeIDs.push(item.nodeID);
          return true;
        }
      } else {
        return true;
      }
    });

    return newLayout;
  };

  return { rows: recursiveClean(layout.rows) };
};

export const createViewFromNode = ({ layout }: ComponentLayoutNode) =>
  JSON.parse(JSON.stringify(layout));

export const createViewFromRowTemplate = ({
  data,
}: RowTemplate): ComponentLayoutRow => JSON.parse(JSON.stringify(data));

export const checkMove = (event) => {
  // only allow rows to be dropped in first level
  const targetComponent = event.relatedContext.component;
  if (targetComponent?.options?.isFirstLevel) {
    if (event.draggedContext.element.type === "row") {
      return true;
    }
    return false;
  }
  return true;
};
