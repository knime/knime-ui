import { describe, expect, it } from "vitest";

import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import executionShortcuts from "../executionShortcuts";

describe("executionShortcuts", () => {
  const createStore = () => {
    const {
      workflowStore,
      selectionStore,
      executionStore,
      nodeConfigurationStore,
    } = mockStores();

    workflowStore.activeWorkflow = createWorkflow({
      allowedActions: { canExecute: false },
    });

    return {
      workflowStore,
      selectionStore,
      executionStore,
      nodeConfigurationStore,
    };
  };

  describe("execute", () => {
    describe("all", () => {
      it("executeAll", () => {
        const { executionStore } = createStore();

        executionShortcuts.executeAll.execute();
        expect(executionStore.executeNodes).toHaveBeenCalledWith("all");
      });

      it("cancelAll", () => {
        const { executionStore } = createStore();

        executionShortcuts.cancelAll.execute();
        expect(executionStore.cancelNodeExecution).toHaveBeenCalledWith("all");
      });

      it("resetAll", () => {
        const { executionStore } = createStore();

        executionShortcuts.resetAll.execute();
        expect(executionStore.resetNodes).toHaveBeenCalledWith("all");
      });
    });

    describe("selection", () => {
      it("executeSelected", async () => {
        const { executionStore, nodeConfigurationStore } = createStore();

        nodeConfigurationStore.autoApplySettings.mockResolvedValue(true);
        await executionShortcuts.executeSelected.execute({ payload: {} });
        expect(executionStore.executeNodes).toHaveBeenLastCalledWith(
          "selected",
        );
      });

      it("checks theres no unapplied settings before execution", async () => {
        const { nodeConfigurationStore } = createStore();

        nodeConfigurationStore.autoApplySettings.mockResolvedValue(false);
        await executionShortcuts.executeSelected.execute({ payload: {} });
        expect(nodeConfigurationStore.autoApplySettings).toHaveBeenCalledWith({
          nextNodeId: undefined,
        });
      });

      it("executeAndOpenView", async () => {
        const { executionStore, selectionStore } = createStore();

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {
            canExecute: true,
            canOpenView: true,
          },
        };
        await executionShortcuts.executeAndOpenView.execute({ payload: {} });
        expect(executionStore.executeNodeAndOpenView).toHaveBeenCalledWith(
          "root:0",
        );
      });

      it("executeAndOpenView with passed nodeId", async () => {
        const { executionStore, selectionStore } = createStore();

        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: {
            canExecute: true,
            canOpenView: true,
          },
        };
        await executionShortcuts.executeAndOpenView.execute({
          payload: { metadata: { nodeId: "test:id" } },
        });
        expect(executionStore.executeNodeAndOpenView).toHaveBeenCalledWith(
          "test:id",
        );
      });

      it("cancelSelected", () => {
        const { executionStore } = createStore();

        executionShortcuts.cancelSelected.execute({ payload: {} });
        expect(executionStore.cancelNodeExecution).toHaveBeenCalledWith(
          "selected",
        );
      });

      it("resetSelected", () => {
        const { executionStore } = createStore();

        executionShortcuts.resetSelected.execute({ payload: {} });
        expect(executionStore.resetNodes).toHaveBeenCalledWith("selected");
      });
    });

    describe("single selection", () => {
      const createStore = () => {
        const { workflowStore, selectionStore, executionStore } = mockStores();

        workflowStore.activeWorkflow = createWorkflow({ allowedActions: {} });
        selectionStore.singleSelectedNode = { id: "root:3" };

        return {
          executionStore,
        };
      };

      it("resumeLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.resumeLoopExecution.execute({ payload: {} });
        expect(executionStore.resumeLoopExecution).toHaveBeenCalledWith(
          "root:3",
        );
      });

      it("pauseLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.pauseLoopExecution.execute({ payload: {} });
        expect(executionStore.pauseLoopExecution).toHaveBeenCalledWith(
          "root:3",
        );
      });

      it("stepLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.stepLoopExecution.execute({ payload: {} });
        expect(executionStore.stepLoopExecution).toHaveBeenCalledWith("root:3");
      });
    });
  });

  describe("condition", () => {
    describe("all", () => {
      it("executeAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.executeAll.condition()).toBeFalsy();
        workflowStore.activeWorkflow.allowedActions.canExecute = true;
        expect(executionShortcuts.executeAll.condition()).toBe(true);
      });

      it("cancelAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.cancelAll.condition()).toBeFalsy();
        workflowStore.activeWorkflow.allowedActions.canCancel = true;
        expect(executionShortcuts.cancelAll.condition()).toBe(true);
      });

      it("resetAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.resetAll.condition()).toBeFalsy();
        workflowStore.activeWorkflow.allowedActions.canReset = true;
        expect(executionShortcuts.resetAll.condition()).toBe(true);
      });
    });

    describe("selection", () => {
      it("executeSelected", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.executeSelected.condition()).toBeFalsy();
        selectionStore.getSelectedNodes = [
          {
            allowedActions: { canExecute: true },
          },
        ];
        expect(executionShortcuts.executeSelected.condition()).toBe(true);
      });

      it("cancelSelected", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.cancelSelected.condition()).toBeFalsy();
        selectionStore.getSelectedNodes = [
          {
            allowedActions: { canCancel: true },
          },
        ];
        expect(executionShortcuts.cancelSelected.condition()).toBe(true);
      });

      it("resetSelected", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.resetSelected.condition()).toBeFalsy();
        selectionStore.getSelectedNodes = [
          {
            allowedActions: { canReset: true },
          },
        ];
        expect(executionShortcuts.resetSelected.condition()).toBe(true);
      });
    });

    describe("single selection", () => {
      it("resumeLoopExecution", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.resumeLoopExecution.condition()).toBeFalsy();
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: {
            allowedActions: {
              canResume: true,
            },
          },
        };
        expect(executionShortcuts.resumeLoopExecution.condition()).toBe(true);
      });

      it("pauseLoopExecution", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.pauseLoopExecution.condition()).toBeFalsy();
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: {
            allowedActions: {
              canPause: true,
            },
          },
        };
        expect(executionShortcuts.pauseLoopExecution.condition()).toBe(true);
      });

      it("stepLoopExecution", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.stepLoopExecution.condition()).toBeFalsy();
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: {
            allowedActions: {
              canStep: true,
            },
          },
        };
        expect(executionShortcuts.stepLoopExecution.condition()).toBe(true);
      });
    });
  });
});
