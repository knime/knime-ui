import { reactive } from "vue";

import { GRID_SIZE } from "@/store/componentLayoutEditor/const";
import type {
  ComponentLayout,
  ComponentLayoutColumn,
  ComponentLayoutRow,
} from "@/store/componentLayoutEditor/types";

export const getEmptyLayout = (): ComponentLayout => {
  const column = reactive<ComponentLayoutColumn>({
    content: [],
    widthXS: GRID_SIZE,
  });

  return {
    rows: [{ type: "row", columns: [column] }],
  };
};

// TODO: Fix types
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

// TODO: Fix types
export const getAllContentArrays = function (layout: ComponentLayoutRow[]) {
  const allColumnArrays = getAllColumnArrays(layout);
  const allContentArrays = allColumnArrays.reduce(
    (
      result: Array<ComponentLayoutRow[] | ComponentLayoutColumn[]>,
      columns,
    ) => {
      columns.forEach((column) => {
        if (Array.isArray(column.content) && column.content.length) {
          result.push(column.content as ComponentLayoutColumn[]);
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

export const generateRowTemplates = () => {
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
  const nodeIDs = [];

  const recursiveClean = function (layout: ComponentLayoutRow[]) {
    const newLayout = layout.filter((item) => {
      if (item.type === "row") {
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
