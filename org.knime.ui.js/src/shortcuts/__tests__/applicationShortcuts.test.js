import { expect, describe, beforeEach, it, vi } from "vitest";
import applicationShortcuts from "../applicationShortcuts";

describe("applicationShortcuts", () => {
  let mockDispatch, mockCommit, $store;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockCommit = vi.fn();
    $store = {
      dispatch: mockDispatch,
      commit: mockCommit,
      state: {
        workflow: {
          activeWorkflow: {
            projectId: "1",
          },
        },
      },
    };
  });

  it("createWorkflow", () => {
    applicationShortcuts.createWorkflow.execute({ $store });
    expect(mockCommit).toHaveBeenCalledWith(
      "spaces/setIsCreateWorkflowModalOpen",
      true
    );
  });

  it("closeWorkflow", () => {
    applicationShortcuts.closeWorkflow.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("workflow/closeWorkflow", "1");
  });

  describe("condition", () => {
    it("closeWorkflow", () => {
      expect(applicationShortcuts.closeWorkflow.condition({ $store })).toBe(
        true
      );
      $store.state.workflow.activeWorkflow.projectId = null;
      expect(
        applicationShortcuts.closeWorkflow.condition({ $store })
      ).toBeFalsy();
    });
  });
});
