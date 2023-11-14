import { expect, describe, beforeEach, it, vi } from "vitest";
import applicationShortcuts from "../applicationShortcuts";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";

describe("applicationShortcuts", () => {
  let mockDispatch, mockCommit, $store;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockCommit = vi.fn();
    $store = {
      dispatch: mockDispatch,
      commit: mockCommit,
      state: {
        application: {
          activeProjectId: "1",
        },
        workflow: {
          activeWorkflow: {
            projectId: "1",
          },
        },
        spaces: {
          projectPath: {},
        },
      },
    };
  });

  it("createWorkflow when project is open", () => {
    applicationShortcuts.createWorkflow.execute({ $store });
    expect(mockCommit).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      {
        isOpen: true,
        projectId: "1",
      },
    );
  });

  it("createWorkflow when no project is open AND user is browsing space", () => {
    $store.state.spaces.projectPath = { [globalSpaceBrowserProjectId]: {} };
    $store.state.application.activeProjectId = null;

    applicationShortcuts.createWorkflow.execute({ $store });

    expect(mockCommit).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      {
        isOpen: true,
        projectId: globalSpaceBrowserProjectId,
      },
    );
  });

  it("createWorkflow when no project is open AND user is NOT browsing anyy space", () => {
    $store.state.spaces.projectPath = { [cachedLocalSpaceProjectId]: {} };
    $store.state.application.activeProjectId = null;

    applicationShortcuts.createWorkflow.execute({ $store });
    expect(mockCommit).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      {
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      },
    );
  });

  it("closeWorkflow", () => {
    applicationShortcuts.closeWorkflow.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("workflow/closeWorkflow", "1");
  });

  describe("condition", () => {
    it("closeWorkflow", () => {
      expect(applicationShortcuts.closeWorkflow.condition({ $store })).toBe(
        true,
      );
      $store.state.workflow.activeWorkflow.projectId = null;
      expect(
        applicationShortcuts.closeWorkflow.condition({ $store }),
      ).toBeFalsy();
    });
  });
});
