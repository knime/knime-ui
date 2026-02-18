import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import type { Project } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { router } from "@/router/router";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";

import { applicationState, loadStore } from "./loadStore";

vi.mock("@/lib/workflowNavigationService", () => {
  return {
    workflowNavigationService: {
      nearestObject: vi.fn(),
    },
  };
});

describe("application", () => {
  it("should have dismissedUpdateBanner set to false by default", () => {
    const { applicationStore } = loadStore();
    expect(applicationStore.dismissedUpdateBanner).toBe(false);
  });

  it("returns the active project", () => {
    const { applicationStore } = loadStore();
    const project1 = createProject({
      projectId: "foo",
      origin: { itemId: "1", spaceId: "1", providerId: "1" },
    });
    applicationStore.setOpenProjects([
      project1,
      createProject({ projectId: "bee" }),
    ]);
    applicationStore.setActiveProjectId("foo");
    expect(applicationStore.activeProject).toEqual(project1);

    applicationStore.setActiveProjectId("baz");
    expect(applicationStore.activeProject).toBeNull();

    applicationStore.setActiveProjectId(null);
    expect(applicationStore.activeProject).toBeNull();
  });

  it("returns the active project's origin", () => {
    const { applicationStore } = loadStore();

    const origin1 = { itemId: "1", spaceId: "1", providerId: "1" };
    const project1 = createProject({
      projectId: "foo",
      origin: origin1,
    });
    applicationStore.setOpenProjects([
      project1,
      createProject({ projectId: "bee" }),
    ]);
    applicationStore.setActiveProjectId("foo");
    expect(applicationStore.activeProjectOrigin).toEqual(origin1);
    applicationStore.setActiveProjectId("bee");
    expect(applicationStore.activeProjectOrigin).toBeNull();
    applicationStore.setActiveProjectId("baz");
    expect(applicationStore.activeProjectOrigin).toBeNull();
  });

  it("determines whether a project is of unknown origin", () => {
    const { applicationStore, spaceProvidersStore } = loadStore();
    applicationStore.setOpenProjects([
      // project without origin
      createProject({ projectId: "project1" }),
      // project with origin BUT KNOWN space
      createProject({
        projectId: "project2",
        origin: { providerId: "provider1", spaceId: "known-space" },
      }),
      // project with origin BUT UNKNOWN space
      createProject({
        projectId: "project3",
        origin: { providerId: "provider1", spaceId: "some-space" },
      }),
    ]);

    spaceProvidersStore.setSpaceProviders({
      provider1: createSpaceProvider({
        id: "provider1",
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ id: "known-space" })] }),
        ],
      }),
    });

    expect(applicationStore.isUnknownProject("project1")).toBe(true);
    expect(applicationStore.isUnknownProject("project2")).toBe(false);
    expect(applicationStore.isUnknownProject("project3")).toBe(true);
  });

  describe("getNextProjectId", () => {
    const { applicationStore } = loadStore();
    const projects: Project[] = Array.from({ length: 4 }, (_, i) => ({
      name: `project ${i + 1}`,
      projectId: `projectId${i + 1}`,
    }));

    it("returns active projectId if active project is not in closing projects", () => {
      const closingProjectIds = projects
        .slice(0, 3)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[3].projectId);

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBe(projects[3].projectId);
    });

    it("returns null if active project is closed and there is exactly one open project", () => {
      const closingProjectIds = projects
        .slice(0, 3)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects([projects[3]]);

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBeNull();
    });

    it("returns null if active project is closed and there are at least two open projects which are alle closed", () => {
      const closingProjectIds = projects.map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects(projects.slice(0, 2));

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBeNull();
    });

    it("returns projectId of next open project if active project is closed and at least one open project is not closed", () => {
      const { applicationStore } = loadStore();
      const closingProjectIds = projects
        .slice(0, 1)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects(projects.slice(0, 2));

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBe(projects[1].projectId);
    });
  });

  describe("replace application State", () => {
    it("replaces application state", () => {
      const { applicationStore } = loadStore();
      applicationStore.replaceApplicationState(applicationState);

      expect(applicationStore.openProjects).toStrictEqual([
        { projectId: "foo", name: "bar" },
      ]);
    });

    it("does not setWorkflow when replacing application state and the activeProject did not change", () => {
      const applicationState = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          {
            projectId: "baz",
            name: "bar",
            activeWorkflow: { workflow: { info: {} } },
          },
        ],
      };
      const { applicationStore, lifecycleStore } = loadStore();
      applicationStore.setActiveProjectId("baz");
      applicationStore.replaceApplicationState(applicationState);

      expect(lifecycleStore.setWorkflow).not.toHaveBeenCalled();
      expect(applicationStore.activeProjectId).toBe("baz");
    });

    it("loads the proper (lastActive) workflow when the activeProject has an existing saved state", async () => {
      const applicationState = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          { projectId: "baz", name: "bar", activeWorkflowId: "root" },
        ],
      };
      const { applicationStore, canvasStateTrackingStore, lifecycleStore } =
        loadStore();
      canvasStateTrackingStore.setSavedCanvasStates({
        workflow: "root:2",
        project: "baz",
        zoomFactor: 1,
      });

      await lifecycleStore.initializeApplication({
        $router: router,
      });
      applicationStore.replaceApplicationState(applicationState);

      await lifecycleStore.setActiveProject({ $router: router });

      await flushPromises();

      expect(lifecycleStore.loadWorkflow).toHaveBeenCalledWith({
        projectId: "baz",
        workflowId: "root:2",
        versionId: null,
      });
    });

    it("replaces hasNodeCollectionActive", () => {
      const { applicationStore, nodeRepositoryStore } = loadStore();

      vi.mocked(nodeRepositoryStore.resetSearchAndTags).mockImplementation(() =>
        Promise.resolve(),
      );

      // first call sets the `hasNodeCollectionActive` flag from `null` to `true`, no refetch
      applicationStore.replaceApplicationState({
        hasNodeCollectionActive: true,
      });
      expect(nodeRepositoryStore.resetSearchAndTags).not.toHaveBeenCalled();

      // second call sets the flag from `true` to `false`, triggers a refetch
      applicationStore.replaceApplicationState({
        hasNodeCollectionActive: false,
      });
      expect(nodeRepositoryStore.resetSearchAndTags).toHaveBeenCalled();
    });
  });

  describe("set active workflow", () => {
    it("should be set if fetched from backend", async () => {
      const state = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          {
            projectId: "bee",
            name: "gee",
            activeWorkflowId: "root",
          },
        ],
      };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-expect-error
        $router: mockRouter,
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          projectId: "bee",
          workflowId: "root",
        },
        query: {
          version: null,
        },
        force: false,
      });
    });

    it("does not set active project and navigates to entry page if there are no open workflows", async () => {
      const state = { openProjects: [] };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-expect-error
        $router: mockRouter,
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });

    it("does not navigate to home page if already there when there are no open projects", async () => {
      const state = { openProjects: [] };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      mockRouter.currentRoute.value.name = APP_ROUTES.Home.SpaceBrowsingPage;

      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-expect-error
        $router: mockRouter,
      });

      expect(mockRouter.push).not.toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });
  });
});
