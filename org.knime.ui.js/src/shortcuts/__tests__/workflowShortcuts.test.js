/* eslint-disable max-lines */
import { expect, describe, it, vi } from "vitest";
import * as applicationStore from "@/store/application";
import * as uiControlsStore from "@/store/uiControls";
import workflowShortcuts from "../workflowShortcuts";
import { deepMocked } from "@/test/utils";
import { API } from "@api";
import { createNativeNode } from "@/test/factories";
import { Node } from "@/api/gateway-api/generated-api";
import { getNextSelectedPort } from "@/util/portSelection";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "@/components/uiExtensions/common/utils";

describe("workflowShortcuts", () => {
  const mockSelectedNode = { id: "root:0", allowedActions: {} };
  const mockedAPI = deepMocked(API);

  let mockEnvironment = vi.hoisted(() => ({}));
  vi.mock("@/environment", async (importOriginal) => {
    Object.assign(mockEnvironment, await importOriginal());
    return mockEnvironment;
  });

  vi.mock("@/util/portSelection", () => {
    return {
      getNextSelectedPort: vi.fn(),
    };
  });

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
        uiControls: uiControlsStore.state(),
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
          activePortTab: null,
          activeNodePorts: {
            nodeId: null,
            selectedPort: null,
          },
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
      $store.state.uiControls.isLocalSaveSupported = false;
      expect(workflowShortcuts.save.condition({ $store })).toBe(false);

      $store.state.uiControls.isLocalSaveSupported = true;
      expect(workflowShortcuts.save.condition({ $store })).toBe(true);

      $store.getters["application/isDirtyActiveProject"] = false;
      expect(workflowShortcuts.save.condition({ $store })).toBe(false);
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
      $store.state.uiControls.canConfigureNodes = false;
      expect(workflowShortcuts.configureNode.condition({ $store })).toBe(false);
      $store.state.uiControls.canConfigureNodes = true;
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

      $store.state.uiControls.canConfigureFlowVariables = true;
      expect(
        workflowShortcuts.configureFlowVariables.condition({ $store }),
      ).toBeFalsy();

      $store.getters["selection/singleSelectedNode"].allowedActions = {
        canOpenLegacyFlowVariableDialog: true,
      };

      expect(
        workflowShortcuts.configureFlowVariables.condition({ $store }),
      ).toBe(true);

      $store.state.uiControls.canConfigureFlowVariables = false;
      expect(
        workflowShortcuts.configureFlowVariables.condition({ $store }),
      ).toBe(false);
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
        const { $store, mockCommit } = createStore({
          singleSelectedNode: {
            ...mockSelectedNode,
            outPorts: [{}, {}, {}, {}],
          },
        });

        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit1 },
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "1",
        );

        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit3 },
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "3",
        );

        // handle metanodes
        $store.getters["selection/singleSelectedNode"].kind =
          Node.KindEnum.Metanode;

        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit1 },
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "0",
        );

        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit3 },
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "2",
        );

        // handle too few outPorts
        mockCommit.mockClear();
        $store.getters["selection/singleSelectedNode"].outPorts = [{}, {}];
        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit3 },
        });
        expect(mockCommit).not.toBeCalled();
      });

      it("handles views", () => {
        const { $store, mockCommit } = createStore({
          singleSelectedNode: {
            ...mockSelectedNode,
            hasView: true,
            outPorts: [{}, {}],
          },
        });

        workflowShortcuts.activateOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit1 },
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "view",
        );
      });

      it("checks condition", () => {
        const { $store } = createStore({ singleSelectedNode: null });
        expect(
          workflowShortcuts.activateOutputPort.condition({ $store }),
        ).toBeFalsy(); // no selected node
        $store.getters["selection/singleSelectedNode"] = {
          ...mockSelectedNode,
          outPorts: [],
        };
        expect(
          workflowShortcuts.activateOutputPort.condition({ $store }),
        ).toBeFalsy(); // no output port
        $store.getters["selection/singleSelectedNode"] = {
          ...mockSelectedNode,
          outPorts: [{}],
        };
        expect(
          workflowShortcuts.activateOutputPort.condition({ $store }),
        ).toBeTruthy();
      });
    });

    describe("activateFlowVarPort", () => {
      it("executes", () => {
        const { $store, mockCommit } = createStore();

        workflowShortcuts.activateFlowVarPort.execute({
          $store,
        });
        expect(mockCommit).toHaveBeenLastCalledWith(
          "selection/setActivePortTab",
          "0",
        );
      });

      it("checks condition", () => {
        const { $store } = createStore({ singleSelectedNode: null });
        $store.state.application.availablePortTypes = {
          mockTypeId: { kind: "not a flowvar" },
        };

        expect(
          workflowShortcuts.activateFlowVarPort.condition({ $store }),
        ).toBeFalsy(); // no node selected
        $store.getters["selection/singleSelectedNode"] = {
          ...mockSelectedNode,
          outPorts: [{ typeId: "mockTypeId" }],
        };
        expect(
          workflowShortcuts.activateFlowVarPort.condition({ $store }),
        ).toBeFalsy(); // not a flowvar port
        $store.state.application.availablePortTypes = {
          mockTypeId: { kind: "flowVariable" },
        };
        expect(
          workflowShortcuts.activateFlowVarPort.condition({ $store }),
        ).toBeTruthy();
      });
    });

    describe("detachOutputPort", () => {
      it("executes", () => {
        const node = {
          ...mockSelectedNode,
          outPorts: [{}, {}, {}, {}],
        };
        const { $store, mockDispatch } = createStore({
          singleSelectedNode: node,
        });

        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftAltDigit1 },
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "1",
        });

        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftAltDigit3 },
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "3",
        });

        $store.getters["selection/singleSelectedNode"].hasView = true;
        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftAltDigit1 },
        });

        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "view",
        });

        // handle metanodes
        $store.getters["selection/singleSelectedNode"].hasView = false;
        $store.getters["selection/singleSelectedNode"].kind =
          Node.KindEnum.Metanode;

        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit1 },
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "0",
        });

        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit3 },
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "2",
        });

        // handle too few outPorts
        mockDispatch.mockClear();
        $store.getters["selection/singleSelectedNode"].outPorts = [{}, {}];
        workflowShortcuts.detachOutputPort.execute({
          $store,
          payload: { event: eventShiftDigit3 },
        });
        expect(mockDispatch).not.toBeCalled();
      });

      it("checks condition", () => {
        const createFailureCondition = ({
          isDesktop = true,
          selectedNode = {
            ...mockSelectedNode,
            outPorts: [{}],
          },
        } = {}) => {
          mockEnvironment.isDesktop = isDesktop;
          return {
            ...createStore({ singleSelectedNode: selectedNode }),
          };
        };

        {
          const { $store } = createFailureCondition(undefined);
          expect(
            workflowShortcuts.detachOutputPort.condition({ $store }),
          ).toBeTruthy();
        }

        {
          // detach only on desktop
          const { $store } = createFailureCondition({ isDesktop: false });
          expect(
            workflowShortcuts.detachOutputPort.condition({ $store }),
          ).toBeFalsy();
        }

        {
          // no selected node
          const { $store } = createFailureCondition({ selectedNode: null });
          expect(
            workflowShortcuts.detachOutputPort.condition({ $store }),
          ).toBeFalsy();
        }

        {
          // no output ports
          const { $store } = createFailureCondition({
            selectedNode: {
              ...mockSelectedNode,
              outPorts: [],
            },
          });
          expect(
            workflowShortcuts.detachOutputPort.condition({ $store }),
          ).toBeFalsy();
        }

        mockEnvironment.isDesktop = true;
      });
    });

    describe("detachFlowVarPort", () => {
      it("executes", () => {
        const node = {
          ...mockSelectedNode,
          outPorts: [{}, {}, {}, {}],
          state: {
            executionState: "IDLE",
          },
        };
        const { $store, mockDispatch } = createStore({
          singleSelectedNode: node,
        });

        workflowShortcuts.detachFlowVarPort.execute({
          $store,
        });
        expect(mockDispatch).not.toBeCalled();

        node.state.executionState = "EXECUTED";
        workflowShortcuts.detachFlowVarPort.execute({
          $store,
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "0",
        });
      });

      it("checks condition", () => {
        const createFailureCondition = ({
          isDesktop = true,
          selectedNode = {
            ...mockSelectedNode,
            outPorts: [{ typeId: "mockTypeId" }],
          },
          hasFlowVarPort = true,
        } = {}) => {
          mockEnvironment.isDesktop = isDesktop;

          const { $store } = createStore({ singleSelectedNode: selectedNode });
          $store.state.application.availablePortTypes = {
            mockTypeId: {
              // eslint-disable-next-line vitest/no-conditional-tests
              kind: hasFlowVarPort ? "flowVariable" : "not a flowVariable",
            },
          };
          return {
            $store,
          };
        };

        {
          const { $store } = createFailureCondition(undefined);
          expect(
            workflowShortcuts.detachFlowVarPort.condition({ $store }),
          ).toBeTruthy();
        }

        {
          // detach only on desktop
          const { $store } = createFailureCondition({ isDesktop: false });
          expect(
            workflowShortcuts.detachFlowVarPort.condition({ $store }),
          ).toBeFalsy();
        }

        {
          // no selected node
          const { $store } = createFailureCondition({ selectedNode: null });
          expect(
            workflowShortcuts.detachFlowVarPort.condition({ $store }),
          ).toBeFalsy();
        }

        {
          // no flowVariable port
          const { $store } = createFailureCondition({
            hasFlowVarPort: false,
          });
          expect(
            workflowShortcuts.detachFlowVarPort.condition({ $store }),
          ).toBeFalsy();
        }

        mockEnvironment.isDesktop = true;
      });
    });

    describe("detachActiveOutputPort", () => {
      it("executes", () => {
        const { $store, mockDispatch } = createStore();

        $store.state.selection.activePortTab = "42";
        const node = $store.getters["selection/singleSelectedNode"];

        workflowShortcuts.detachActiveOutputPort.execute({
          $store,
        });
        expect(mockDispatch).toHaveBeenLastCalledWith("workflow/openPortView", {
          node,
          port: "42",
        });
      });

      it("checks condition", () => {
        const { $store } = createStore({ singleSelectedNode: null });
        expect(
          workflowShortcuts.detachActiveOutputPort.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/singleSelectedNode"] = mockSelectedNode;
        mockEnvironment.isDesktop = false;
        expect(
          workflowShortcuts.detachActiveOutputPort.condition({ $store }),
        ).toBeFalsy();
        mockEnvironment.isDesktop = true;
        expect(
          workflowShortcuts.detachActiveOutputPort.condition({ $store }),
        ).toBeFalsy();
        $store.state.selection.activePortTab = "1";
        expect(
          workflowShortcuts.detachActiveOutputPort.condition({ $store }),
        ).toBeTruthy();
      });
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
      const getScrollContainerElement = vi.fn().mockReturnValue(kanvasElement);

      const { $store } = createStore({ getScrollContainerElement });

      expect(workflowShortcuts.copy.condition({ $store })).toBe(false);

      $store.getters["selection/selectedNodes"] = [{ allowedActions: {} }];
      expect(workflowShortcuts.copy.condition({ $store })).toBe(true);

      bottomPanel.focus();

      expect(document.activeElement).toBe(bottomPanel);
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
    it("execute: delete selected objects", () => {
      const { $store, mockDispatch } = createStore();
      workflowShortcuts.deleteSelected.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/deleteSelectedObjects",
      );
    });

    it("execute: delete selected port", () => {
      const { $store, mockDispatch } = createStore();

      $store.state.selection.activeNodePorts = {
        nodeId: "someid",
        selectedPort: "some-port",
      };

      workflowShortcuts.deleteSelected.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenLastCalledWith(
        "workflow/deleteSelectedPort",
      );
    });

    it("condition checks when workflow is not writeable ", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      $store.getters["workflow/isWritable"] = false;
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("condition checks when nothing selected", () => {
      const { $store } = createStore({ singleSelectedNode: null });
      $store.getters["selection/selectedNodes"] = [];
      $store.getters["selection/selectedConnections"] = [];
      $store.getters["selection/selectedBendpointIds"] = [];
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );

      // port is selected -> shortcut active...
      $store.state.selection.activeNodePorts.selectedPort = "some-port";
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
      // ... unless a modification is already in progress
      $store.state.selection.activeNodePorts.isModificationInProgress = true;
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
    });

    it("condition checks when one node is not deletable", () => {
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

    it("condition checks when all selected are deletable", () => {
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

    it("condition checks when only nodes are selected", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
      });

      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(true);
    });

    it("condition checks when dragging", () => {
      const { $store } = createStore({
        singleSelectedNode: null,
        selectedNodes: [
          { allowedActions: { canDelete: true } },
          { allowedActions: { canDelete: true } },
        ],
      });

      $store.state.workflow.isDragging = true;
      expect(workflowShortcuts.deleteSelected.condition({ $store })).toBe(
        false,
      );
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
            nodeRelation: "SUCCESSORS",
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
            nodeRelation: "SUCCESSORS",
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
            nodeRelation: "SUCCESSORS",
            port: { index: 2, typeId: "some.type" },
            position: { x: 5, y: 8 },
          },
        },
      );
    });
  });

  describe("autoConnectNodes", () => {
    it("should execute for regular ports", () => {
      const selectedNodes = [createNativeNode(), createNativeNode()];
      const { $store } = createStore({
        selectedNodes,
        selectedMetanodePortBars: ["in"],
      });

      workflowShortcuts.autoConnectNodesDefault.execute({
        $store,
        payload: { event: { key: "l" } },
      });
      expect(mockedAPI.workflowCommand.AutoConnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: selectedNodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: false,
      });
    });

    it("should execute for flow variable ports", () => {
      const selectedNodes = [createNativeNode(), createNativeNode()];
      const { $store } = createStore({
        selectedNodes,
        selectedMetanodePortBars: ["in"],
      });

      workflowShortcuts.autoConnectNodesDefault.execute({
        $store,
        payload: { event: { key: "k" } },
      });
      expect(mockedAPI.workflowCommand.AutoConnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: selectedNodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: true,
      });
    });

    it("should not work when no node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [],
      });

      expect(
        workflowShortcuts.autoConnectNodesDefault.condition({ $store }),
      ).toBe(false);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(false);
    });

    it("should not work when only single node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
      });

      expect(
        workflowShortcuts.autoConnectNodesDefault.condition({ $store }),
      ).toBe(false);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(false);
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
        selectedMetanodePortBars: ["in"],
      });

      expect(
        workflowShortcuts.autoConnectNodesDefault.condition({ $store }),
      ).toBe(true);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(true);
    });

    it("should work when multiple nodes are selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode(), createNativeNode()],
      });

      expect(
        workflowShortcuts.autoConnectNodesDefault.condition({ $store }),
      ).toBe(true);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(true);
    });
  });

  describe("autoDisconnectNodes", () => {
    it("should execute for regular ports", () => {
      const selectedNodes = [createNativeNode(), createNativeNode()];
      const { $store } = createStore({
        selectedNodes,
        selectedMetanodePortBars: ["in"],
      });

      workflowShortcuts.autoDisconnectNodesDefault.execute({
        $store,
        payload: { event: { key: "l" } },
      });
      expect(mockedAPI.workflowCommand.AutoDisconnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: selectedNodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: false,
      });
    });

    it("should execute for flow variable ports", () => {
      const selectedNodes = [createNativeNode(), createNativeNode()];
      const { $store } = createStore({
        selectedNodes,
        selectedMetanodePortBars: ["in"],
      });

      workflowShortcuts.autoDisconnectNodesDefault.execute({
        $store,
        payload: { event: { key: "k" } },
      });
      expect(mockedAPI.workflowCommand.AutoDisconnect).toHaveBeenCalledWith({
        projectId: "activeTestProjectId",
        workflowId: "testWorkflow",
        selectedNodes: selectedNodes.map(({ id }) => id),
        workflowInPortsBarSelected: true,
        workflowOutPortsBarSelected: false,
        flowVariablePortsOnly: true,
      });
    });

    it("should not work when no node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [],
      });

      expect(
        workflowShortcuts.autoDisconnectNodesDefault.condition({ $store }),
      ).toBe(false);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(false);
    });

    it("should not work when only single node is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
      });

      expect(
        workflowShortcuts.autoDisconnectNodesDefault.condition({ $store }),
      ).toBe(false);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(false);
    });

    it("should work when single node is selected and a port bar is selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode()],
        selectedMetanodePortBars: ["in"],
      });

      expect(
        workflowShortcuts.autoDisconnectNodesDefault.condition({ $store }),
      ).toBe(true);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(true);
    });

    it("should work when multiple nodes are selected", () => {
      const { $store } = createStore({
        selectedNodes: [createNativeNode(), createNativeNode()],
      });

      expect(
        workflowShortcuts.autoDisconnectNodesDefault.condition({ $store }),
      ).toBe(true);
      expect(
        workflowShortcuts.autoConnectNodesFlowVar.condition({ $store }),
      ).toBe(true);
    });
  });

  describe("shuffleSelectedPort", () => {
    it("executes:", () => {
      const { $store, mockCommit } = createStore({
        singleSelectedNode: mockSelectedNode,
        isWorkflowWritable: true,
      });
      getNextSelectedPort.mockReturnValueOnce("someSelectedPortIdentifier");

      workflowShortcuts.shuffleSelectedPort.execute({ $store });
      expect(mockCommit).toHaveBeenCalledOnce();
      expect(mockCommit).toHaveBeenLastCalledWith(
        "selection/updateActiveNodePorts",
        {
          nodeId: $store.getters["selection/singleSelectedNode"].id,
          selectedPort: "someSelectedPortIdentifier",
        },
      );
    });

    it("checks condition:", () => {
      // ideal condition
      let { $store } = createStore({
        singleSelectedNode: mockSelectedNode,
        isWorkflowWritable: true,
      });
      expect(workflowShortcuts.shuffleSelectedPort.condition({ $store })).toBe(
        true,
      );

      // no single node selected
      ({ $store } = createStore({
        singleSelectedNode: null,
        isWorkflowWritable: true,
      }));
      expect(workflowShortcuts.shuffleSelectedPort.condition({ $store })).toBe(
        false,
      );

      // workflow read-only
      ({ $store } = createStore({
        singleSelectedNode: mockSelectedNode,
        isWorkflowWritable: false,
      }));
      expect(workflowShortcuts.shuffleSelectedPort.condition({ $store })).toBe(
        false,
      );
    });
  });
});
