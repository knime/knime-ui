import { reactive, ref } from "vue";

import { nodesMock } from "@/components/nodes";

// type ComponentLayoutEditorNodeType = "view";

// type ComponentLayoutEditorNodeLayoutType = "view";

// type ComponentLayoutEditorNodeLayoutResizeMethod = "aspectRatio16by9";

interface ComponentLayoutEditorNodeLayout {
  nodeID: string;
  type: string;
  resizeMethod?: string;
  resizeInterval?: null;
  resizeTolerance?: null;
  autoResize?: boolean;
  scrolling?: boolean;
  sizeHeight?: boolean;
  sizeWidth?: boolean;
  maxHeight?: null;
  maxWidth?: null;
  minHeight?: null;
  minWidth?: null;
  additionalClasses?: string[];
  additionalStyles?: string[];
}

interface ComponentLayoutEditorNode {
  nodeID: string;
  preview: null;
  availableInView: boolean;
  description: string | null;
  icon: Base64URLString;
  type: string;
  layout: ComponentLayoutEditorNodeLayout;
  name: string;
}

interface ComponentLayoutColumn {
  content: unknown[];
  widthXS: number;
}

interface ComponentLayoutRow {
  type: "row";
  columns: ComponentLayoutColumn[];
}

interface ComponentLayout {
  rows: ComponentLayoutRow[];
}

const GRID_SIZE = 12;

const getEmptyLayout = (): ComponentLayout => {
  const column = reactive<ComponentLayoutColumn>({
    content: [],
    widthXS: GRID_SIZE,
  });

  return {
    rows: [{ type: "row", columns: [column] }],
    // when the layout is cleared, disable legacy mode by default
    parentLayoutLegacyMode: false,
  };
};

// TODO: Fix types
const getAllColumnArrays = function (layout: ComponentLayoutRow[]) {
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
const getAllContentArrays = function (layout: ComponentLayoutRow[]) {
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

const generateRowTemplates = () => {
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
const cleanLayout = function (layout: ComponentLayout) {
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

export const useComponentLayoutEditor = () => {
  const dragging = ref<boolean>(false);

  const setDragging = (value: boolean) => {
    dragging.value = value;
  };

  const nodes = ref<ComponentLayoutEditorNode[]>(nodesMock);
  const elements = ref(generateRowTemplates());

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

  const getNodeIdsInLayout = () => {
    const allContentArrays = getAllContentArrays(layout.value.rows);
    console.log("allContentArrays: ", allContentArrays);
    return (
      allContentArrays
        .flat(1)
        .filter((item) => item.hasOwnProperty("nodeID"))
        // TODO: Fix types
        .map((item) => (item as unknown as ComponentLayoutEditorNode).nodeID)
    );
  };

  const getAvailableNodes = () => {
    const nodeIdsInLayout = getNodeIdsInLayout();
    console.log("nodeIdsInLayout: ", nodeIdsInLayout);
    return nodes.value.filter((node) => !nodeIdsInLayout.includes(node.nodeID));
  };

  return {
    dragging,
    setDragging,
    nodes,
    getAvailableNodes,
    elements,
    layout,
    setLayout,
    clearLayout,
    resetLayout,
  };
};
