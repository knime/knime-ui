/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { ComponentEditorConfig } from "@/api/gateway-api/generated-api";
import { layoutEditorGridSize } from "@/style/shapes";
import {
  NODE_FACTORIES,
  createAvailablePortTypes,
  createNodeTemplate,
} from "@/test/factories";
import {
  createColumn,
  createComplexLayout,
  createConfigurationLayout,
  createConfigurationNodes,
  createEmptyRow,
  createNodes,
  createResizeColumnInfo,
  createViewItem,
} from "@/test/factories/layoutEditor";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import type {
  LayoutContext,
  LayoutEditorRowItem,
  LayoutEditorViewItem,
} from "../types/view";
import * as layoutEditorUtils from "../utils";

const mockedAPI = deepMocked(API);

const projectId = "someMockProjectId";
const workflowId = "someMockWorkflowId";
const nodeId = "someMockNodeId";
const widthXS = layoutEditorGridSize;

describe("layoutEditor", () => {
  const setupStore = () => {
    const { layoutEditorStore, applicationStore, nodeTemplatesStore } =
      mockStores();

    return { layoutEditorStore, applicationStore, nodeTemplatesStore };
  };

  describe("open workflow state", () => {
    const workflow: LayoutContext = { projectId, workflowId, nodeId };

    it("inits with open workflow as null", () => {
      const { layoutEditorStore } = setupStore();

      expect(layoutEditorStore.layoutContext).toBeNull();
    });

    it("sets open workflow to provided value", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.setLayoutContext(workflow);

      expect(layoutEditorStore.layoutContext).toEqual(workflow);
    });

    it("resets open workflow to null when provided null", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.setLayoutContext(null);

      expect(layoutEditorStore.layoutContext).toBeNull();
    });
  });

  describe("dragging state", () => {
    it("inits with isDragging flag as false", () => {
      const { layoutEditorStore } = setupStore();

      expect(layoutEditorStore.isDragging).toBe(false);
    });

    it("sets isDragging flag to provided value", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.setIsDragging(true);

      expect(layoutEditorStore.isDragging).toBe(true);
    });
  });

  describe("layout state", () => {
    it("inits with a generated empty layout", () => {
      const { layoutEditorStore } = setupStore();

      const expected = layoutEditorUtils.getEmptyLayout();
      expect(layoutEditorStore.layout).toEqual(expected);
    });

    it("sets layout to generated empty layout if invalid value is provided", () => {
      const { layoutEditorStore } = setupStore();

      const payload = {};
      // @ts-expect-error: Expecting invalid payload
      layoutEditorStore.setLayout(payload);

      const expected = layoutEditorUtils.getEmptyLayout();
      expect(layoutEditorStore.layout).toEqual(expected);
    });

    it("sets parent legacy mode to true if not provided", () => {
      const { layoutEditorStore } = setupStore();

      const payload = { rows: [] };
      // @ts-expect-error: Expecting invalid payload
      layoutEditorStore.setLayout(payload);

      expect(layoutEditorStore.layout.parentLayoutLegacyMode).toBe(true);
    });

    it("calls cleanLayout to ensure provided value is valid, and sets it to the store", () => {
      const { layoutEditorStore } = setupStore();
      const cleanLayoutSpy = vi.spyOn(layoutEditorUtils, "cleanLayout");

      const payload = createComplexLayout();
      layoutEditorStore.setLayout(payload);

      expect(cleanLayoutSpy).toHaveBeenCalledTimes(1);
      expect(layoutEditorStore.layout).toEqual(payload);
    });

    it("clears layout to generated empty layout", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      expect(layoutEditorStore.layout).toEqual(initialLayout);

      const expected = layoutEditorUtils.getEmptyLayout();
      layoutEditorStore.clearLayout();
      expect(layoutEditorStore.layout).toEqual(expected);
    });

    it("resets layout to initially set layout", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      expect(layoutEditorStore.layout).toEqual(initialLayout);

      layoutEditorStore.discardChanges();
      expect(layoutEditorStore.layout).toEqual(initialLayout);
    });

    it("adds an empty column to provided row and adjusts widths of other columns", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      const firstRow = layoutEditorStore.layout.rows[0];
      expect(firstRow.columns.length).toBe(2);
      expect(firstRow.columns[0].widthXS).toBe(widthXS / 2);

      const newWidth = widthXS / 3;
      layoutEditorStore.addColumn(firstRow);
      expect(firstRow.columns.length).toBe(3);
      expect(firstRow.columns[0].widthXS).toBe(newWidth);
      expect(firstRow.columns[1].widthXS).toBe(newWidth);
    });

    it("updates column content and aligns legacy mode settings when provided the column and the new content", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const newNodeId = "newNodeId";
      const newContent = [createViewItem(newNodeId)];
      expect(newContent[0]).not.toHaveProperty("useLegacyMode");
      layoutEditorStore.updateColumnContent({
        column: layoutEditorStore.layout.rows[0].columns[0],
        newContent,
      });

      expect(layoutEditorStore.layout.rows[0].columns[0].content).toEqual(
        newContent,
      );
      expect(
        layoutEditorStore.layout.rows[0].columns[0].content[0],
      ).toHaveProperty("useLegacyMode", false);
    });

    it("deletes provided column and resizes remaining columns to fill row", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      const row = layoutEditorStore.layout.rows[0].columns[0]
        .content[1] as LayoutEditorRowItem;
      layoutEditorStore.addColumn(row);
      layoutEditorStore.addColumn(row);
      layoutEditorStore.addColumn(row);
      expect(row.columns.length).toBe(5);

      // Don't delete anything if the provided column doesn't exist in layout
      const nonExistingColumn = createColumn();
      layoutEditorStore.deleteColumn(nonExistingColumn);
      expect(row.columns.length).toBe(5);

      // Spread both left and right sibling width
      // if a middle column is deleted that had even width value
      const middleColumnToDelete = row.columns[1];
      layoutEditorStore.deleteColumn(middleColumnToDelete);
      expect(row.columns.length).toBe(4);
      expect(row.columns).not.toContain(middleColumnToDelete);
      expect(row.columns[0].widthXS).toBe(3);
      expect(row.columns[1].widthXS).toBe(3);
      expect(row.columns[2].widthXS).toBe(2);
      expect(row.columns[3].widthXS).toBe(4);

      // Spread only left sibling width
      // if a middle column is deleted that had odd width value
      const anotherMiddleColumnToDelete = row.columns[1];
      layoutEditorStore.deleteColumn(anotherMiddleColumnToDelete);
      expect(row.columns.length).toBe(3);
      expect(row.columns).not.toContain(anotherMiddleColumnToDelete);
      expect(row.columns[0].widthXS).toBe(6);
      expect(row.columns[1].widthXS).toBe(2);
      expect(row.columns[2].widthXS).toBe(4);

      // Spread only right sibling width if the left-most column is deleted
      const leftColumnToDelete = row.columns[0];
      layoutEditorStore.deleteColumn(leftColumnToDelete);
      expect(row.columns.length).toBe(2);
      expect(row.columns).not.toContain(leftColumnToDelete);
      expect(row.columns[0].widthXS).toBe(8);
      expect(row.columns[1].widthXS).toBe(4);

      // Spread only left sibling width if the right-most column is deleted
      const rightColumnToDelete = row.columns[1];
      layoutEditorStore.deleteColumn(rightColumnToDelete);
      expect(row.columns.length).toBe(1);
      expect(row.columns).not.toContain(rightColumnToDelete);
      expect(row.columns[0].widthXS).toBe(12);
    });

    it("deletes a provided column content item", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const itemToDelete =
        layoutEditorStore.layout.rows[0].columns[0].content[0];
      layoutEditorStore.deleteContentItem(itemToDelete);
      expect(layoutEditorStore.layout).not.toContain(itemToDelete);
    });
  });

  describe("all and available nodes state", () => {
    it("inits as an empty array", () => {
      const { layoutEditorStore } = setupStore();

      expect(layoutEditorStore.nodes).toEqual([]);
      expect(layoutEditorStore.availableNodes).toEqual([]);
    });

    it("correctly sets provided nodes and returns nodes that are already in the layout", () => {
      const { layoutEditorStore } = setupStore();

      const initialNodes = createNodes();
      layoutEditorStore.setNodes(initialNodes);
      expect(layoutEditorStore.nodes).toEqual(initialNodes);
      expect(layoutEditorStore.availableNodes).toEqual(initialNodes);

      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const nodeNotInLayout = initialNodes[5];
      expect(layoutEditorStore.availableNodes).toEqual([nodeNotInLayout]);
    });

    it("adds a provided node to the last column of the last row in the layout if the last row had no empty columns", () => {
      const { layoutEditorStore } = setupStore();

      const initialNodes = createNodes();
      layoutEditorStore.setNodes(initialNodes);
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      expect(layoutEditorStore.layout.rows[1].columns.length).toBe(1);

      // Add the available node and assert that it's been added to
      // the last node of the last row
      const nodeNotInLayout = initialNodes[5];
      layoutEditorStore.addNode(nodeNotInLayout);
      expect(layoutEditorStore.availableNodes).toEqual([]);
      expect(layoutEditorStore.layout.rows[1].columns[0].content[1]).toEqual({
        nodeID: nodeNotInLayout.nodeID,
        type: nodeNotInLayout.type,
      });
    });

    it("adds a provided node to the first empty column of the last row in the layout", () => {
      const { layoutEditorStore } = setupStore();

      // Init the state and make sure there's an empty row
      // (a row with a single empty column) at the end
      const initialNodes = createNodes();
      layoutEditorStore.setNodes(initialNodes);
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      layoutEditorStore.layout.rows.push(createEmptyRow());
      expect(layoutEditorStore.layout.rows[2].columns.length).toBe(1);
      expect(layoutEditorStore.layout.rows[2].columns[0].content.length).toBe(
        0,
      );

      // Add the available node and assert that it's been added to
      // the empty column in the last row
      const nodeNotInLayout = initialNodes[5];
      layoutEditorStore.addNode(nodeNotInLayout);
      expect(layoutEditorStore.availableNodes).toEqual([]);
      expect(layoutEditorStore.layout.rows[2].columns[0].content[0]).toEqual({
        nodeID: nodeNotInLayout.nodeID,
        type: nodeNotInLayout.type,
      });
    });
  });

  describe("layout elements (empty rows)", () => {
    it("inits as the full list of available rows", () => {
      const { layoutEditorStore } = setupStore();

      const expected = layoutEditorUtils.generateRowTemplates();
      expect(layoutEditorStore.elements).toEqual(expected);
    });

    it("adds an empty row to the end of the root layout", () => {
      const { layoutEditorStore } = setupStore();
      layoutEditorStore.setLayout(createComplexLayout());

      const elementToAdd = layoutEditorStore.elements[1];
      const rowToAdd =
        layoutEditorUtils.createViewFromRowTemplate(elementToAdd);
      layoutEditorStore.addElement(rowToAdd);
      expect(layoutEditorStore.layout.rows.at(-1)).toEqual(rowToAdd);
    });
  });

  describe("column sizing", () => {
    it("inits as null", () => {
      const { layoutEditorStore } = setupStore();

      expect(layoutEditorStore.resizeColumnInfo).toBeNull();
      expect(layoutEditorStore.isWrappingLayout).toBe(false);
    });

    it("returns isWrappingLayout flag as true if the sum of column widths exceeds grid size", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      layoutEditorStore.layout.rows[0].columns.push(createColumn());

      expect(layoutEditorStore.isWrappingLayout).toBe(true);
    });

    it("sets provided column info and calculates sibling info and resets if provided null", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const initialResizeColumnInfo = createResizeColumnInfo(
        layoutEditorStore.layout.rows[0].columns[0],
      );
      layoutEditorStore.setResizeColumnInfo(initialResizeColumnInfo);
      expect(layoutEditorStore.resizeColumnInfo).toEqual(
        expect.objectContaining(initialResizeColumnInfo),
      );
      expect(layoutEditorStore.resizeColumnInfo?.columns).toEqual(
        layoutEditorStore.layout.rows[0].columns,
      );
      expect(layoutEditorStore.resizeColumnInfo?.nextSibling).toEqual(
        layoutEditorStore.layout.rows[0].columns[1],
      );
      expect(layoutEditorStore.resizeColumnInfo?.widthOfOtherSiblings).toBe(0);

      layoutEditorStore.setResizeColumnInfo(null);
      expect(layoutEditorStore.resizeColumnInfo).toBeNull();
    });

    it("resizes column to provided width", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const resizedColumn = layoutEditorStore.layout.rows[0].columns[0];
      const initialResizeColumnInfo = createResizeColumnInfo(resizedColumn);
      layoutEditorStore.setResizeColumnInfo(initialResizeColumnInfo);

      const newWidth = 5;
      layoutEditorStore.resizeColumn(newWidth);
      expect(layoutEditorStore.resizeColumnInfo?.column.widthXS).toBe(newWidth);
      expect(resizedColumn.widthXS).toBe(newWidth);
    });

    it("does nothing if there is no resizeColumnInfo in state", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.resizeColumn(50);
      expect(layoutEditorStore.resizeColumnInfo).toBeNull();
    });

    it("sets width to 1 if provided width is less than 1", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const resizedColumn = layoutEditorStore.layout.rows[0].columns[0];
      const initialResizeColumnInfo = createResizeColumnInfo(resizedColumn);
      layoutEditorStore.setResizeColumnInfo(initialResizeColumnInfo);

      layoutEditorStore.resizeColumn(-5);
      expect(layoutEditorStore.resizeColumnInfo?.column.widthXS).toBe(1);
      expect(resizedColumn.widthXS).toBe(1);
    });

    it("updates the provided column content item with the provided config", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);

      const item = layoutEditorStore.layout.rows[0].columns[0]
        .content[0] as LayoutEditorViewItem;

      const autoSizingConfig = {
        resizeMethod: "auto" as const,
        maxWidth: 200,
        minHeight: 10,
        minWidth: 20,
      };
      layoutEditorStore.updateContentItemConfig({
        config: autoSizingConfig,
        item,
      });
      expect(item).toEqual(expect.objectContaining(autoSizingConfig));
      expect(item).not.toHaveProperty("maxHeight");

      const aspectRatioSizingConfig = {
        resizeMethod: "aspectRatio16by9" as const,
      };
      layoutEditorStore.updateContentItemConfig({
        config: aspectRatioSizingConfig,
        item,
      });
      expect(item).toEqual(expect.objectContaining(aspectRatioSizingConfig));
    });
  });

  describe("legacy mode", () => {
    it("sets and syncs legacy mode for parent and view", () => {
      const { layoutEditorStore } = setupStore();
      const initialLayout = createComplexLayout();
      layoutEditorStore.setLayout(initialLayout);
      const view = layoutEditorStore.layout.rows[0].columns[0]
        .content[0] as LayoutEditorViewItem;
      expect(layoutEditorStore.layout.parentLayoutLegacyMode).toBe(false);
      expect(view.useLegacyMode).toBe(false);
      expect(layoutEditorStore.isLegacyModeOutOfSync).toBe(true);

      layoutEditorStore.setUseLegacyMode(true);
      expect(layoutEditorStore.layout.parentLayoutLegacyMode).toBe(true);
      expect(view.useLegacyMode).toBe(true);
      expect(layoutEditorStore.isLegacyModeOutOfSync).toBe(false);
    });
  });

  describe("configuration layout", () => {
    it("inits with rows as an empty array", () => {
      const { layoutEditorStore } = setupStore();

      expect(layoutEditorStore.configurationLayout).toEqual({ rows: [] });
    });

    it("sets the configuration layout to provided value", () => {
      const { layoutEditorStore } = setupStore();

      const initialLayout = createConfigurationLayout();
      layoutEditorStore.setConfigurationLayout(initialLayout);

      expect(layoutEditorStore.configurationLayout).toEqual(initialLayout);
    });

    it("inits configuration nodes as an empty array and updates them with provided value", () => {
      const { layoutEditorStore } = setupStore();
      expect(layoutEditorStore.configurationNodes).toEqual([]);

      const initialConfigurationNodes = createConfigurationNodes();
      layoutEditorStore.setConfigurationNodes(initialConfigurationNodes);
      expect(layoutEditorStore.configurationNodes).toEqual(
        initialConfigurationNodes,
      );
    });
  });

  describe("load", () => {
    const { toastPresets } = getToastPresets();
    const componentLoadingFailedSpy = vi.spyOn(
      toastPresets.workflow.layoutEditor,
      "loadLayoutAndNodes",
    );

    afterEach(vi.clearAllMocks);

    it("does nothing if there is no open workflow", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.load();

      expect(
        mockedAPI.componenteditor.getComponentEditorState,
      ).not.toHaveBeenCalled();
    });

    it("shows a toast if any of the requests fail", async () => {
      const error = new Error("test error");
      mockedAPI.componenteditor.getComponentEditorState.mockRejectedValueOnce(
        error,
      );

      const { layoutEditorStore } = setupStore();

      const workflow: LayoutContext = { projectId, workflowId, nodeId };
      layoutEditorStore.setLayoutContext(workflow);
      await layoutEditorStore.load();

      expect(componentLoadingFailedSpy).toHaveBeenCalledExactlyOnceWith({
        error,
      });
    });

    it("fetches data, fills the configuration layout and populates the store with fetched data", async () => {
      const nodeTemplate1 = createNodeTemplate({
        id: NODE_FACTORIES.ExcelTableReaderNodeFactory,
      });
      mockedAPI.noderepository.getNodeTemplates.mockResolvedValue({
        [nodeTemplate1.id]: nodeTemplate1,
      });

      const initialLayout = createComplexLayout();
      const initialNodes = createNodes();
      const initialConfigurationLayout = createConfigurationLayout();
      const initialConfigurationNodes = createConfigurationNodes();
      mockedAPI.componenteditor.getComponentEditorState.mockResolvedValueOnce({
        config: {
          viewLayout: JSON.stringify(initialLayout),
          configurationLayout: JSON.stringify(initialConfigurationLayout),
        },
        viewNodes: initialNodes.map((node) => JSON.stringify(node)),
        configurationNodes: initialConfigurationNodes.map((node) =>
          JSON.stringify(node),
        ),
      });

      const { layoutEditorStore, applicationStore, nodeTemplatesStore } =
        setupStore();
      applicationStore.setAvailablePortTypes(createAvailablePortTypes());
      const nodeTemplateIds = [
        ...initialNodes,
        ...initialConfigurationNodes,
      ].map((node) => node.templateId);

      const workflow: LayoutContext = { projectId, workflowId, nodeId };
      layoutEditorStore.setLayoutContext(workflow);
      await layoutEditorStore.load();

      expect(componentLoadingFailedSpy).not.toHaveBeenCalled();
      expect(
        mockedAPI.componenteditor.getComponentEditorState,
      ).toHaveBeenCalledExactlyOnceWith(workflow);

      expect(layoutEditorStore.layout).toEqual(
        layoutEditorUtils.cleanLayout(initialLayout),
      );
      expect(layoutEditorStore.nodes).toEqual(initialNodes);
      expect(layoutEditorStore.configurationLayout).toEqual({
        rows: [
          {
            columns: [{ content: [{ nodeID: "1", type: "configuration" }] }],
            type: "row",
          },
          {
            columns: [{ content: [{ nodeID: "7", type: "configuration" }] }],
            type: "row",
          },
          {
            columns: [{ content: [{ nodeID: "2", type: "configuration" }] }],
            type: "row",
          },
          {
            columns: [{ content: [{ nodeID: "9", type: "configuration" }] }],
            type: "row",
          },
          {
            columns: [{ content: [{ nodeID: "10", type: "configuration" }] }],
            type: "row",
          },
          {
            columns: [{ content: [{ nodeID: "12", type: "configuration" }] }],
            type: "row",
          },
        ],
      });
      expect(layoutEditorStore.configurationNodes).toEqual(
        initialConfigurationNodes,
      );
      expect(nodeTemplatesStore.getNodeTemplates).toHaveBeenCalledWith({
        nodeTemplateIds: nodeTemplateIds.filter(Boolean),
      });
    });
  });

  describe("save", () => {
    const { toastPresets } = getToastPresets();
    const setLayoutFailedSpy = vi.spyOn(
      toastPresets.workflow.layoutEditor,
      "setLayout",
    );

    afterEach(vi.clearAllMocks);

    it("does nothing if there is no open workflow", () => {
      const { layoutEditorStore } = setupStore();

      layoutEditorStore.save();

      expect(
        mockedAPI.componenteditor.applyComponentEditorConfig,
      ).not.toHaveBeenCalled();
    });

    it("shows a toast if any of the requests fail", async () => {
      const error = new Error("test error");
      mockedAPI.componenteditor.applyComponentEditorConfig.mockRejectedValueOnce(
        error,
      );

      const { layoutEditorStore } = setupStore();

      const workflow: LayoutContext = { projectId, workflowId, nodeId };
      layoutEditorStore.setLayoutContext(workflow);
      await layoutEditorStore.save();

      expect(setLayoutFailedSpy).toHaveBeenCalledExactlyOnceWith({ error });
    });

    it("saves the content of the advanced layout editor", async () => {
      const { layoutEditorStore } = setupStore();

      const dummyData = { foo: "bar" };
      const layoutContext = {
        projectId: "p1",
        workflowId: "w1",
        nodeId: "n1",
      };
      layoutEditorStore.advancedEditorData = {
        contentDraft: JSON.stringify(dummyData),
        dirty: true,
        validity: "valid",
      };
      layoutEditorStore.layoutContext = layoutContext;
      layoutEditorStore.layout = {
        rows: [],
        parentLayoutLegacyMode: false,
      };
      await layoutEditorStore.save();

      expect(layoutEditorStore.advancedEditorData).toEqual({
        contentDraft: null,
        dirty: false,
        validity: "valid",
      });
      expect(layoutEditorStore.layout).toEqual(dummyData);
      expect(
        mockedAPI.componenteditor.applyComponentEditorConfig,
      ).toHaveBeenCalledWith({
        ...layoutContext,
        config: {
          viewLayout: JSON.stringify(dummyData),
          configurationLayout: JSON.stringify({ rows: [] }),
          reporting: "not-available",
        },
      });
    });

    it("saves the layouts for the open workflow and resets open workflow", async () => {
      mockedAPI.componenteditor.applyComponentEditorConfig.mockResolvedValueOnce(
        true,
      );

      const { layoutEditorStore } = setupStore();

      const workflow: LayoutContext = { projectId, workflowId, nodeId };
      layoutEditorStore.setLayoutContext(workflow);
      layoutEditorStore.reporting = ComponentEditorConfig.ReportingEnum.Enabled;
      await layoutEditorStore.save();

      expect(setLayoutFailedSpy).not.toHaveBeenCalled();
      expect(
        mockedAPI.componenteditor.applyComponentEditorConfig,
      ).toHaveBeenCalledExactlyOnceWith({
        ...workflow,
        config: {
          viewLayout: expect.any(String),
          configurationLayout: expect.any(String),
          reporting: "enabled",
        },
      });
    });
  });

  describe("close", () => {
    it("resets state", () => {
      const { layoutEditorStore } = setupStore();
      layoutEditorStore.advancedEditorData.dirty = true;
      layoutEditorStore.advancedEditorData.validity = "invalid";
      layoutEditorStore.advancedEditorData.contentDraft = '{ "foo": "bar" }';
      layoutEditorStore.setLayoutContext({
        nodeId: "n1",
        projectId: "p1",
        workflowId: "wf1",
      });

      layoutEditorStore.close();
      expect(layoutEditorStore.layoutContext).toBeNull();
      expect(layoutEditorStore.advancedEditorData.dirty).toBe(false);
      expect(layoutEditorStore.advancedEditorData.validity).toBe("valid");
      expect(layoutEditorStore.advancedEditorData.contentDraft).toBeNull();
    });
  });
});
