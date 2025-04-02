/* eslint-disable max-lines */
import { describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { Node } from "@/api/gateway-api/generated-api";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "@/components/uiExtensions/common/utils";
import { isBrowser, isDesktop } from "@/environment";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import { getNextSelectedPort } from "@/util/portSelection";
import workflowShortcuts from "../workflowShortcuts";

vi.mock("@/environment");

vi.mock("@/util/portSelection", () => {
  return {
    getNextSelectedPort: vi.fn(),
  };
});

describe("workflowShortcuts", () => {
  const mockedAPI = deepMocked(API);

  const createStore = () => {
    const {
      applicationStore,
      applicationSettingsStore,
      workflowStore,
      selectionStore,
      desktopInteractionsStore,
      uiControlsStore,
      spaceOperationsStore,
      executionStore,
      nodeInteractionsStore,
      annotationInteractionsStore,
      clipboardInteractionsStore,
      canvasStore,
      movingStore,
      dirtyProjectsTrackingStore,
      canvasAnchoredComponentsStore,
    } = mockStores({ stubActions: true });

    applicationSettingsStore.hasClipboardSupport = true;
    applicationStore.activeProjectOrigin = {
      providerId: "some-provider",
      spaceId: "some-space",
    };
    workflowStore.isWritable = true;
    workflowStore.activeWorkflow = createWorkflow({
      projectId: "activeTestProjectId",
      allowedActions: {
        canUndo: false,
      },
      info: {
        containerId: "testWorkflow",
        containerType: "project",
      },
      parents: [
        {
          containerId: "root:parent",
        },
        {
          containerId: "direct:parent:id",
        },
      ],
    });
    canvasAnchoredComponentsStore.quickActionMenu = {
      isOpen: false,
      props: {},
    };
    selectionStore.singleSelectedNode = {
      id: "root:0",
      allowedActions: {},
    };
    canvasStore.getVisibleFrame = {
      left: -500,
      top: -500,
      width: 1000,
      height: 1000,
    };

    return {
      applicationStore,
      workflowStore,
      selectionStore,
      desktopInteractionsStore,
      uiControlsStore,
      spaceOperationsStore,
      applicationSettingsStore,
      executionStore,
      nodeInteractionsStore,
      annotationInteractionsStore,
      clipboardInteractionsStore,
      canvasStore,
      movingStore,
      dirtyProjectsTrackingStore,
      canvasAnchoredComponentsStore,
    };
  };

  describe("save", () => {
    it("executes", () => {
      const { applicationStore, desktopInteractionsStore } = createStore();

      applicationStore.isUnknownProject = () => false;
      workflowShortcuts.save.execute();
      expect(desktopInteractionsStore.saveProject).toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProjectAs).not.toHaveBeenCalled();
    });

    it("executes when project without origin is open", () => {
      const { applicationStore, desktopInteractionsStore } = createStore();

      applicationStore.isUnknownProject = () => true;
      applicationStore.activeProjectOrigin = null;
      workflowShortcuts.save.execute();
      expect(desktopInteractionsStore.saveProject).not.toHaveBeenCalled();
      expect(desktopInteractionsStore.saveProjectAs).toHaveBeenCalled();
    });

    it("checks save condition", () => {
      const { applicationStore, uiControlsStore, dirtyProjectsTrackingStore } =
        createStore();

      applicationStore.activeProjectOrigin = "origin";
      expect(workflowShortcuts.save.condition()).toBeFalsy();

      dirtyProjectsTrackingStore.isDirtyActiveProject = true;
      uiControlsStore.isLocalSaveSupported = false;
      expect(workflowShortcuts.save.condition()).toBe(false);

      uiControlsStore.isLocalSaveSupported = true;
      applicationStore.activeProjectId = "knownProjectId";
      expect(workflowShortcuts.save.condition()).toBe(true);

      dirtyProjectsTrackingStore.isDirtyActiveProject = false;
      expect(workflowShortcuts.save.condition()).toBe(false);
    });
  });

  describe("undo/redo", () => {
    it("executes undo", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.undo.execute();
      expect(workflowStore.undo).toHaveBeenCalled();
    });

    it("executes redo", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.redo.execute();
      expect(workflowStore.redo).toHaveBeenCalled();
    });

    it("checks undo condition", () => {
      const { workflowStore } = createStore();

      expect(workflowShortcuts.undo.condition()).toBeFalsy();
      workflowStore.activeWorkflow.allowedActions.canUndo = true;
      expect(workflowShortcuts.undo.condition()).toBe(true);
    });

    it("checks redo condition", () => {
      const { workflowStore } = createStore();

      expect(workflowShortcuts.redo.condition()).toBeFalsy();
      workflowStore.activeWorkflow.allowedActions.canRedo = true;
      expect(workflowShortcuts.redo.condition()).toBe(true);
    });
  });

  describe("export", () => {
    it("executes export action", () => {
      const { spaceOperationsStore, applicationStore } = createStore();

      workflowShortcuts.export.execute();
      expect(spaceOperationsStore.exportSpaceItem).toHaveBeenCalledWith({
        projectId: applicationStore.activeProjectId,
        itemId: applicationStore.activeProjectOrigin.itemId,
      });
    });

    it("checks export condition", () => {
      const { applicationStore } = createStore();

      applicationStore.activeProjectId = "ExampleProjectId";
      expect(workflowShortcuts.export.condition()).toBe(true);
      applicationStore.activeProjectId = null;
      expect(workflowShortcuts.export.condition()).toBe(false);
    });
  });

  describe("configure", () => {
    it("executes", () => {
      const { desktopInteractionsStore } = createStore();

      workflowShortcuts.configureNode.execute({});
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
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: "web",
      });
      expect(workflowShortcuts.configureNode.condition()).toBe(true);

      // check for swing dialogs
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: "swing",
      });
      expect(workflowShortcuts.configureNode.condition()).toBe(true);

      uiControlsStore.canConfigureNodes = false;
      expect(workflowShortcuts.configureNode.condition()).toBe(false);
    });

    it("checks condition for embedded dialogs", () => {
      const { uiControlsStore, selectionStore, applicationSettingsStore } =
        createStore();

      uiControlsStore.canConfigureNodes = true;
      applicationSettingsStore.useEmbeddedDialogs = true;
      // check for web dialogs
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: "web",
      });
      expect(workflowShortcuts.configureNode.condition()).toBe(false);

      // check for swing dialogs
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: "swing",
      });
      expect(workflowShortcuts.configureNode.condition()).toBe(true);

      uiControlsStore.canConfigureNodes = false;
      expect(workflowShortcuts.configureNode.condition()).toBe(false);
    });

    it("checks condition for null dialogTypes", () => {
      const { uiControlsStore, selectionStore, applicationSettingsStore } =
        createStore();

      uiControlsStore.canConfigureNodes = true;
      applicationSettingsStore.useEmbeddedDialogs = true;
      selectionStore.singleSelectedNode = createNativeNode({
        dialogType: null,
      });
      expect(workflowShortcuts.configureNode.condition()).toBe(false);
      applicationSettingsStore.useEmbeddedDialogs = false;
      expect(workflowShortcuts.configureNode.condition()).toBe(false);
    });
  });

  describe("configureFlowVariables", () => {
    it("executes", () => {
      const { desktopInteractionsStore } = createStore();

      workflowShortcuts.configureFlowVariables.execute();
      expect(
        desktopInteractionsStore.openFlowVariableConfiguration,
      ).toHaveBeenCalledWith("root:0");
    });

    it("checks condition", () => {
      const { uiControlsStore, selectionStore } = createStore();

      uiControlsStore.canConfigureFlowVariables = true;
      expect(workflowShortcuts.configureFlowVariables.condition()).toBeFalsy();

      selectionStore.singleSelectedNode.allowedActions = {
        canOpenLegacyFlowVariableDialog: true,
      };
      expect(workflowShortcuts.configureFlowVariables.condition()).toBe(true);

      uiControlsStore.canConfigureFlowVariables = false;
      expect(workflowShortcuts.configureFlowVariables.condition()).toBe(false);
    });
  });

  describe("portview shortcuts", () => {
    const eventShiftDigit1 = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      shiftKey: true,
    });
    const eventShiftDigit3 = new KeyboardEvent("keydown", {
      key: "3",
      code: "Digit3",
      shiftKey: true,
    });

    const eventShiftAltDigit1 = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      shiftKey: true,
      altKey: true,
    });
    const eventShiftAltDigit3 = new KeyboardEvent("keydown", {
      key: "3",
      code: "Digit3",
      shiftKey: true,
      altKey: true,
    });

    describe("activateOutputPort", () => {
      it("executes", () => {
        // mock selected node with 4 dummy ports
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{}, {}, {}, {}],
        };
        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit1 },
        });
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith("1");

        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit3 },
        });
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith("3");

        // handle metanodes
        selectionStore.singleSelectedNode.kind = Node.KindEnum.Metanode;
        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit1 },
        });
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith("0");

        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit3 },
        });
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith("2");

        // handle too few outPorts
        vi.clearAllMocks();
        selectionStore.singleSelectedNode.outPorts = [{}, {}];
        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit3 },
        });
        expect(selectionStore.setActivePortTab).not.toBeCalled();
      });

      it("handles views", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          hasView: true,
          outPorts: [{}, {}],
        };
        workflowShortcuts.activateOutputPort.execute({
          payload: { event: eventShiftDigit1 },
        });
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith(
          "view",
        );
      });

      it("checks condition", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = null;
        expect(workflowShortcuts.activateOutputPort.condition()).toBeFalsy(); // no selected node

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [],
        };
        expect(workflowShortcuts.activateOutputPort.condition()).toBeFalsy(); // no output port

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{}],
        };
        expect(workflowShortcuts.activateOutputPort.condition()).toBeTruthy();
      });
    });

    describe("activateFlowVarPort", () => {
      it("executes", () => {
        const { selectionStore } = createStore();

        workflowShortcuts.activateFlowVarPort.execute({});
        expect(selectionStore.setActivePortTab).toHaveBeenLastCalledWith("0");
      });

      it("checks condition", () => {
        const { selectionStore, applicationStore } = createStore();

        selectionStore.singleSelectedNode = null;
        applicationStore.availablePortTypes = {
          mockTypeId: { kind: "not a flowvar" },
        };
        expect(workflowShortcuts.activateFlowVarPort.condition()).toBeFalsy(); // no node selected

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{ typeId: "mockTypeId" }],
        };
        expect(workflowShortcuts.activateFlowVarPort.condition()).toBeFalsy(); // not a flowvar port

        applicationStore.availablePortTypes = {
          mockTypeId: { kind: "flowVariable" },
        };
        expect(workflowShortcuts.activateFlowVarPort.condition()).toBeTruthy();
      });
    });

    describe("detachOutputPort", () => {
      it("executes", () => {
        const { selectionStore, executionStore } = createStore();

        const node = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{}, {}, {}, {}],
        };
        selectionStore.singleSelectedNode = node;
        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftAltDigit1 },
        });
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "1",
        });

        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftAltDigit3 },
        });
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "3",
        });

        selectionStore.singleSelectedNode.hasView = true;
        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftAltDigit1 },
        });
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "view",
        });

        // handle metanodes
        selectionStore.singleSelectedNode.hasView = false;
        selectionStore.singleSelectedNode.kind = Node.KindEnum.Metanode;
        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftDigit1 },
        });
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "0",
        });

        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftDigit3 },
        });
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "2",
        });

        // handle too few outPorts
        vi.clearAllMocks();
        selectionStore.singleSelectedNode.outPorts = [{}, {}];
        workflowShortcuts.detachOutputPort.execute({
          payload: { event: eventShiftDigit3 },
        });
        expect(executionStore.openPortView).not.toBeCalled();
      });

      it("checks condition", () => {
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        const { selectionStore } = createStore();
        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{}],
        };
        expect(workflowShortcuts.detachOutputPort.condition()).toBeTruthy();

        // detach only on desktop
        mockEnvironment("BROWSER", { isBrowser, isDesktop });
        expect(workflowShortcuts.detachOutputPort.condition()).toBeFalsy();

        // no selected node
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        selectionStore.singleSelectedNode = null;
        expect(workflowShortcuts.detachOutputPort.condition()).toBeFalsy();

        // no output ports
        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
          outPorts: [],
        };
        expect(workflowShortcuts.detachOutputPort.condition()).toBeFalsy();
      });
    });

    describe("detachFlowVarPort", () => {
      it("executes", () => {
        const { selectionStore, executionStore } = createStore();

        const node = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{}, {}, {}, {}],
          state: {
            executionState: "IDLE",
          },
        };
        selectionStore.singleSelectedNode = node;
        workflowShortcuts.detachFlowVarPort.execute({});
        expect(executionStore.openPortView).not.toBeCalled();

        selectionStore.singleSelectedNode.state.executionState = "EXECUTED";
        workflowShortcuts.detachFlowVarPort.execute({});
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "0",
        });
      });

      it("checks condition", () => {
        const { selectionStore, applicationStore } = createStore();

        const node = {
          id: "root:0",
          allowedActions: {},
          outPorts: [{ typeId: "mockTypeId" }],
        };
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        selectionStore.singleSelectedNode = node;
        applicationStore.availablePortTypes = {
          mockTypeId: {
            kind: "flowVariable",
          },
        };
        expect(workflowShortcuts.detachFlowVarPort.condition()).toBeTruthy();

        // detach only on desktop
        mockEnvironment("BROWSER", { isBrowser, isDesktop });
        expect(workflowShortcuts.detachFlowVarPort.condition()).toBeFalsy();

        // no selected node
        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        selectionStore.singleSelectedNode = null;
        expect(workflowShortcuts.detachFlowVarPort.condition()).toBeFalsy();

        // no flowVariable port
        selectionStore.singleSelectedNode = node;
        applicationStore.availablePortTypes = {
          mockTypeId: {
            kind: "not a flowVariable",
          },
        };
        expect(workflowShortcuts.detachFlowVarPort.condition()).toBeFalsy();
      });
    });

    describe("detachActiveOutputPort", () => {
      it("executes", () => {
        const { selectionStore, executionStore } = createStore();

        selectionStore.activePortTab = "42";
        const node = selectionStore.singleSelectedNode;
        workflowShortcuts.detachActiveOutputPort.execute({});
        expect(executionStore.openPortView).toHaveBeenLastCalledWith({
          node,
          port: "42",
        });
      });

      it("checks condition", () => {
        const { selectionStore } = createStore();

        selectionStore.singleSelectedNode = null;
        expect(
          workflowShortcuts.detachActiveOutputPort.condition(),
        ).toBeFalsy();

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {},
        };
        mockEnvironment("BROWSER", { isBrowser, isDesktop });
        expect(
          workflowShortcuts.detachActiveOutputPort.condition(),
        ).toBeFalsy();

        mockEnvironment("DESKTOP", { isBrowser, isDesktop });
        expect(
          workflowShortcuts.detachActiveOutputPort.condition(),
        ).toBeFalsy();

        selectionStore.activePortTab = "1";
        expect(
          workflowShortcuts.detachActiveOutputPort.condition(),
        ).toBeTruthy();
      });
    });
  });

  describe("editNodeComment", () => {
    it("executes ", () => {
      const { nodeInteractionsStore } = createStore();

      workflowShortcuts.editNodeComment.execute();
      expect(nodeInteractionsStore.openLabelEditor).toHaveBeenCalledWith(
        "root:0",
      );
    });

    it("cannot edit label if no node is selected", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      expect(workflowShortcuts.editNodeComment.condition()).toBeFalsy();
    });

    it("cannot edit label when workflow is not writable", () => {
      const { selectionStore, workflowStore } = createStore();

      selectionStore.singleSelectedNode = { kind: "node", id: "node1" };
      workflowStore.isWritable = false;
      expect(workflowShortcuts.editNodeComment.condition()).toBe(false);
    });
  });

  describe("editAnnotation", () => {
    it("executes ", () => {
      const { selectionStore, annotationInteractionsStore } = createStore();

      selectionStore.singleSelectedAnnotation = { id: "annotationId1" };
      workflowShortcuts.editAnnotation.execute();
      expect(
        annotationInteractionsStore.setEditableAnnotationId,
      ).toHaveBeenCalledWith("annotationId1");
    });
  });

  describe("clipboard operations", () => {
    it("executes copy", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.copy.execute();
      expect(
        clipboardInteractionsStore.copyOrCutWorkflowParts,
      ).toHaveBeenCalledWith({ command: "copy" });
    });

    it("executes cut", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.cut.execute();
      expect(
        clipboardInteractionsStore.copyOrCutWorkflowParts,
      ).toHaveBeenCalledWith({ command: "cut" });
    });

    it("executes paste", () => {
      const { clipboardInteractionsStore } = createStore();

      workflowShortcuts.paste.execute({});
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

      expect(workflowShortcuts.copy.condition()).toBe(false);

      selectionStore.getSelectedNodes = [{ allowedActions: {} }];
      expect(workflowShortcuts.copy.condition()).toBe(true);

      bottomPanel.focus();
      expect(document.activeElement).toBe(bottomPanel);
      expect(workflowShortcuts.copy.condition()).toBe(false);

      kanvasElement.focus();
      applicationSettingsStore.hasClipboardSupport = false;
      expect(workflowShortcuts.copy.condition()).toBe(false);

      kanvasElement.remove();
      expect(workflowShortcuts.copy.condition()).toBe(false);
    });

    describe("cut condition checks", () => {
      it("nothing selected, writeable -> disabled", () => {
        const { selectionStore } = createStore();

        selectionStore.getSelectedNodes = [];
        expect(workflowShortcuts.cut.condition()).toBeFalsy();
      });

      it("nodes selected, not writeable -> disabled", () => {
        const { selectionStore, workflowStore } = createStore();

        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        workflowStore.isWritable = false;
        expect(workflowShortcuts.cut.condition()).toBeFalsy();
      });

      it("nodes selected, writeable -> enabled", () => {
        const { selectionStore } = createStore();

        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        expect(workflowShortcuts.cut.condition()).toBe(true);
      });

      it("nodes selected, writeable but no clipboard permission -> disabled", () => {
        const { selectionStore, applicationSettingsStore } = createStore();

        selectionStore.getSelectedNodes = [{ allowedActions: {} }];
        applicationSettingsStore.hasClipboardSupport = false;
        expect(workflowShortcuts.cut.condition()).toBeFalsy();
      });
    });

    it("checks paste condition", () => {
      const { selectionStore, workflowStore, applicationSettingsStore } =
        createStore();

      selectionStore.getSelectedNodes = [{ allowedActions: {} }];
      workflowStore.isWritable = false;
      expect(workflowShortcuts.paste.condition()).toBeFalsy();

      workflowStore.isWritable = true;
      expect(workflowShortcuts.paste.condition()).toBe(true);

      applicationSettingsStore.hasClipboardSupport = false;
      expect(workflowShortcuts.paste.condition()).toBeFalsy();
    });
  });

  describe("deleteSelected", () => {
    it("execute: delete selected objects", () => {
      const { workflowStore } = createStore();

      workflowShortcuts.deleteSelected.execute();
      expect(workflowStore.deleteSelectedObjects).toHaveBeenCalled();
    });

    it("execute: delete selected port", () => {
      const { workflowStore, selectionStore } = createStore();

      selectionStore.activeNodePorts = {
        nodeId: "someid",
        selectedPort: "some-port",
      };
      workflowShortcuts.deleteSelected.execute();
      expect(workflowStore.deleteSelectedPort).toHaveBeenCalled();
    });

    it("condition checks when workflow is not writeable ", () => {
      const { workflowStore, selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      workflowStore.isWritable = false;
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);
    });

    it("condition checks when nothing selected", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [];
      selectionStore.getSelectedConnections = [];
      selectionStore.getSelectedBendpointIds = [];
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);

      // port is selected -> shortcut active...
      selectionStore.activeNodePorts.selectedPort = "some-port";
      expect(workflowShortcuts.deleteSelected.condition()).toBe(true);
      // ... unless a modification is already in progress
      selectionStore.activeNodePorts.isModificationInProgress = true;
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);
    });

    it("condition checks when one node is not deletable", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: false } },
      ];
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);
    });

    it("checks when one connection is not deletable", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: false } },
      ];
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);
    });

    it("condition checks when all selected are deletable", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      selectionStore.getSelectedConnections = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition()).toBe(true);
    });

    it("condition checks when only nodes are selected", () => {
      const { selectionStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      expect(workflowShortcuts.deleteSelected.condition()).toBe(true);
    });

    it("condition checks when dragging", () => {
      const { selectionStore, movingStore } = createStore();

      selectionStore.singleSelectedNode = null;
      selectionStore.getSelectedNodes = [
        { allowedActions: { canDelete: true } },
        { allowedActions: { canDelete: true } },
      ];
      movingStore.isDragging = true;
      expect(workflowShortcuts.deleteSelected.condition()).toBe(false);
    });
  });

  describe("quickActionMenu", () => {
    it.each([
      ["enables", true],
      ["disables", false],
    ])("%s menu if workflow is writeable or not", (_, cond) => {
      const { selectionStore, workflowStore } = createStore();

      selectionStore.singleSelectedNode = null;
      workflowStore.isWritable = cond;
      expect(workflowShortcuts.quickActionMenu.condition()).toBe(cond);
    });

    it("opens quick add node menu in global mode if no node is selected", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      selectionStore.singleSelectedNode = null;
      workflowShortcuts.quickActionMenu.execute({});
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          position: expect.anything(),
        },
      });
    });

    const mockNodeTemplate = (length) => ({
      id: "root:4",
      position: { x: 120, y: 53 },
      kind: "node",
      outPorts: Array.from({ length }, (_, index) => ({
        index,
        typeId: "some.type",
      })),
    });

    it("opens quick add node menu on the mickey mouse ports if no others are available", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      selectionStore.singleSelectedNode = mockNodeTemplate(1);
      workflowShortcuts.quickActionMenu.execute({});
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 0, typeId: "some.type" },
          position: expect.anything(),
          positionOrigin: "calculated",
        },
      });
    });

    it("opens quick add node menu on first none mickey mouse ports", () => {
      const { selectionStore, canvasAnchoredComponentsStore } = createStore();

      selectionStore.singleSelectedNode = mockNodeTemplate(3);
      workflowShortcuts.quickActionMenu.execute({});
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 1, typeId: "some.type" },
          position: expect.anything(),
          positionOrigin: "calculated",
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
          { index: 0, typeId: "some.type" },
          { index: 1, typeId: "some.type" },
          { index: 2, typeId: "some.type" },
        ],
      });
      selectionStore.singleSelectedNode = node;
      nodeInteractionsStore.getNodeById = vi.fn().mockReturnValue(node);
      canvasAnchoredComponentsStore.quickActionMenu = {
        isOpen: true,
        props: {
          nodeId: "root:4",
          port: {
            index: 1,
          },
          position: { x: 5, y: 8 },
          nodeRelation: "SUCCESSORS",
        },
      };
      workflowShortcuts.quickActionMenu.execute({});
      expect(
        canvasAnchoredComponentsStore.openQuickActionMenu,
      ).toHaveBeenCalledWith({
        props: {
          nodeId: "root:4",
          nodeRelation: "SUCCESSORS",
          port: { index: 2, typeId: "some.type" },
          position: { x: 5, y: 8 },
        },
      });
    });
  });

  describe("autoConnectNodes", () => {
    it("should execute for regular ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      selectionStore.getSelectedNodes = nodes;
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoConnectNodesDefault.execute();
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
      selectionStore.getSelectedNodes = nodes;
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoConnectNodesFlowVar.execute();
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

      selectionStore.getSelectedNodes = [];
      expect(workflowShortcuts.autoConnectNodesDefault.condition()).toBe(false);
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(false);
    });

    it("should not work when only single node is selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [createNativeNode()];
      expect(workflowShortcuts.autoConnectNodesDefault.condition()).toBe(false);
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(false);
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [createNativeNode()];
      selectionStore.getSelectedMetanodePortBars = ["in"];
      expect(workflowShortcuts.autoConnectNodesDefault.condition()).toBe(true);
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(true);
    });

    it("should work when multiple nodes are selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoConnectNodesDefault.condition()).toBe(true);
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(true);
    });
  });

  describe("autoDisconnectNodes", () => {
    it("should execute for regular ports", () => {
      const { selectionStore } = createStore();

      const nodes = [createNativeNode(), createNativeNode()];
      selectionStore.getSelectedNodes = nodes;
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoDisconnectNodesDefault.execute({
        payload: { event: { key: "l" } },
      });
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
      selectionStore.getSelectedNodes = nodes;
      selectionStore.getSelectedMetanodePortBars = ["in"];
      workflowShortcuts.autoDisconnectNodesFlowVar.execute();
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

      selectionStore.getSelectedNodes = [];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition()).toBe(
        false,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(false);
    });

    it("should not work when only single node is selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [createNativeNode()];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition()).toBe(
        false,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(false);
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [createNativeNode()];
      selectionStore.getSelectedMetanodePortBars = ["in"];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition()).toBe(
        true,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(true);
    });

    it("should work when multiple nodes are selected", () => {
      const { selectionStore } = createStore();

      selectionStore.getSelectedNodes = [
        createNativeNode(),
        createNativeNode(),
      ];
      expect(workflowShortcuts.autoDisconnectNodesDefault.condition()).toBe(
        true,
      );
      expect(workflowShortcuts.autoConnectNodesFlowVar.condition()).toBe(true);
    });
  });

  describe("shuffleSelectedPort", () => {
    it("executes:", () => {
      const { selectionStore } = createStore();

      getNextSelectedPort.mockReturnValueOnce("someSelectedPortIdentifier");
      workflowShortcuts.shuffleSelectedPort.execute();
      expect(selectionStore.updateActiveNodePorts).toHaveBeenLastCalledWith({
        nodeId: selectionStore.singleSelectedNode.id,
        selectedPort: "someSelectedPortIdentifier",
      });
    });

    it("checks condition:", () => {
      // ideal condition
      const { selectionStore, workflowStore } = createStore();

      expect(workflowShortcuts.shuffleSelectedPort.condition()).toBe(true);

      // no single node selected
      selectionStore.singleSelectedNode = null;
      expect(workflowShortcuts.shuffleSelectedPort.condition()).toBe(false);

      // workflow read-only
      selectionStore.singleSelectedNode = {
        id: "root:0",
        allowedActions: {},
      };
      workflowStore.isWritable = false;
      expect(workflowShortcuts.shuffleSelectedPort.condition()).toBe(false);
    });
  });
});
