import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";
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
    it.each([
      [null, "A"],
      ["A", "B"],
      ["B", "C"],
      ["C", null],
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

        const routeName =
          expectedProjectId === null
            ? APP_ROUTES.Home.GetStarted
            : APP_ROUTES.WorkflowPage;

        const routeParams =
          expectedProjectId === null
            ? undefined
            : {
                projectId: expectedProjectId,
                workflowId: "root",
              };

        expect($router.push).toHaveBeenNthCalledWith(1, {
          name: routeName,
          params: routeParams,
        });
      },
    );

    it.each([
      [null, "C"],
      ["C", "B"],
      ["B", "A"],
      ["A", null],
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

        const routeName =
          expectedProjectId === null
            ? APP_ROUTES.Home.GetStarted
            : APP_ROUTES.WorkflowPage;

        const routeParams =
          expectedProjectId === null
            ? undefined
            : {
                projectId: expectedProjectId,
                workflowId: "root",
              };

        expect($router.push).toHaveBeenNthCalledWith(1, {
          name: routeName,
          params: routeParams,
        });
      },
    );
  });
});
