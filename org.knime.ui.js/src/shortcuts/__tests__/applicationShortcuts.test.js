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
      getters: {
        "application/isUnknownProject": () => false,
      },
    };
  });

  describe("createWorkflow", () => {
    it("should work when project is open", () => {
      applicationShortcuts.createWorkflow.execute({ $store });
      expect(mockCommit).toHaveBeenCalledWith(
        "spaces/setCreateWorkflowModalConfig",
        {
          isOpen: true,
          projectId: "1",
        },
      );
    });

    it("should work when project is from unknown origin", () => {
      $store.state.spaces.projectPath = { [cachedLocalSpaceProjectId]: {} };
      $store.getters["application/isUnknownProject"] = () => true;
      applicationShortcuts.createWorkflow.execute({ $store });
      expect(mockCommit).toHaveBeenCalledWith(
        "spaces/setCreateWorkflowModalConfig",
        {
          isOpen: true,
          projectId: cachedLocalSpaceProjectId,
        },
      );
    });

    it("should work when no project is open AND user is browsing space", () => {
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

    it("should work when no project is open AND user is NOT browsing any space", () => {
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
  });

  it("closeProject", () => {
    applicationShortcuts.closeProject.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("workflow/closeProject", "1");
  });

  describe("condition", () => {
    it("closeProject", () => {
      expect(applicationShortcuts.closeProject.condition({ $store })).toBe(
        true,
      );
      $store.state.workflow.activeWorkflow.projectId = null;
      expect(
        applicationShortcuts.closeProject.condition({ $store }),
      ).toBeFalsy();
    });
  });
});
