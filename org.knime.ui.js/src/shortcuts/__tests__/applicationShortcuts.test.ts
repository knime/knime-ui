import { describe, expect, it, vi } from "vitest";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces/common";
import { createProject, createWorkflow } from "@/test/factories";
import { mockShortcutContext } from "@/test/factories/shortcuts";
import { mockStores } from "@/test/utils/mockStores";
import applicationShortcuts from "../applicationShortcuts";

const mockPathTriplet = { spaceId: "1", spaceProviderId: "2", itemId: "3" };

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
    // @ts-expect-error
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

      applicationShortcuts.createWorkflow.execute(mockShortcutContext());

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: "project1",
      });
    });

    it("should work when project is from unknown origin", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = {
        [cachedLocalSpaceProjectId]: mockPathTriplet,
      };
      // @ts-expect-error
      applicationStore.isUnknownProject = () => true;
      applicationShortcuts.createWorkflow.execute(mockShortcutContext());

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      });
    });

    it("should work when no project is open AND user is browsing space", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = {
        [globalSpaceBrowserProjectId]: mockPathTriplet,
      };
      applicationStore.activeProjectId = null;
      applicationShortcuts.createWorkflow.execute(mockShortcutContext());

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: globalSpaceBrowserProjectId,
      });
    });

    it("should work when no project is open AND user is NOT browsing any space", () => {
      const { applicationStore, spacesStore, spaceCachingStore } =
        createStore();

      spaceCachingStore.projectPath = {
        [cachedLocalSpaceProjectId]: mockPathTriplet,
      };
      applicationStore.activeProjectId = null;
      applicationShortcuts.createWorkflow.execute(mockShortcutContext());

      expect(spacesStore.setCreateWorkflowModalConfig).toHaveBeenCalledWith({
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      });
    });
  });

  describe("closeProject", () => {
    it("execute", () => {
      const { desktopInteractionsStore } = createStore();

      applicationShortcuts.closeProject.execute(mockShortcutContext());
      expect(desktopInteractionsStore.closeProject).toHaveBeenCalledWith(
        "project1",
      );
    });

    it("condition", () => {
      const { workflowStore } = createStore();

      expect(applicationShortcuts.closeProject.condition?.()).toBe(true);
      // @ts-expect-error
      workflowStore.activeWorkflow.projectId = null;
      expect(applicationShortcuts.closeProject.condition?.()).toBe(false);
    });
  });

  describe("switchTabs", () => {
    const initialOpenProjects = [
      createProject({ projectId: "A", name: "A" }),
      createProject({ projectId: "B", name: "B" }),
      createProject({ projectId: "C", name: "C" }),
    ];
    const getRoute = (projectId: string | null) => ({
      name: projectId ? APP_ROUTES.WorkflowPage : APP_ROUTES.Home.GetStarted,
      params: projectId ? { projectId, workflowId: "root" } : undefined,
    });

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

        applicationStore.openProjects = initialOpenProjects;
        applicationStore.activeProjectId = activeProjectId;
        applicationShortcuts.switchToNextWorkflow.execute(
          mockShortcutContext({ $router }),
        );

        const { name, params } = getRoute(expectedProjectId);
        expect($router.push).toHaveBeenNthCalledWith(1, { name, params });
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

        applicationStore.openProjects = initialOpenProjects;
        applicationStore.activeProjectId = activeProjectId;
        applicationShortcuts.switchToPreviousWorkflow.execute(
          mockShortcutContext({ $router }),
        );

        const { name, params } = getRoute(expectedProjectId);
        expect($router.push).toHaveBeenNthCalledWith(1, { name, params });
      },
    );
  });
});
