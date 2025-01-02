import { describe, expect, it, vi } from "vitest";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces/common";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import applicationShortcuts from "../applicationShortcuts";

describe("applicationShortcuts", () => {
  const createStore = () => {
    const {
      applicationStore,
      workflowStore,
      spacesStore,
      spaceCachingStore,
      desktopInteractionsStore,
    } = mockStores();

    applicationStore.activeProjectId = "project1";
    workflowStore.activeWorkflow = createWorkflow();
    spaceCachingStore.projectPath = {};
    // @ts-expect-error: Getter is read only
    applicationStore.isUnknownProject = () => false;

    return {
      applicationStore,
      workflowStore,
      spacesStore,
      spaceCachingStore,
      desktopInteractionsStore,
    };
  };

  describe("createWorkflow", () => {
    it("should work when project is open", () => {
      const { spacesStore } = createStore();

      applicationShortcuts.createWorkflow.execute();

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: "project1",
      });
    });

    it("should work when project is from unknown origin", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = { [cachedLocalSpaceProjectId]: {} };
      applicationStore.isUnknownProject = () => true;
      applicationShortcuts.createWorkflow.execute();

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      });
    });

    it("should work when no project is open AND user is browsing space", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = { [globalSpaceBrowserProjectId]: {} };
      applicationStore.activeProjectId = null;
      applicationShortcuts.createWorkflow.execute();

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: globalSpaceBrowserProjectId,
      });
    });

    it("should work when no project is open AND user is NOT browsing any space", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = { [cachedLocalSpaceProjectId]: {} };
      applicationStore.activeProjectId = null;
      applicationShortcuts.createWorkflow.execute();

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      });
    });
  });

  describe("closeProject", () => {
    it("execute", () => {
      const { desktopInteractionsStore } = createStore();

      applicationShortcuts.closeProject.execute();
      expect(desktopInteractionsStore.closeProject).toHaveBeenCalledWith(
        "project1",
      );
    });

    it("condition", () => {
      const { workflowStore } = createStore();

      expect(applicationShortcuts.closeProject.condition()).toBe(true);
      workflowStore.activeWorkflow.projectId = null;
      expect(applicationShortcuts.closeProject.condition()).toBeFalsy();
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
        const { applicationStore } = createStore();
        const $router = { push: vi.fn() };

        applicationStore.openProjects = [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ];
        applicationStore.activeProjectId = activeProjectId;
        applicationShortcuts.switchToNextWorkflow.execute({ $router });

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
        const { applicationStore } = createStore();
        const $router = { push: vi.fn() };

        applicationStore.openProjects = [
          { projectId: "A" },
          { projectId: "B" },
          { projectId: "C" },
        ];
        applicationStore.activeProjectId = activeProjectId;
        applicationShortcuts.switchToPreviousWorkflow.execute({
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
