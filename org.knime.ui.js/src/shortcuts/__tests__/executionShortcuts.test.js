import { beforeEach, describe, expect, it, vi } from "vitest";

import executionShortcuts from "../executionShortcuts";

describe("executionShortcuts", () => {
  let mockDispatch, $store;

  beforeEach(() => {
    mockDispatch = vi.fn();
    $store = {
      dispatch: mockDispatch,
      state: {
        workflow: {
          activeWorkflow: {
            allowedActions: {},
          },
        },
      },
      getters: {
        "selection/selectedNodes": [],
        "selection/singleSelectedNode": null,
      },
    };
  });

  describe("execute", () => {
    describe("all", () => {
      it("executeAll", () => {
        executionShortcuts.executeAll.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/executeNodes",
          "all",
        );
      });

      it("cancelAll", () => {
        executionShortcuts.cancelAll.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/cancelNodeExecution",
          "all",
        );
      });

      it("resetAll", () => {
        executionShortcuts.resetAll.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith("workflow/resetNodes", "all");
      });
    });

    describe("selection", () => {
      it("executeSelected", () => {
        executionShortcuts.executeSelected.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/executeNodes",
          "selected",
        );
      });

      it("executeAndOpenView", async () => {
        $store.getters["selection/singleSelectedNode"] = {
          id: "root:0",
          allowedActions: {
            canExecute: true,
            canOpenView: true,
          },
        };
        await executionShortcuts.executeAndOpenView.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/executeNodeAndOpenView",
          "root:0",
        );
      });

      it("executeAndOpenView with passed nodeId", async () => {
        $store.getters["selection/singleSelectedNode"] = {
          id: "root:0",
          allowedActions: {
            canExecute: true,
            canOpenView: true,
          },
        };
        await executionShortcuts.executeAndOpenView.execute({
          $store,
          payload: { metadata: { nodeId: "test:id" } },
        });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/executeNodeAndOpenView",
          "test:id",
        );
      });

      it("cancelSelected", () => {
        executionShortcuts.cancelSelected.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/cancelNodeExecution",
          "selected",
        );
      });

      it("resetSelected", () => {
        executionShortcuts.resetSelected.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/resetNodes",
          "selected",
        );
      });
    });

    describe("single selection", () => {
      beforeEach(() => {
        $store.getters["selection/singleSelectedNode"] = { id: "root:3" };
      });

      it("resumeLoopExecution", () => {
        executionShortcuts.resumeLoopExecution.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/resumeLoopExecution",
          "root:3",
        );
      });

      it("pauseLoopExecution", () => {
        executionShortcuts.pauseLoopExecution.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/pauseLoopExecution",
          "root:3",
        );
      });

      it("stepLoopExecution", () => {
        executionShortcuts.stepLoopExecution.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith(
          "workflow/stepLoopExecution",
          "root:3",
        );
      });
    });
  });

  describe("condition", () => {
    describe("all", () => {
      it("executeAll", () => {
        expect(executionShortcuts.executeAll.condition({ $store })).toBeFalsy();
        $store.state.workflow.activeWorkflow.allowedActions.canExecute = true;
        expect(executionShortcuts.executeAll.condition({ $store })).toBe(true);
      });

      it("cancelAll", () => {
        expect(executionShortcuts.cancelAll.condition({ $store })).toBeFalsy();
        $store.state.workflow.activeWorkflow.allowedActions.canCancel = true;
        expect(executionShortcuts.cancelAll.condition({ $store })).toBe(true);
      });

      it("resetAll", () => {
        expect(executionShortcuts.resetAll.condition({ $store })).toBeFalsy();
        $store.state.workflow.activeWorkflow.allowedActions.canReset = true;
        expect(executionShortcuts.resetAll.condition({ $store })).toBe(true);
      });
    });

    describe("selection", () => {
      it("executeSelected", () => {
        expect(
          executionShortcuts.executeSelected.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/selectedNodes"] = [
          {
            allowedActions: { canExecute: true },
          },
        ];
        expect(executionShortcuts.executeSelected.condition({ $store })).toBe(
          true,
        );
      });

      it("cancelSelected", () => {
        expect(
          executionShortcuts.cancelSelected.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/selectedNodes"] = [
          {
            allowedActions: { canCancel: true },
          },
        ];
        expect(executionShortcuts.cancelSelected.condition({ $store })).toBe(
          true,
        );
      });

      it("resetSelected", () => {
        expect(
          executionShortcuts.resetSelected.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/selectedNodes"] = [
          {
            allowedActions: { canReset: true },
          },
        ];
        expect(executionShortcuts.resetSelected.condition({ $store })).toBe(
          true,
        );
      });
    });

    describe("single selection", () => {
      it("resumeLoopExecution", () => {
        expect(
          executionShortcuts.resumeLoopExecution.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/singleSelectedNode"] = {
          loopInfo: {
            allowedActions: {
              canResume: true,
            },
          },
        };
        expect(
          executionShortcuts.resumeLoopExecution.condition({ $store }),
        ).toBe(true);
      });

      it("pauseLoopExecution", () => {
        expect(
          executionShortcuts.pauseLoopExecution.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/singleSelectedNode"] = {
          loopInfo: {
            allowedActions: {
              canPause: true,
            },
          },
        };
        expect(
          executionShortcuts.pauseLoopExecution.condition({ $store }),
        ).toBe(true);
      });

      it("stepLoopExecution", () => {
        expect(
          executionShortcuts.stepLoopExecution.condition({ $store }),
        ).toBeFalsy();
        $store.getters["selection/singleSelectedNode"] = {
          loopInfo: {
            allowedActions: {
              canStep: true,
            },
          },
        };
        expect(executionShortcuts.stepLoopExecution.condition({ $store })).toBe(
          true,
        );
      });
    });
  });
});
