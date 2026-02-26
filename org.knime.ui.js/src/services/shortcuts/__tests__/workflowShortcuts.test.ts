/* eslint-disable max-lines */
import { describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { Node, WorkflowInfo } from "@/api/gateway-api/generated-api";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "@/components/uiExtensions/common/utils";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createNativeNode,
  createPort,
  createWorkflow,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import workflowShortcuts from "../workflowShortcuts";

import { mockShortcutContext } from "./mock-context";

vi.mock("@/environment");

describe("workflowShortcuts", () => {
  const mockedAPI = deepMocked(API);

  const createStore = (stubActions = true) => {
    const mockedStores = mockStores({ stubActions });

    const {
      applicationStore,
      applicationSettingsStore,
      workflowStore,
      selectionStore,
      canvasStore,
      canvasAnchoredComponentsStore,
      uiControlsStore,
    } = mockedStores;

    uiControlsStore.isLocalSaveSupported = true;
    uiControlsStore.isAutoSyncSupported = false;

    applicationSettingsStore.hasClipboardSupport = true;
    // @ts-expect-error
    applicationStore.activeProjectOrigin = {
      providerId: "some-provider",
      spaceId: "some-space",
    };

    applicationStore.availablePortTypes = createAvailablePortTypes();

    // @ts-expect-error
    workflowStore.isWritable = true;
    workflowStore.activeWorkflow = createWorkflow({
      projectId: "activeTestProjectId",
      allowedActions: { canUndo: false },
      info: {
        containerId: "testWorkflow",
        containerType: WorkflowInfo.ContainerTypeEnum.Project,
      },
      parents: [
        { containerId: "root:parent" },
        { containerId: "direct:parent:id" },
      ],
    });
    canvasAnchoredComponentsStore.quickActionMenu = {
      isOpen: false,
      // @ts-expect-error
      props: {},
    };
    // @ts-expect-error
    selectionStore.singleSelectedNode = {
      id: "root:0",
      allowedActions: {},
    };
    // @ts-expect-error
    canvasStore.getVisibleFrame = {
      left: -500,
      top: -500,
      width: 1000,
      height: 1000,
    };

    return mockedStores;
  };

  describe("save", () => {
    it("executes", () => {
      const { applicationStore, desktopInteractionsStore } = createStore();

      // @ts-expect-error
      applicationStore.isUnknownProject = () => false;
      workflowShortcuts.save.execute(mockShortcutContext());
      expect(desktopInteractionsStore.saveProject).toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProjectAs).not.toHaveBeenCalled();
    });

    it("executes when project without origin is open", () => {
      const { applicationStore, desktopInteractionsStore } = createStore();

      // @ts-expect-error
      applicationStore.isUnknownProject = () => true;
      // @ts-expect-error
      applicationStore.activeProjectOrigin = null;
      workflowShortcuts.save.execute(mockShortcutContext());
      expect(desktopInteractionsStore.saveProject).not.toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProjectAs).toHaveBeenCalled();
    });

    it("checks save condition", () => {
      const { applicationStore, uiControlsStore, dirtyProjectsTrackingStore } =
        createStore();

      // @ts-expect-error
      applicationStore.activeProjectOrigin = "origin";
      expect(workflowShortcuts.save.condition?.()).toBe(false);

      // @ts-expect-error
      dirtyProjectsTrackingStore.isDirtyActiveProject = true;
      uiControlsStore.isLocalSaveSupported = false;
      expect(workflowShortcuts.save.condition?.()).toBe(false);

      uiControlsStore.isLocalSaveSupported = true;
      applicationStore.activeProjectId = "knownProjectId";
      expect(workflowShortcuts.save.condition?.()).toBe(true);

      // @ts-expect-error
      dirtyProjectsTrackingStore.isDirtyActiveProject = false;
      expect(workflowShortcuts.save.condition?.()).toBe(false);
    });
  });

  describe("undo/redo", () => {
    it("executes undo", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.undo.execute(mockShortcutContext());
      expect(workflowStore.undo).toHaveBeenCalled();
    });

    it("executes redo", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.redo.execute(mockShortcutContext());
      expect(workflowStore.redo).toHaveBeenCalled();
    });

    it("checks undo condition", () => {
      const { workflowStore } = createStore();

      expect(workflowShortcuts.undo.condition?.()).toBe(false);
      // @ts-expect-error
      workflowStore.activeWorkflow.allowedActions.canUndo = true;
      expect(workflowShortcuts.undo.condition?.()).toBe(true);
    });

    it("checks redo condition", () => {
      const { workflowStore } = createStore();

      expect(workflowShortcuts.redo.condition?.()).toBe(false);
      // @ts-expect-error
      workflowStore.activeWorkflow.allowedActions.canRedo = true;
      expect(workflowShortcuts.redo.condition?.()).toBe(true);
    });
  });

  describe("export", () => {
    it("executes export action", () => {
      const { spaceOperationsStore, applicationStore } = createStore();

      vi.mocked(spaceOperationsStore.exportSpaceItem).mockResolvedValue(
        undefined,
      );
      workflowShortcuts.export.execute(mockShortcutContext());
      expect(spaceOperationsStore.exportSpaceItem).toHaveBeenCalledWith({
        projectId: applicationStore.activeProjectId,
        itemId: applicationStore.activeProjectOrigin!.itemId,
      });
    });

    it("checks export condition", () => {
      const { applicationStore } = createStore();

      applicationStore.activeProjectId = "ExampleProjectId";
      expect(workflowShortcuts.export.condition?.()).toBe(true);
      applicationStore.activeProjectId = null;
      expect(workflowShortcuts.export.condition?.()).toBe(false);
    });
  });

  describe("configure", () => {
    it("executes", () => {
      const { desktopInteractionsStore } = createStore();

      workflowShortcuts.configureNode.execute(mockShortcutContext());
      expect(
        desktopInteractionsStore.openNodeConfiguration,
      ).toHaveBeenCalledWith("root:0");
    });

    it("checks condition for detached dialogs", () => {
      const { uiControlsStore, selectionStore, applicationSettingsStore } =
        createStore();

      uiControlsStore.canConfigureNodes = true;
      applicationSettingsStore.useEmbeddedDialogs = false;
      // check for web dialogs
      // @ts-expect-error
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: Node.DialogTypeEnum.Web,
      });
      expect(workflowShortcuts.configureNode.condition?.()).toBe(true);

      // check for swing dialogs
      // @ts-expect-error
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: Node.DialogTypeEnum.Swing,
      });
      expect(workflowShortcuts.configureNode.condition?.()).toBe(true);

      uiControlsStore.canConfigureNodes = false;
      expect(workflowShortcuts.configureNode.condition?.()).toBe(false);
    });

    it("checks condition for embedded dialogs", () => {
      const { uiControlsStore, selectionStore, applicationSettingsStore } =
        createStore();

      uiControlsStore.canConfigureNodes = true;
      applicationSettingsStore.useEmbeddedDialogs = true;
      // check for web dialogs
      // @ts-expect-error
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: Node.DialogTypeEnum.Web,
      });
      expect(workflowShortcuts.configureNode.condition?.()).toBe(false);

      // check for swing dialogs
      // @ts-expect-error
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: Node.DialogTypeEnum.Swing,
      });
      expect(workflowShortcuts.configureNode.condition?.()).toBe(true);

      uiControlsStore.canConfigureNodes = false;
      expect(workflowShortcuts.configureNode.condition?.()).toBe(false);
    });

    it("checks condition for null dialogTypes", () => {
      const { uiControlsStore, applicationSettingsStore } = createStore();

      uiControlsStore.canConfigureNodes = true;
      applicationSettingsStore.useEmbeddedDialogs = true;
      expect(workflowShortcuts.configureNode.condition?.()).toBe(false);
      applicationSettingsStore.useEmbeddedDialogs = false;
      expect(workflowShortcuts.configureNode.condition?.()).toBe(false);
    });
  });

  describe("configureFlowVariables", () => {
    it("executes", () => {
      const { desktopInteractionsStore } = createStore();

      workflowShortcuts.configureFlowVariables.execute(mockShortcutContext());
      expect(
        desktopInteractionsStore.openFlowVariableConfiguration,
      ).toHaveBeenCalledWith("root:0");
    });

    it("checks condition", () => {
      const { uiControlsStore, selectionStore } = createStore();

      uiControlsStore.canConfigureFlowVariables = true;
      expect(workflowShortcuts.configureFlowVariables.condition?.()).toBe(
        false,
      );

      // @ts-expect-error
      selectionStore.singleSelectedNode.allowedActions = {
        canOpenLegacyFlowVariableDialog: true,
      };
      expect(workflowShortcuts.configureFlowVariables.condition?.()).toBe(true);

      uiControlsStore.canConfigureFlowVariables = false;
      expect(workflowShortcuts.configureFlowVariables.condition?.()).toBe(
        false,
      );
    });
  });

  describe("editNodeComment", () => {
    it("executes", () => {
      const { nodeInteractionsStore } = createStore();

      workflowShortcuts.editNodeComment.execute(mockShortcutContext());
      expect(nodeInteractionsStore.openLabelEditor).toHaveBeenCalledWith(
        "root:0",
      );
    });

    it("cannot edit label if no node is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      expect(workflowShortcuts.editNodeComment.condition?.()).toBe(false);
    });

    it("cannot edit label when workflow is not writable", () => {
      const { selectionStore, workflowStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = { kind: "node", id: "node1" };
      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(workflowShortcuts.editNodeComment.condition?.()).toBe(false);
    });
  });

  describe("editAnnotation", () => {
    it("executes", () => {
      const { selectionStore, annotationInteractionsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedAnnotation = { id: "annotationId1" };
      workflowShortcuts.editAnnotation.execute(mockShortcutContext());
      expect(
        annotationInteractionsStore.setEditableAnnotationId,
      ).toHaveBeenCalledWith("annotationId1");
    });
  });

  describe("clipboard operations", () => {
    it("executes copy", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.copy.execute(mockShortcutContext());
      expect(
        clipboardInteractionsStore.copyOrCutWorkflowParts,
      ).toHaveBeenCalledWith({ command: "copy" });
    });

    it("executes cut", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.cut.execute(mockShortcutContext());
      expect(
        clipboardInteractionsStore.copyOrCutWorkflowParts,
      ).toHaveBeenCalledWith({ command: "cut" });
    });

    it("executes paste", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.paste.execute(mockShortcutContext());
      expect(
        clipboardInteractionsStore.pasteWorkflowParts,
      ).toHaveBeenCalledWith(expect.anything());
    });

    it("checks copy condition", () => {
      const bottomPanel = document.createElement("div");
      bottomPanel.id = EMBEDDED_CONTENT_PANEL_ID__BOTTOM;
      bottomPanel.setAttribute("tabIndex", "0");
      document.body.appendChild(bottomPanel);

      // mock kanvas element and make it the activeElement
      const kanvasElement = document.createElement("div");
      kanvasElement.id = "kanvas";
      kanvasElement.setAttribute("tabIndex", "0");
      document.body.appendChild(kanvasElement);
      kanvasElement.focus();

      expect(document.activeElement).toBe(kanvasElement);

      const { selectionStore, applicationSettingsStore } = createStore();

      expect(workflowShortcuts.copy.condition?.()).toBe(false);

      // @ts-expect-error
      selectionStore.getSelectedNodes = [{ allowedActions: {} }];
      expect(workflowShortcuts.copy.condition?.()).toBe(true);

      bottomPanel.focus();
      expect(document.activeElement).toBe(bottomPanel);
      expect(workflowShortcuts.copy.condition?.()).toBe(false);

      kanvasElement.focus();
      applicationSettingsStore.hasClipboardSupport = false;
      expect(workflowShortcuts.copy.condition?.()).toBe(false);

      kanvasElement.remove();
      expect(workflowShortcuts.copy.condition?.()).toBe(false);
    });

    describe("cut condition checks", () => {
      it("nothing selected, writeable -> disabled", () => {
        const { selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.getSelectedNodes = [];
        expect(workflowShortcuts.cut.condition?.()).toBe(false);
      });

      it("nodes selected, not writeable -> disabled", () => {
        const { selectionStore, workflowStore } = createStore();

        // @ts-expect-error
        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        // @ts-expect-error
        workflowStore.isWritable = false;
        expect(workflowShortcuts.cut.condition?.()).toBe(false);
      });

      it("nodes selected, writeable -> enabled", () => {
        const { selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        expect(workflowShortcuts.cut.condition?.()).toBe(true);
      });

      it("nodes selected, writeable but no clipboard permission -> disabled", () => {
        const { selectionStore, applicationSettingsStore } = createStore();

        // @ts-expect-error
        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        applicationSettingsStore.hasClipboardSupport = false;
        expect(workflowShortcuts.cut.condition?.()).toBe(false);
      });
    });

    it("checks paste condition", () => {
      const { selectionStore, workflowStore, applicationSettingsStore } =
        createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [{ allowedActions: {} }];
      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(workflowShortcuts.paste.condition?.()).toBe(false);

      // @ts-expect-error
      workflowStore.isWritable = true;
      expect(workflowShortcuts.paste.condition?.()).toBe(true);

      applicationSettingsStore.hasClipboardSupport = false;
      expect(workflowShortcuts.paste.condition?.()).toBe(false);
    });
  });

  describe("deleteSelected", () => {
    it("execute: delete selected objects", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.deleteSelected.execute(mockShortcutContext());
      expect(workflowStore.deleteSelectedObjects).toHaveBeenCalled();
    });

    it("execute: delete selected port", () => {
      const { workflowStore, selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.selectedNodePort = {
        nodeId: "someid",
        selectedPortId: "input-1",
      };
      workflowShortcuts.deleteSelected.execute(mockShortcutContext());
      expect(workflowStore.deleteSelectedPort).toHaveBeenCalled();
    });

    it("condition checks when workflow is not writeable", () => {
      const { workflowStore, selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);
    });

    it("condition checks when nothing selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [];
      // @ts-expect-error
      selectionStore.getSelectedConnections = [];
      // @ts-expect-error
      selectionStore.getSelectedBendpointIds = [];
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);

      // port is selected -> shortcut active...
      selectionStore.selectedNodePort.selectedPortId = "input-1";
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(true);
      // ... unless a modification is already in progress
      selectionStore.selectedNodePort.isModificationInProgress = true;
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);
    });

    it("condition checks when one node is not deletable", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: false } },
      ];
      // @ts-expect-error
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);
    });

    it("checks when one connection is not deletable", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      // @ts-expect-error
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: false } },
      ];
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);
    });

    it("condition checks when all selected are deletable", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      // @ts-expect-error
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(true);
    });

    it("condition checks when only nodes are selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(true);
    });

    it("condition checks when dragging", () => {
      const { selectionStore, movingStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      movingStore.isDragging = true;
      expect(workflowShortcuts.deleteSelected.condition?.()).toBe(false);
    });
  });

  describe("openQuickNodeInsertionMenu", () => {
    it.each([
      ["enables", true],
      ["disables", false],
    ])("%s menu if workflow is writeable or not", (_, cond) => {
      const { selectionStore, workflowStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      // @ts-expect-error
      workflowStore.isWritable = cond;
      expect(workflowShortcuts.openQuickNodeInsertionMenu.condition?.()).toBe(
        cond,
      );
    });

    it("opens quick add node menu in global mode if no node is selected", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      workflowShortcuts.openQuickNodeInsertionMenu.execute(
        mockShortcutContext(),
      );
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          position: expect.anything(),
          initialMode: "quick-add",
        },
      });
    });

    const mockNodeTemplate = (length) => ({
      id: "root:4",
      position: { x: 120, y: 53 },
      kind: "node",
      outPorts: Array.from({ length }, (_, index) => ({
        index,
        typeId: PORT_TYPE_IDS.BufferedDataTable,
      })),
    });

    it("opens quick add node menu on the mickey mouse ports if no others are available", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = mockNodeTemplate(1);
      workflowShortcuts.openQuickNodeInsertionMenu.execute(
        mockShortcutContext(),
      );
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 0, typeId: PORT_TYPE_IDS.BufferedDataTable },
          position: expect.anything(),
          positionOrigin: "calculated",
          initialMode: "quick-add",
        },
      });
    });

    it("opens quick add node menu on first none mickey mouse ports", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      // @ts-expect-error
      selectionStore.singleSelectedNode = mockNodeTemplate(3);
      workflowShortcuts.openQuickNodeInsertionMenu.execute(
        mockShortcutContext(),
      );
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 1, typeId: PORT_TYPE_IDS.BufferedDataTable },
          position: expect.anything(),
          positionOrigin: "calculated",
          initialMode: "quick-add",
        },
      });
    });

    it("switch to the next port and reuse current position if menu was already open", () => {
      const {
        selectionStore,
        canvasAnchoredComponentsStore,
        nodeInteractionsStore,
      } = createStore();

      const node = createNativeNode({
        id: "root:4",
        outPorts: [
          { index: 0, typeId: PORT_TYPE_IDS.BufferedDataTable },
          { index: 1, typeId: PORT_TYPE_IDS.BufferedDataTable },
          { index: 2, typeId: PORT_TYPE_IDS.BufferedDataTable },
        ],
      });
      // @ts-expect-error
      selectionStore.singleSelectedNode = node;

      nodeInteractionsStore.getNodeById = vi.fn().mockReturnValue(node);

      // @ts-expect-error
      canvasAnchoredComponentsStore.quickActionMenu = {
        isOpen: true,
        props: {
          nodeId: "root:4",
          port: createPort({ index: 1 }),
          position: { x: 5, y: 8 },
          nodeRelation: "SUCCESSORS",
        },
      };
      workflowShortcuts.openQuickNodeInsertionMenu.execute(
        mockShortcutContext(),
      );
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 2, typeId: PORT_TYPE_IDS.BufferedDataTable },
          position: { x: 5, y: 8 },
          initialMode: "quick-add",
        },
      });
    });
  });

  describe("autoConnectNodes", () => {
    it("should execute for regular ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      // @ts-expect-error
      selectionStore.selectedNodeIds = nodes.map(({ id }) => id);
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoConnectNodesDefault.execute(mockShortcutContext());
      expect(mockedAPI.workflowCommand.AutoConnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: nodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: false,
      });
    });

    it("should execute for flow variable ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      // @ts-expect-error
      selectionStore.selectedNodeIds = nodes.map(({ id }) => id);
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoConnectNodesFlowVar.execute(mockShortcutContext());
      expect(mockedAPI.workflowCommand.AutoConnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: nodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: true,
      });
    });

    it("should not work when no node is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [];
      expect(workflowShortcuts.autoConnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });

    it("should not work when only single node is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [createNativeNode()];
      expect(workflowShortcuts.autoConnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [createNativeNode()];
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      expect(workflowShortcuts.autoConnectNodesDefault.condition?.()).toBe(
        true,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition?.()).toBe(
        true,
      );
    });

    it("should work when multiple nodes are selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoConnectNodesDefault.condition?.()).toBe(
        true,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition?.()).toBe(
        true,
      );
    });

    it("should not work if workflow is not writable", () => {
      const { selectionStore, workflowStore } = createStore();
      // @ts-expect-error
      workflowStore.isWritable = false;

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoConnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });
  });

  describe("autoDisconnectNodes", () => {
    it("should execute for regular ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      // @ts-expect-error
      selectionStore.selectedNodeIds = nodes.map(({ id }) => id);
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoDisconnectNodesDefault.execute(
        mockShortcutContext({ payload: { event: { key: "l" } } }),
      );
      expect(mockedAPI.workflowCommand.AutoDisconnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: nodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: false,
      });
    });

    it("should execute for flow variable ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      // @ts-expect-error
      selectionStore.selectedNodeIds = nodes.map(({ id }) => id);
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoDisconnectNodesFlowVar.execute(
        mockShortcutContext(),
      );
      expect(mockedAPI.workflowCommand.AutoDisconnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: nodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: true,
      });
    });

    it("should not work when no node is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoDisconnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });

    it("should not work when only single node is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [createNativeNode()];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoDisconnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [createNativeNode()];
      // @ts-expect-error
      selectionStore.getSelectedMetanodePortBars = ["in"];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition?.()).toBe(
        true,
      );
      expect(workflowShortcuts.autoDisconnectNodesFlowVar.condition?.()).toBe(
        true,
      );
    });

    it("should work when multiple nodes are selected", () => {
      const { selectionStore } = createStore();

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition?.()).toBe(
        true,
      );
      expect(workflowShortcuts.autoDisconnectNodesFlowVar.condition?.()).toBe(
        true,
      );
    });

    it("should not work if workflow is not writable", () => {
      const { selectionStore, workflowStore } = createStore();
      // @ts-expect-error
      workflowStore.isWritable = false;

      // @ts-expect-error
      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition?.()).toBe(
        false,
      );
      expect(workflowShortcuts.autoDisconnectNodesFlowVar.condition?.()).toBe(
        false,
      );
    });
  });

  describe("shuffleSelectedPort", () => {
    it("executes:", () => {
      const { selectionStore } = createStore();

      vi.mocked(selectionStore.getNextSelectedPort).mockReturnValueOnce(
        "input-1",
      );
      workflowShortcuts.shuffleSelectedPort.execute(mockShortcutContext());
      expect(selectionStore.updateSelectedNodePort).toHaveBeenLastCalledWith({
        nodeId: selectionStore.singleSelectedNode!.id,
        selectedPortId: "input-1",
      });
    });

    it("checks condition:", () => {
      // ideal condition
      const { selectionStore, workflowStore } = createStore();

      expect(workflowShortcuts.shuffleSelectedPort.condition?.()).toBe(true);

      // no single node selected
      // @ts-expect-error
      selectionStore.singleSelectedNode = null;
      expect(workflowShortcuts.shuffleSelectedPort.condition?.()).toBe(false);

      // workflow read-only
      // @ts-expect-error
      selectionStore.singleSelectedNode = {
        id: "root:0",
        allowedActions: {},
      };
      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(workflowShortcuts.shuffleSelectedPort.condition?.()).toBe(false);
    });
  });
});
