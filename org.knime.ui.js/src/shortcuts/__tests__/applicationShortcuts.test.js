import { expect, describe, beforeEach, it, vi } from "vitest";
import applicationShortcuts from "../applicationShortcuts";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";
import { APP_ROUTES } from "@/router/appRoutes";

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

  describe("closeProject", () => {
    it("execute", () => {
      applicationShortcuts.closeProject.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("workflow/closeProject", "1");
    });

    it("condition", () => {
      expect(applicationShortcuts.closeProject.condition({ $store })).toBe(
        true,
      );
      $store.state.workflow.activeWorkflow.projectId = null;
      expect(
        applicationShortcuts.closeProject.condition({ $store }),
      ).toBeFalsy();
    });
  });

  describe("switchTabs", () => {
    // Shared test for forward/backward conditions
    it.each([
      [
        "switchToNextWorkflow",
        applicationShortcuts.switchToNextWorkflow.condition,
      ],
      [
        "switchToPreviousWorkflow",
        applicationShortcuts.switchToPreviousWorkflow.condition,
      ],
    ])("condition (%s)", (_, condition) => {
      $store.state.application = {
        activeProjectId: "A",
        openProjects: [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ],
      };
      expect(condition({ $store })).toBe(true);
      // no active project
      $store.state.application = {
        openProjects: [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ],
      };
      expect(condition({ $store })).toBe(false);
      // Only one open project
      $store.state.application = {
        activeProjectId: "A",
        openProjects: [{ projectId: "A" }],
      };
      expect(condition({ $store })).toBe(false);
    });

    it.each([
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ])(
      "execute switchToNextWorkflow (%s -> %s)",
      (activeProjectId, expectedProjectId) => {
        const $router = { push: vi.fn() };
        $store.state.application.openProjects = [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ];
        $store.state.application.activeProjectId = activeProjectId;
        applicationShortcuts.switchToNextWorkflow.execute({ $store, $router });
        expect($router.push).toHaveBeenNthCalledWith(1, {
          name: APP_ROUTES.WorkflowPage,
          params: {
            projectId: expectedProjectId,
            workflowId: "root",
          },
        });
      },
    );

    it.each([
      ["A", "C"],
      ["B", "A"],
      ["C", "B"],
    ])(
      "execute switchToPreviousWorkflow (%s -> %s)",
      (activeProjectId, expectedProjectId) => {
        const $router = { push: vi.fn() };
        $store.state.application.openProjects = [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ];
        $store.state.application.activeProjectId = activeProjectId;
        applicationShortcuts.switchToPreviousWorkflow.execute({
          $store,
          $router,
        });
        expect($router.push).toHaveBeenNthCalledWith(1, {
          name: APP_ROUTES.WorkflowPage,
          params: {
            projectId: expectedProjectId,
            workflowId: "root",
          },
        });
      },
    );
  });
});
