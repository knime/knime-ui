import { describe, expect, it, vi } from "vitest";

import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import executionShortcuts from "../executionShortcuts";

import { mockShortcutContext } from "./mock-context";

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

        executionShortcuts.executeAll.execute(mockShortcutContext());
        expect(executionStore.executeNodes).toHaveBeenCalledWith("all");
      });

      it("cancelAll", () => {
        const { executionStore } = createStore();

        executionShortcuts.cancelAll.execute(mockShortcutContext());
        expect(executionStore.cancelNodeExecution).toHaveBeenCalledWith("all");
      });

      it("resetAll", () => {
        const { executionStore } = createStore();

        executionShortcuts.resetAll.execute(mockShortcutContext());
        expect(executionStore.resetNodes).toHaveBeenCalledWith("all");
      });
    });

    describe("selection", () => {
      it("executeSelected", async () => {
        const { executionStore, nodeConfigurationStore } = createStore();

        vi.mocked(nodeConfigurationStore).autoApplySettings.mockResolvedValue(
          true,
        );
        await executionShortcuts.executeSelected.execute(mockShortcutContext());
        expect(executionStore.executeNodes).toHaveBeenLastCalledWith(
          "selected",
        );
      });

      it("checks theres no unapplied settings before execution", async () => {
        const { nodeConfigurationStore } = createStore();

        vi.mocked(nodeConfigurationStore).autoApplySettings.mockResolvedValue(
          false,
        );
        await executionShortcuts.executeSelected.execute(mockShortcutContext());
        expect(nodeConfigurationStore.autoApplySettings).toHaveBeenCalled();
      });

      it("executeAndOpenView", async () => {
        const { executionStore, selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: { canExecute: true, canOpenView: true },
        };
        await executionShortcuts.executeAndOpenView.execute(
          mockShortcutContext(),
        );
        expect(executionStore.executeNodeAndOpenView).toHaveBeenCalledWith(
          "root:0",
        );
      });

      it("executeAndOpenView with passed nodeId", async () => {
        const { executionStore, selectionStore } = createStore();

        // @ts-expect-error
        selectionStore.singleSelectedNode = {
          id: "root:0",
          allowedActions: { canExecute: true, canOpenView: true },
        };
        await executionShortcuts.executeAndOpenView.execute(
          mockShortcutContext(),
        );
        expect(executionStore.executeNodeAndOpenView).toHaveBeenCalledWith(
          "root:0",
        );
      });

      it("cancelSelected", () => {
        const { executionStore } = createStore();

        executionShortcuts.cancelSelected.execute(mockShortcutContext());
        expect(executionStore.cancelNodeExecution).toHaveBeenCalledWith(
          "selected",
        );
      });

      it("resetSelected", () => {
        const { executionStore } = createStore();

        executionShortcuts.resetSelected.execute(mockShortcutContext());
        expect(executionStore.resetNodes).toHaveBeenCalledWith("selected");
      });
    });

    describe("single selection", () => {
      const createStore = () => {
        const { workflowStore, selectionStore, executionStore } = mockStores();

        workflowStore.activeWorkflow = createWorkflow({ allowedActions: {} });
        // @ts-expect-error
        selectionStore.singleSelectedNode = { id: "root:3" };

        return { executionStore };
      };

      it("resumeLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.resumeLoopExecution.execute(mockShortcutContext());
        expect(executionStore.resumeLoopExecution).toHaveBeenCalledWith(
          "root:3",
        );
      });

      it("pauseLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.pauseLoopExecution.execute(mockShortcutContext());
        expect(executionStore.pauseLoopExecution).toHaveBeenCalledWith(
          "root:3",
        );
      });

      it("stepLoopExecution", () => {
        const { executionStore } = createStore();

        executionShortcuts.stepLoopExecution.execute(mockShortcutContext());
        expect(executionStore.stepLoopExecution).toHaveBeenCalledWith("root:3");
      });
    });
  });

  describe("condition", () => {
    describe("all", () => {
      it("executeAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.executeAll.condition?.()).toBe(false);
        workflowStore.activeWorkflow!.allowedActions!.canExecute = true;
        expect(executionShortcuts.executeAll.condition?.()).toBe(true);
      });

      it("cancelAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.cancelAll.condition?.()).toBe(false);
        workflowStore.activeWorkflow!.allowedActions!.canCancel = true;
        expect(executionShortcuts.cancelAll.condition?.()).toBe(true);
      });

      it("resetAll", () => {
        const { workflowStore } = createStore();

        expect(executionShortcuts.resetAll.condition?.()).toBe(false);
        workflowStore.activeWorkflow!.allowedActions!.canReset = true;
        expect(executionShortcuts.resetAll.condition?.()).toBe(true);
      });
    });

    describe("selection", () => {
      it("executeSelected", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.executeSelected.condition?.()).toBe(false);
        // @ts-expect-error
        selectionStore.getSelectedNodes = [
          { allowedActions: { canExecute: true } },
        ];
        expect(executionShortcuts.executeSelected.condition?.()).toBe(true);
      });

      it("cancelSelected", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.cancelSelected.condition?.()).toBe(false);
        // @ts-expect-error
        selectionStore.getSelectedNodes = [
          { allowedActions: { canCancel: true } },
        ];
        expect(executionShortcuts.cancelSelected.condition?.()).toBe(true);
      });

      it("resetSelected", () => {
        const { selectionStore } = createStore();
        expect(executionShortcuts.resetSelected.condition?.()).toBe(false);
        // @ts-expect-error
        selectionStore.getSelectedNodes = [
          { allowedActions: { canReset: true } },
        ];
        expect(executionShortcuts.resetSelected.condition?.()).toBe(true);
      });
    });

    describe("single selection", () => {
      it("resumeLoopExecution", () => {
        const { selectionStore } = createStore();

        expect(executionShortcuts.resumeLoopExecution.condition?.()).toBe(
          false,
        );
        // @ts-expect-error
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: { allowedActions: { canResume: true } },
        };
        expect(executionShortcuts.resumeLoopExecution.condition?.()).toBe(true);
      });

      it("pauseLoopExecution", () => {
        const { selectionStore } = createStore();
        expect(executionShortcuts.pauseLoopExecution.condition?.()).toBe(false);
        // @ts-expect-error
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: { allowedActions: { canPause: true } },
        };
        expect(executionShortcuts.pauseLoopExecution.condition?.()).toBe(true);
      });

      it("stepLoopExecution", () => {
        const { selectionStore } = createStore();
        expect(executionShortcuts.stepLoopExecution.condition?.()).toBe(false);
        // @ts-expect-error
        selectionStore.singleSelectedNode = {
          kind: "node",
          loopInfo: { allowedActions: { canStep: true } },
        };
        expect(executionShortcuts.stepLoopExecution.condition?.()).toBe(true);
      });
    });
  });
});
