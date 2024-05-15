/* eslint-disable max-lines */
import { expect, describe, it, vi } from "vitest";
import * as applicationStore from "@/store/application";
import workflowShortcuts from "../workflowShortcuts";
import { deepMocked } from "@/test/utils";
import { API } from "@api";
import { createNativeNode } from "@/test/factories";

describe("workflowShortcuts", () => {
  const mockSelectedNode = { id: "root:0", allowedActions: {} };
  const mockedAPI = deepMocked(API);

  const createStore = ({
    containerType = "project",
    selectedNodes = [],
    selectedConnections = [],
    selectedAnnotations = [],
    selectedMetanodePortBars = [],
    singleSelectedNode = mockSelectedNode,
    singleSelectedAnnotation = null,
    isWorkflowWritable = true,
    getScrollContainerElement = vi.fn(),
    getNodeById = vi.fn(),
    getVisibleFrame = vi
      .fn()
      .mockReturnValue({ left: -500, top: -500, width: 1000, height: 1000 }),
  } = {}) => {
    const mockDispatch = vi.fn();
    const mockCommit = vi.fn();
    const $store = {
      commit: mockCommit,
      dispatch: mockDispatch,
      state: {
        application: {
          ...applicationStore.state(),
          activeProjectId: "activeTestProjectId",
          dirtyProjectsMap: { activeTestProjectId: false },
          hasClipboardSupport: true,
        },
        workflow: {
          activeWorkflow: {
            projectId: "activeTestProjectId",
            allowedActions: {},
            info: {
              containerId: "testWorkflow",
              containerType,
            },
            nodes: {
              node1: {
                position: {
                  x: 300,
                  y: 200,
                },
              },
            },
            parents: [
              {
                containerId: "root:parent",
              },
              {
                containerId: "direct:parent:id",
              },
            ],
          },
          quickAddNodeMenu: {
            isOpen: false,
            props: {},
            events: {},
          },
        },
        canvas: {
          getScrollContainerElement,
        },
        selection: {
          selectedPort: null,
        },
      },
      getters: {
        "selection/selectedNodes": selectedNodes,
        "selection/selectedNodeIds": selectedNodes.map(({ id }) => id),
        "selection/selectedConnections": selectedConnections,
        "selection/singleSelectedNode": singleSelectedNode,
        "selection/selectedAnnotations": selectedAnnotations,
        "selection/selectedMetanodePortBars": selectedMetanodePortBars,
        "selection/singleSelectedAnnotation": singleSelectedAnnotation,
        "selection/singleSelectedObject":
          (singleSelectedNode && !singleSelectedAnnotation) ||
          (!singleSelectedNode && singleSelectedAnnotation),
        "workflow/isWritable": isWorkflowWritable,
        "workflow/getNodeById": getNodeById,
        "canvas/getVisibleFrame": getVisibleFrame,
        "application/activeProjectOrigin": {
          providerId: "some-provider",
          spaceId: "some-space",
        },
        "application/isDirtyActiveProject": false,
      },
    };

    return { mockCommit, mockDispatch, $store };
  };

  describe("save", () => {
    it("executes", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.save.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/saveProject");
      expect(mockDispatch).not.toHaveBeenCalledWith("workflow/saveProjectAs");
    });

    it("executes when project without origin is open", () => {
      const { $store, mockDispatch } = createStore();
      $store.getters["application/activeProjectOrigin"] = null;
      workflowShortcuts.save.execute({ $store });
      expect(mockDispatch).not.toHaveBeenCalledWith("workflow/saveProject");
      expect(mockDispatch).toHaveBeenCalledWith("workflow/saveProjectAs");
    });

    it("checks save condition", () => {
      const { $store } = createStore();
      expect(workflowShortcuts.save.condition({ $store })).toBeFalsy();
      $store.getters["application/isDirtyActiveProject"] = true;
      expect(workflowShortcuts.save.condition({ $store })).toBe(true);
    });
  });

  describe("undo/redo", () => {
    it("executes undo", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.undo.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/undo");
    });

    it("executes redo", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.redo.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/redo");
    });

    it("checks undo condition", () => {
      const { $store } = createStore();
      expect(workflowShortcuts.undo.condition({ $store })).toBeFalsy();
      $store.state.workflow.activeWorkflow.allowedActions.canUndo = true;
      expect(workflowShortcuts.undo.condition({ $store })).toBe(true);
    });

    it("checks redo condition", () => {
      const { $store } = createStore();
      expect(workflowShortcuts.redo.condition({ $store })).toBeFalsy();
      $store.state.workflow.activeWorkflow.allowedActions.canRedo = true;
      expect(workflowShortcuts.redo.condition({ $store })).toBe(true);
    });
  });

  describe("configure", () => {
    it("executes", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.configureNode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openNodeConfiguration",
        "root:0",
      );
    });

    it("checks condition", () => {
      const { $store } = createStore();
      expect(workflowShortcuts.configureNode.condition({ $store })).toBeFalsy();
      $store.getters["selection/singleSelectedNode"].allowedActions = {
        canOpenDialog: true,
      };
      expect(workflowShortcuts.configureNode.condition({ $store })).toBe(true);
    });
  });

  describe("configureFlowVariables", () => {
    it("executes", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.configureFlowVariables.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openFlowVariableConfiguration",
        "root:0",
      );
    });

    it("checks condition", () => {
      const { $store } = createStore();
      expect(
        workflowShortcuts.configureFlowVariables.condition({ $store }),
      ).toBeFalsy();
      $store.getters["selection/singleSelectedNode"].allowedActions = {
        canOpenLegacyFlowVariableDialog: true,
      };
      expect(
        workflowShortcuts.configureFlowVariables.condition({ $store }),
      ).toBe(true);
    });
  });

  describe("openOutputPort", () => {
    const eventDigit1 = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      shiftKey: true,
    });
    const eventDigit3 = new KeyboardEvent("keydown", {
      key: "3",
      code: "Digit3",
      shiftKey: true,
    });

    const eventShiftDigit1 = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      shiftKey: true,
      altKey: true,
    });
    const eventShiftDigit3 = new KeyboardEvent("keydown", {
      key: "3",
      code: "Digit3",
      shiftKey: true,
      altKey: true,
    });

    it("shortcuts mutate selectedPort", () => {
      // selected node with 4 dummy ports
      const { $store, mockCommit } = createStore({
        singleSelectedNode: {
          ...mockSelectedNode,
          outPorts: [{}, {}, {}, {}],
        },
      });

      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventDigit1 },
      });
      expect(mockCommit).toHaveBeenLastCalledWith(
        "selection/setSelectedPort",
        "1",
      );

      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventDigit3 },
      });
      expect(mockCommit).toHaveBeenLastCalledWith(
        "selection/setSelectedPort",
        "3",
      );

      // too few outPorts
      mockCommit.mockClear();
      $store.getters["selection/singleSelectedNode"].outPorts = [{}, {}];
      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventDigit3 },
      });
      expect(mockCommit).not.toBeCalled();
    });

    it("digit1 key is also used for 'view' tabs", () => {
      const { $store, mockCommit } = createStore({
        singleSelectedNode: {
          ...mockSelectedNode,
          hasView: true,
          outPorts: [{}, {}],
        },
      });

      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventDigit1 },
      });
      expect(mockCommit).toHaveBeenLastCalledWith(
        "selection/setSelectedPort",
        "view",
      );
    });

    it("shortcuts open detached port views", () => {
      const { $store } = createStore({
        singleSelectedNode: {
          ...mockSelectedNode,
          outPorts: [{}, {}, {}, {}],
        },
      });
      mockedAPI.desktop.openPortView.mockClear();

      const validationResult = vi.hoisted(() => ({
        error: {
          message: "some test error occured",
        },
      }));
      vi.mock(
        "@/components/uiExtensions/common/output-validator",
        async (importOriginal) => ({
          ...(await importOriginal()),
          buildMiddleware: () => () => () => ({
            ...validationResult,
          }),
        }),
      );

      // validation error prevents detaching
      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventShiftDigit1 },
      });
      expect(mockedAPI.desktop.openPortView).not.toBeCalled();

      validationResult.error = undefined;

      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventShiftDigit1 },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenLastCalledWith({
        projectId: "activeTestProjectId",
        nodeId: mockSelectedNode.id,
        viewIndex: 1,
        portIndex: 1,
      });

      workflowShortcuts.openOutputPort.execute({
        $store,
        payload: { event: eventShiftDigit3 },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenLastCalledWith({
        projectId: "activeTestProjectId",
        nodeId: mockSelectedNode.id,
        viewIndex: 1,
        portIndex: 3,
      });
    });

    it("checks condition", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      expect(
        workflowShortcuts.openOutputPort.condition({ $store }),
      ).toBeFalsy();
      $store.getters["selection/singleSelectedNode"] = {
        ...mockSelectedNode,
        outPorts: [],
      };
      expect(
        workflowShortcuts.openOutputPort.condition({ $store }),
      ).toBeFalsy();
      // selected node has outPort
      $store.getters["selection/singleSelectedNode"] = {
        ...mockSelectedNode,
        outPorts: [{}],
      };
      expect(
        workflowShortcuts.openOutputPort.condition({ $store }),
      ).toBeTruthy();
    });
  });

  describe("detachCurrentOutputPort", () => {
    it("executes", () => {
      const { $store } = createStore();
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        altKey: true,
        shiftKey: true,
      });

      mockedAPI.desktop.openPortView.mockClear();

      workflowShortcuts.detachCurrentOutputPort.execute({
        $store,
        payload: { event },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenCalledTimes(0);

      $store.state.selection.selectedPort = "view";
      workflowShortcuts.detachCurrentOutputPort.execute({
        $store,
        payload: { event },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenCalledTimes(0);

      $store.state.selection.selectedPort = "1";
      workflowShortcuts.detachCurrentOutputPort.execute({
        $store,
        payload: { event },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenLastCalledWith({
        projectId: "activeTestProjectId",
        nodeId: mockSelectedNode.id,
        viewIndex: 1,
        portIndex: 1,
      });

      $store.state.selection.selectedPort = "3";
      workflowShortcuts.detachCurrentOutputPort.execute({
        $store,
        payload: { event },
      });
      expect(mockedAPI.desktop.openPortView).toHaveBeenLastCalledWith({
        projectId: "activeTestProjectId",
        nodeId: mockSelectedNode.id,
        viewIndex: 1,
        portIndex: 3,
      });
    });

    it("checks condition", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      expect(
        workflowShortcuts.detachCurrentOutputPort.condition({ $store }),
      ).toBeFalsy();
      $store.getters["selection/singleSelectedNode"] = mockSelectedNode;
      expect(
        workflowShortcuts.detachCurrentOutputPort.condition({ $store }),
      ).toBeTruthy();
    });
  });

  describe("editNodeComment", () => {
    it("eecutes ", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.editNodeComment.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openLabelEditor",
        "root:0",
      );
    });

    it("cannot edit label if no node is selected", () => {
      const { $store } = createStore({
        isWorkflowWritable: true,
        singleSelectedNode: null,
      });

      expect(
        workflowShortcuts.editNodeComment.condition({ $store }),
      ).toBeFalsy();
    });

    it("cannot edit label when workflow is not writable", () => {
      const { $store } = createStore({
        isWorkflowWritable: false,
        singleSelectedNode: {
          kind: "node",
          id: "node1",
        },
      });

      expect(workflowShortcuts.editNodeComment.condition({ $store })).toBe(
        false,
      );
    });
  });

  describe("editAnnotation", () => {
    it("executes ", () => {
      const { $store, mockDispatch } = createStore({
        singleSelectedAnnotation: { id: "annotationId1" },
      });
      workflowShortcuts.editAnnotation.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/setEditableAnnotationId",
        "annotationId1",
      );
    });
  });

  describe("clipboard operations", () => {
    it("executes copy", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.copy.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/copyOrCutWorkflowParts",
        { command: "copy" },
      );
    });

    it("executes cut", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.cut.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/copyOrCutWorkflowParts",
        { command: "cut" },
      );
    });

    it("executes paste", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.paste.execute({ $store, payload: {} });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/pasteWorkflowParts",
        expect.anything(),
      );
    });

    it("checks copy condition", () => {
      const nodeOutputEl = document.createElement("div");
      nodeOutputEl.id = "node-output";
      const nodeOutputContentEl = document.createElement("div");
      nodeOutputContentEl.classList.add("node-output-content");
      nodeOutputContentEl.setAttribute("tabIndex", "0");
      nodeOutputEl.appendChild(nodeOutputContentEl);
      document.body.appendChild(nodeOutputEl);

      // mock kanvas element and make it the activeElement
      const kanvasElement = document.createElement("div");
      kanvasElement.id = "kanvas";
      kanvasElement.setAttribute("tabIndex", "0");
      document.body.appendChild(kanvasElement);
      kanvasElement.focus();

      expect(document.activeElement).toBe(kanvasElement);
      const getScrollContainerElement = vi.fn().mockReturnValue(kanvasElement);

      const { $store } = createStore({ getScrollContainerElement });

      expect(workflowShortcuts.copy.condition({ $store })).toBe(false);

      $store.getters["selection/selectedNodes"] = [{ allowedActions: {} }];
      expect(workflowShortcuts.copy.condition({ $store })).toBe(true);

      nodeOutputContentEl.focus();
      expect(workflowShortcuts.copy.condition({ $store })).toBe(false);

      kanvasElement.focus();

      $store.state.application.hasClipboardSupport = false;
      expect(workflowShortcuts.copy.condition({ $store })).toBe(false);

      getScrollContainerElement.mockReturnValue({});
      expect(workflowShortcuts.copy.condition({ $store })).toBe(false);
    });

    describe("cut condition checks", () => {
      it("nothing selected, not writeable -> disabled", () => {
        const { $store } = createStore();
        expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
      });

      it("nodes selected, not writeable -> disabled", () => {
        const { $store } = createStore({
          selectedNodes: [{ allowedActions: {} }],
          isWorkflowWritable: false,
        });

        expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
      });

      it("nothing selected, writeable -> disabled", () => {
        const { $store } = createStore({ isWorkflowWritable: true });

        expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
      });

      it("nodes selected, writeable -> enabled", () => {
        const { $store } = createStore({
          selectedNodes: [{ allowedActions: {} }],
          isWorkflowWritable: true,
        });
        expect(workflowShortcuts.cut.condition({ $store })).toBe(true);
      });

      it("nodes selected, writeable but no clipboard permission -> disabled", () => {
        const { $store } = createStore({
          selectedNodes: [{ allowedActions: {} }],
          isWorkflowWritable: true,
        });
        $store.state.application.hasClipboardSupport = false;

        expect(workflowShortcuts.cut.condition({ $store })).toBeFalsy();
      });
    });

    it("checks paste condition", () => {
      const { $store } = createStore({
        selectedNodes: [{ allowedActions: {} }],
        isWorkflowWritable: false,
      });

      expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
      $store.getters["workflow/isWritable"] = true;

      expect(workflowShortcuts.paste.condition({ $store })).toBe(true);

      $store.state.application.hasClipboardSupport = false;
      expect(workflowShortcuts.paste.condition({ $store })).toBeFalsy();
    });
  });

  describe("deleteSelected", () => {
    it("executes", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.deleteSelected.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/deleteSelectedObjects",
      );
    });

    it("checkes when workflow is not writeable ", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      $store.getters["workflow/isWritable"] = false;
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("checks when nothing selected", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      $store.getters["selection/selectedNodes"] = [];
      $store.getters["selection/selectedConnections"] = [];
      $store.getters["selection/selectedBendpointIds"] = [];
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("checkes when one node is not deletable", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: false } },
        ],
        selectedConnections: [{ allowedActions: { canDelete: true } }],
      });

      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("checks when one connection is not deletable", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
        selectedConnections: [{ allowedActions: { canDelete: false } }],
      });
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("checkes when all selected are deletable", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
        selectedConnections: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
      });
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
    });

    it("checkes when only nodes are selected", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
      });

      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
    });
  });

  describe("quickAddNode", () => {
    it.each([
      ["enables", true],
      ["disables", false],
    ])("%s menu if workflow is writeable or not", (_, cond) => {
      const { $store } = createStore({
        isWorkflowWritable: cond,
        singleSelectedNode: null,
      });
      expect(workflowShortcuts.quickAddNode.condition({ $store })).toBe(cond);
    });

    it("opens quick add node menu in global mode if no node is selected", () => {
      const { $store, mockDispatch } = createStore({
        isWorkflowWritable: true,
        singleSelectedNode: null,
      });
      workflowShortcuts.quickAddNode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openQuickAddNodeMenu",
        {
          props: {
            position: expect.anything(),
          },
        },
      );
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
      const { $store, mockDispatch } = createStore({
        isWorkflowWritable: true,
        singleSelectedNode: mockNodeTemplate(1),
      });
      workflowShortcuts.quickAddNode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openQuickAddNodeMenu",
        {
          props: {
            nodeId: "root:4",
            port: { index: 0, typeId: "some.type" },
            position: expect.anything(),
          },
        },
      );
    });

    it("opens quick add node menu on first none mickey mouse ports", () => {
      const { $store, mockDispatch } = createStore({
        isWorkflowWritable: true,
        singleSelectedNode: mockNodeTemplate(3),
      });
      workflowShortcuts.quickAddNode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openQuickAddNodeMenu",
        {
          props: {
            nodeId: "root:4",
            port: { index: 1, typeId: "some.type" },
            position: expect.anything(),
          },
        },
      );
    });

    it("switch to the next port and reuse current position if menu was already open", () => {
      const { $store, mockDispatch } = createStore({
        isWorkflowWritable: true,
        getNodeById: vi.fn().mockReturnValue(mockNodeTemplate(3)),
        singleSelectedNode: mockNodeTemplate(3),
      });
      $store.state.workflow.quickAddNodeMenu = {
        isOpen: true,
        props: {
          nodeId: "root:4",
          port: {
            index: 1,
          },
          position: { x: 5, y: 8 },
        },
      };
      workflowShortcuts.quickAddNode.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/openQuickAddNodeMenu",
        {
          props: {
            nodeId: "root:4",
            port: { index: 2, typeId: "some.type" },
            position: { x: 5, y: 8 },
          },
        },
      );
    });
  });

  describe("autoConnectNodes", () => {
    it("should execute", () => {
      const selectedNodes = [createNativeNode(), createNativeNode()];
      const { $store } = createStore({
        selectedNodes,
        selectedMetanodePortBars: ["in"],
      });

      workflowShortcuts.autoConnectNodes.execute({ $store });
      expect(mockedAPI.workflowCommand.AutoConnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: selectedNodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
      });
    });

    it("should not work when no node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [],
      });

      expect(workflowShortcuts.autoConnectNodes.condition({ $store })).toBe(
        false,
      );
    });

    it("should not work when only single node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
      });

      expect(workflowShortcuts.autoConnectNodes.condition({ $store })).toBe(
        false,
      );
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
        selectedMetanodePortBars: ["in"],
      });

      expect(workflowShortcuts.autoConnectNodes.condition({ $store })).toBe(
        true,
      );
    });

    it("should work when multiple nodes are selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode(), createNativeNode()],
      });

      expect(workflowShortcuts.autoConnectNodes.condition({ $store })).toBe(
        true,
      );
    });
  });
});
