import { describe, expect, it } from "vitest";

import { layoutEditorGridSize } from "@/style/shapes";
import {
  createConfigRow,
  createConfigurationNode,
  createNestedLayout,
  createViewItem,
} from "@/test/factories/layoutEditor";
import type { ConfigurationLayout } from "../types/configuration";
import type {
  LayoutEditorRowItem,
  LayoutEditorViewLayout,
} from "../types/view";
import {
  checkMove,
  cleanLayout,
  fillConfigurationLayout,
  getAllColumnArrays,
  getAllContentArrays,
} from "../utils";

const widthXS = layoutEditorGridSize;

describe("getAllColumnArrays", () => {
  it("returns columns for a single row", () => {
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [
          { content: [], widthXS },
          { content: [], widthXS },
        ],
      },
    ];

    const result = getAllColumnArrays(layout);
    expect(result).toEqual([
      [
        { content: [], widthXS },
        { content: [], widthXS },
      ],
    ]);
  });

  it("returns nested columns arrays", () => {
    const nestedRow: LayoutEditorRowItem = {
      type: "row",
      columns: [{ content: [], widthXS }],
    };
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [{ content: [nestedRow], widthXS }],
      },
    ];

    const result = getAllColumnArrays(layout);
    expect(result).toEqual([
      [
        {
          content: [{ type: "row", columns: [{ content: [], widthXS }] }],
          widthXS,
        },
      ],
      [{ content: [], widthXS }],
    ]);
  });

  it("returns empty array for empty layout", () => {
    const result = getAllColumnArrays([]);
    expect(result).toEqual([]);
  });

  it("returns columns for multiple rows", () => {
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [{ content: [], widthXS }],
      },
      {
        type: "row",
        columns: [
          { content: [], widthXS },
          { content: [], widthXS },
        ],
      },
    ];

    const result = getAllColumnArrays(layout);
    expect(result).toEqual([
      [{ content: [], widthXS }],
      [
        { content: [], widthXS },
        { content: [], widthXS },
      ],
    ]);
  });
});

describe("getAllContentArrays", () => {
  it("returns content arrays for a single row", () => {
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [
          { content: [{ type: "view", nodeID: "v1" }], widthXS },
          { content: [{ type: "view", nodeID: "v2" }], widthXS },
        ],
      },
    ];

    const result = getAllContentArrays(layout);
    expect(result).toEqual([
      [{ type: "view", nodeID: "v1" }],
      [{ type: "view", nodeID: "v2" }],
      layout,
    ]);
  });

  it("returns nested content arrays", () => {
    const nestedRow: LayoutEditorRowItem = {
      type: "row",
      columns: [{ content: [{ type: "view", nodeID: "v3" }], widthXS }],
    };
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [{ content: [nestedRow], widthXS }],
      },
    ];

    const result = getAllContentArrays(layout);
    expect(result).toEqual([
      [
        {
          type: "row",
          columns: [{ content: [{ type: "view", nodeID: "v3" }], widthXS }],
        },
      ],
      [{ type: "view", nodeID: "v3" }],
      layout,
    ]);
  });

  it("returns only the top-level array for empty layout", () => {
    const result = getAllContentArrays([]);
    expect(result).toEqual([[]]);
  });

  it("handles mixed content types", () => {
    const layout: LayoutEditorRowItem[] = [
      {
        type: "row",
        columns: [
          {
            content: [{ type: "view", nodeID: "v1" }, { type: "html" }],
            widthXS,
          },
        ],
      },
    ];

    const result = getAllContentArrays(layout);
    expect(result).toEqual([
      [{ type: "view", nodeID: "v1" }, { type: "html" }],
      layout,
    ]);
  });
});

describe("cleanLayout", () => {
  it("removes columns without content property", () => {
    const layout: LayoutEditorViewLayout = {
      rows: [
        {
          type: "row",
          columns: [
            { content: [], widthXS },
            // @ts-expect-error: Expecting missing content property
            { widthXS },
          ],
        },
      ],
      parentLayoutLegacyMode: false,
    };

    const result = cleanLayout(layout);
    const row = result.rows[0] as LayoutEditorRowItem;
    expect(row.columns.length).toBe(1);
  });

  it("removes rows without columns property", () => {
    const layout: LayoutEditorViewLayout = {
      rows: [
        // @ts-expect-error: Expecting missing columns property
        {
          type: "row",
        },
        {
          type: "row",
          columns: [{ content: [], widthXS }],
        },
      ],
      parentLayoutLegacyMode: false,
    };
    const result = cleanLayout(layout);
    // Only count rows with columns
    const rowsWithColumns = result.rows.filter((r) => r.type === "row");
    expect(rowsWithColumns.length).toBe(1);
  });

  it("removes duplicate nodes with same nodeID", () => {
    const viewNode = createViewItem("n1");
    const layout: LayoutEditorViewLayout = {
      rows: [
        {
          type: "row",
          columns: [{ content: [viewNode], widthXS }],
        },
        {
          type: "row",
          columns: [{ content: [viewNode], widthXS }],
        },
      ],
      parentLayoutLegacyMode: false,
    };

    const result = cleanLayout(layout);
    const nodeIDs = result.rows
      .filter((r) => r.type === "row")
      .flatMap((row) =>
        (row as any).columns.flatMap((col: any) =>
          col.content.map((c: any) => c.nodeID),
        ),
      )
      .filter(Boolean);
    expect(nodeIDs.filter((id) => id === "n1").length).toBe(1);
  });

  it("adds missing widthXS to columns", () => {
    const layout: LayoutEditorViewLayout = {
      // @ts-expect-error: Expecting missing widthXS property
      rows: [{ type: "row", columns: [{ content: [] }] }],
      parentLayoutLegacyMode: false,
    };

    const result = cleanLayout(layout);
    const row = result.rows[0] as LayoutEditorRowItem;
    expect(row.columns[0].widthXS).toBeDefined();
  });

  it("sets legacy mode on views if missing", () => {
    const viewNode = createViewItem("n2");
    const layout: LayoutEditorViewLayout = {
      rows: [
        {
          type: "row",
          columns: [{ content: [viewNode], widthXS }],
        },
      ],
      parentLayoutLegacyMode: true,
    };

    const result = cleanLayout(layout);
    const row = result.rows[0] as LayoutEditorRowItem;
    const view = row.columns[0].content[0];
    expect(view).toEqual(
      expect.objectContaining({ type: "view", useLegacyMode: true }),
    );
  });

  it("allows nestedLayout and html", () => {
    const nestedLayoutItem = createNestedLayout("nl1");
    const htmlItem = { type: "html" as const };
    const layout: LayoutEditorViewLayout = {
      rows: [
        {
          type: "row",
          columns: [
            { content: [nestedLayoutItem], widthXS },
            { content: [htmlItem], widthXS },
          ],
        },
      ],
      parentLayoutLegacyMode: true,
    };

    const result = cleanLayout(layout);
    const row = result.rows[0] as LayoutEditorRowItem;
    const nestedLayout = row.columns[0].content[0];
    expect(nestedLayout.type).toBe("nestedLayout");
    const html = row.columns[1].content[0];
    expect(html.type).toBe("html");
  });
});

describe("checkMove", () => {
  it("should allow row to be dropped at first level", () => {
    const event = {
      relatedContext: { component: { componentData: { isFirstLevel: true } } },
      draggedContext: { element: { type: "row" as const } },
    };

    expect(checkMove(event)).toBe(true);
  });

  it("should not allow non-row to be dropped at first level", () => {
    const event = {
      relatedContext: { component: { componentData: { isFirstLevel: true } } },
      draggedContext: { element: { type: "view" as const } },
    };

    expect(checkMove(event)).toBe(false);
  });

  it("should allow any type to be dropped at non-first level", () => {
    const event = {
      relatedContext: { component: { componentData: { isFirstLevel: false } } },
      draggedContext: { element: { type: "view" as const } },
    };

    expect(checkMove(event)).toBe(true);
  });
});

describe("fillConfigurationLayout", () => {
  it("should add a new configuration row if not present", () => {
    const layout = { rows: [] };

    const result = fillConfigurationLayout(layout, [
      createConfigurationNode({ nodeID: "node1" }),
    ]);
    expect(result.rows.length).toBe(1);
    const configurationNode = result.rows[0].columns[0].content[0];
    expect(configurationNode.nodeID).toBe("node1");
    expect(configurationNode.type).toBe("configuration");
  });

  it("should not add duplicate configuration rows", () => {
    const layout = {
      rows: [createConfigRow("node1")],
    };

    const result = fillConfigurationLayout(layout, [
      createConfigurationNode({ nodeID: "node1" }),
    ]);
    expect(result.rows.length).toBe(1);
  });

  it("should initialize rows if missing", () => {
    const layout = {} as ConfigurationLayout;

    const result = fillConfigurationLayout(layout, [
      createConfigurationNode({ nodeID: "node2" }),
    ]);
    expect(result.rows.length).toBe(1);
    const config = result.rows[0].columns[0].content[0];
    expect(config.nodeID).toBe("node2");
  });

  it("should add multiple configuration rows for different nodeIDs", () => {
    const layout = { rows: [] };

    const result1 = fillConfigurationLayout(layout, [
      createConfigurationNode({ nodeID: "node1" }),
    ]);
    const result2 = fillConfigurationLayout(result1, [
      createConfigurationNode({ nodeID: "node2" }),
    ]);
    expect(result2.rows.length).toBe(2);
    const config1 = result2.rows[0].columns[0].content[0];
    const config2 = result2.rows[1].columns[0].content[0];
    expect(config1.nodeID).toBe("node1");
    expect(config2.nodeID).toBe("node2");
  });
});
