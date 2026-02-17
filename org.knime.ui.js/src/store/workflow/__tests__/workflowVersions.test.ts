/* eslint-disable max-lines */
import { afterEach } from "vitest";
import { type Mocked, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";
import { useRouter } from "vue-router";

import { rfcErrors } from "@knime/hub-features";
import {
  CURRENT_STATE_VERSION,
  type ItemSavepoint,
  type WithAvatar,
  type WithLabels,
  useVersionsApi,
} from "@knime/hub-features/versions";
import { promise as promiseUtils } from "@knime/utils";

import { SpaceProviderNS } from "@/api/custom-types";
import { UnsavedChangesAction } from "@/composables/confirmDialogs/useUnsavedChangesDialog";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import type { VersionsModeStatus } from "../workflowVersions";

const mockSavepoints: Array<ItemSavepoint & WithAvatar & WithLabels> =
  vi.hoisted(() => {
    const mockDate = "2024-11-11T11:11:00.000Z";
    return [
      {
        avatar: { kind: "account", name: "Mira Mock" },
        author: "Mira Mock",
        changes: [],
        labels: [],
        lastEditedOn: mockDate,
        savepointNumber: 3,
      },
      {
        avatar: { kind: "account", name: "Mira Mock" },
        author: "Mira Mock",
        changes: [],
        labels: [],
        lastEditedOn: mockDate,
        savepointNumber: 2,
        version: {
          author: "Mira Mock",
          createdOn: mockDate,
          title: "Title 2",
          version: 2,
        },
      },
      {
        avatar: { kind: "account", name: "Mira Mock" },
        author: "Mira Mock",
        changes: [],
        labels: [],
        lastEditedOn: mockDate,
        savepointNumber: 1,
        version: {
          author: "Mira Mock",
          createdOn: mockDate,
          title: "Title 1",
          version: 1,
        },
      },
    ];
  });

const mockedVersionsApi: Mocked<ReturnType<typeof useVersionsApi>> = vi.hoisted(
  () => ({
    createVersion: vi.fn(),
    deleteVersion: vi.fn(),
    restoreVersion: vi.fn(),
    fetchItemSavepoints: vi.fn((_) =>
      Promise.resolve({
        totalCount: mockSavepoints.length,
        savepoints: mockSavepoints,
      }),
    ),
    fetchResourceLabels: vi.fn(),
    fetchVersions: vi.fn(),
    getAvatar: vi.fn(),
    loadSavepointMetadata: vi.fn(),
    fetchPermissions: vi.fn(),
    discardUnversionedChanges: vi.fn(),
    fetchVersionLimit: vi.fn(),
  }),
);

vi.mock(
  "@knime/hub-features/versions",
  async (
    importOriginal,
  ): Promise<typeof import("@knime/hub-features/versions")> => {
    const actual = await importOriginal<
      typeof import("@knime/hub-features/versions")
    >();
    return {
      ...actual,
      useVersionsApi: () => mockedVersionsApi,
    };
  },
);

vi.mock("@knime/kds-components", () => ({
  useKdsDynamicModal: () => ({
    askConfirmation: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
}));

let useUnsavedChangesDialogMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ action: UnsavedChangesAction.CANCEL })),
);
vi.mock(
  import("@/composables/confirmDialogs/useUnsavedChangesDialog"),
  async (importOriginal) => {
    const mod = await importOriginal();
    return { ...mod, useUnsavedChangesDialog: useUnsavedChangesDialogMock };
  },
);

const routerPush = vi.hoisted(() => vi.fn());
const routerCurrentRoute = vi.hoisted(() => ({
  value: { params: { workflowId: "root:0:1" } },
}));
vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRouter: vi.fn(() => ({
    push: routerPush,
    currentRoute: routerCurrentRoute,
  })),
  useRoute: vi.fn(() => ({})),
}));

const mockedAPI = deepMocked(API);

const version = 1;
const projectId = "someMockProjectId";

describe("workflow store: versions", () => {
  const initialOpenProjects = [
    {
      name: "Mock Project",
      projectId,
      origin: {
        providerId: "mockProviderId",
        itemId: "mockItemId",
        spaceId: "mockSpaceId",
      },
    },
    {
      name: "Mock Project 2",
      projectId: "otherMockProjectId",
      origin: {
        providerId: "mockProviderId",
        itemId: "mockItemId2",
        spaceId: "mockSpaceId",
      },
    },
  ];
  const loadedVersion = {
    author: "Max Mustermock",
    avatar: { kind: "account" as const, name: "Max Mustermock" },
    createdOn: "2025-01-01T00:00:00.000Z",
    labels: [],
    title: "V1",
    version: 1,
  };

  afterEach(vi.resetAllMocks);

  const setupStore = async () => {
    const stores = mockStores();
    const { workflowVersionsStore, applicationStore, spaceProvidersStore } =
      stores;

    const providerId = "mockProviderId";

    spaceProvidersStore.setSpaceProviders({
      [providerId]: createSpaceProvider({
        hostname: "mockProviderHostname",
        id: providerId,
        type: SpaceProviderNS.TypeEnum.HUB,
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ id: "mockSpaceId" })] }),
        ],
      }),
    });
    applicationStore.setOpenProjects(initialOpenProjects);

    applicationStore.setActiveProjectId(projectId);
    // Start tests with versionsmode active
    await workflowVersionsStore.activateVersionsMode();
    // Omit any mock calls caused by this initial "activation"
    vi.clearAllMocks();

    return { ...stores, projectId };
  };

  describe("getters", () => {
    describe("activeProjectVersionsModeStatus", () => {
      it("status changes", async () => {
        const { workflowVersionsStore, projectId: activeProjectId } =
          await setupStore();

        expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
          "active",
        );

        const newStatuses: Array<VersionsModeStatus> = [
          "inactive",
          "promoteHub",
          "active",
        ];
        newStatuses.forEach((status) => {
          workflowVersionsStore.setVersionsModeStatus(activeProjectId, status);
          expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
            status,
          );
        });
      });

      it("active project changes", async () => {
        const { applicationStore, workflowVersionsStore, projectId } =
          await setupStore();

        expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
          "active",
        );

        applicationStore.setActiveProjectId("otherMockProjectId");
        expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
          "inactive",
        );

        applicationStore.setActiveProjectId(projectId);
        expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
          "active",
        );
      });
    });

    describe("activeProjectVersionsModeInfo", () => {
      it("info changes", async () => {
        const { workflowVersionsStore, projectId } = await setupStore();
        const info: ReturnType<
          typeof workflowVersionsStore.versionsModeInfo.get
        > = {
          hasLoadedAll: false,
          loadedVersions: [],
          unversionedSavepoint: null,
          permissions: [],
        };

        workflowVersionsStore.versionsModeInfo.set(projectId, info);
        expect(workflowVersionsStore.activeProjectVersionsModeInfo).toEqual(
          info,
        );

        workflowVersionsStore.versionsModeInfo.set(projectId, {
          ...info,
          hasLoadedAll: true,
        });
        expect(workflowVersionsStore.activeProjectVersionsModeInfo).toEqual({
          ...info,
          hasLoadedAll: true,
        });
      });

      it("active project changes", async () => {
        const { applicationStore, workflowVersionsStore, projectId } =
          await setupStore();
        const info1: ReturnType<
          typeof workflowVersionsStore.versionsModeInfo.get
        > = {
          hasLoadedAll: false,
          loadedVersions: [],
          unversionedSavepoint: null,
          permissions: [],
        };

        const info2: typeof info1 = {
          hasLoadedAll: true,
          loadedVersions: [loadedVersion],
          unversionedSavepoint: null,
          permissions: [],
        };
        workflowVersionsStore.versionsModeInfo.set(projectId, info1);

        applicationStore.setActiveProjectId("otherMockProjectId");
        expect(
          workflowVersionsStore.activeProjectVersionsModeInfo,
        ).toBeUndefined();

        workflowVersionsStore.versionsModeInfo.set("otherMockProjectId", info2);
        expect(workflowVersionsStore.activeProjectVersionsModeInfo).toEqual(
          info2,
        );

        applicationStore.setActiveProjectId(projectId);
        expect(workflowVersionsStore.activeProjectVersionsModeInfo).toEqual(
          info1,
        );
      });
    });

    it("activeProjectHasUnversionedChanges", async () => {
      const { applicationStore, workflowVersionsStore, projectId } =
        await setupStore();

      workflowVersionsStore.versionsModeInfo.set(projectId, {
        hasLoadedAll: false,
        loadedVersions: [],
        unversionedSavepoint: null,
        permissions: [],
      });

      workflowVersionsStore.versionsModeInfo.set("otherMockProjectId", {
        hasLoadedAll: false,
        loadedVersions: [],
        unversionedSavepoint: {
          author: "Mock Name",
          avatar: {
            kind: "account",
            name: "Mock Name",
          },
          changes: [],
          labels: [],
          lastEditedOn: "2025-01-01T00:00:00.000Z",
          savepointNumber: 1,
        },
        permissions: [],
      });
      expect(workflowVersionsStore.activeProjectHasUnversionedChanges).toBe(
        false,
      );

      applicationStore.setActiveProjectId("otherMockProjectId");
      expect(workflowVersionsStore.activeProjectHasUnversionedChanges).toBe(
        true,
      );

      applicationStore.setActiveProjectId("projIdWithNoInfoYet");
      expect(workflowVersionsStore.activeProjectHasUnversionedChanges).toBe(
        false,
      );
    });

    it("isSidepanelOpen", async () => {
      const { workflowVersionsStore } = await setupStore();

      expect(workflowVersionsStore.isSidepanelOpen).toBe(true);
      await workflowVersionsStore.deactivateVersionsMode();

      expect(workflowVersionsStore.isSidepanelOpen).toBe(false);
    });

    it("activeProjectCurrentVersion", async () => {
      const { workflowVersionsStore, workflowStore } = await setupStore();

      workflowStore.activeWorkflow = createWorkflow({
        info: {
          version: version.toString(),
        },
      });
      expect(workflowVersionsStore.activeProjectCurrentVersion).toBe(version);

      workflowStore.activeWorkflow.info.version = undefined;
      expect(workflowVersionsStore.activeProjectCurrentVersion).toBe(
        CURRENT_STATE_VERSION,
      );
    });
  });

  describe("actions", () => {
    it("setVersionsModeStatus", async () => {
      const { workflowVersionsStore, projectId } = await setupStore();

      const newStatuses: Array<VersionsModeStatus> = [
        "inactive",
        "promoteHub",
        "active",
      ];
      newStatuses.forEach((status) => {
        workflowVersionsStore.setVersionsModeStatus(projectId, status);
        expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
          status,
        );
      });
    });

    describe("createVersion", () => {
      const name = "mockName";
      const description = "Some mock description.";
      const params = { itemId: "mockItemId", title: name, description };
      const response = { version, author: "", createdOn: "", title: "" };

      it("in clean state, creates a new version", async () => {
        const { workflowVersionsStore } = await setupStore();

        mockedVersionsApi.createVersion.mockResolvedValueOnce(response);
        const toast = mockedObject(getToastsProvider());
        await workflowVersionsStore.createVersion({ name, description });

        expect(mockedVersionsApi.createVersion).toHaveBeenCalledWith(params);
        expect(
          workflowVersionsStore.activeProjectVersionsModeInfo?.loadedVersions,
        ).toContainEqual(expect.objectContaining({ version }));
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("in dirty state, does nothing on cancel", async () => {
        const { workflowVersionsStore, projectId, workflowStore } =
          await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });
        const toast = mockedObject(getToastsProvider());

        await workflowVersionsStore.createVersion({ name, description });

        expect(mockedVersionsApi.createVersion).not.toHaveBeenCalled();
        expect(mockedAPI.workflow.disposeVersion).not.toHaveBeenCalled();
        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();
        expect(useRouter().push).not.toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("in dirty state, discards unsaved changes, creates new version and redirects to it on discard", async () => {
        const {
          workflowVersionsStore,
          projectId,
          workflowStore,
          dirtyProjectsTrackingStore,
        } = await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });

        mockedAPI.workflow.disposeVersion.mockResolvedValueOnce(true);
        mockedVersionsApi.createVersion.mockResolvedValueOnce(response);
        const toast = mockedObject(getToastsProvider());
        useUnsavedChangesDialogMock.mockResolvedValue({
          action: UnsavedChangesAction.DISCARD,
        });
        await workflowVersionsStore.createVersion({ name, description });

        expect(mockedVersionsApi.createVersion).toHaveBeenCalledWith(params);
        expect(mockedAPI.workflow.disposeVersion).toHaveBeenCalledWith({
          projectId,
          version: CURRENT_STATE_VERSION,
        });
        expect(
          dirtyProjectsTrackingStore.updateDirtyProjectsMap,
        ).toHaveBeenCalledWith({
          [projectId]: false,
        });
        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();
        expect(useRouter().push).toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("in dirty state with successful saveProject, saves changes and creates new version on save", async () => {
        const { workflowVersionsStore, projectId, workflowStore } =
          await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });

        mockedAPI.workflow.disposeVersion.mockResolvedValueOnce(true);
        mockedAPI.desktop.saveProject.mockResolvedValueOnce(true);
        mockedVersionsApi.createVersion.mockResolvedValueOnce(response);
        const toast = mockedObject(getToastsProvider());
        useUnsavedChangesDialogMock.mockResolvedValue({
          action: UnsavedChangesAction.SAVE,
        });
        await workflowVersionsStore.createVersion({ name, description });

        expect(mockedVersionsApi.createVersion).toHaveBeenCalledWith(params);
        expect(mockedAPI.workflow.disposeVersion).not.toHaveBeenCalled();
        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
          allowOverwritePrompt: false,
          projectId,
        });
        expect(useRouter().push).not.toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it.each([["some error"], [{}]])(
        "in dirty state with unsuccessful saveProject, shows error toast on save",
        async (rejectedValue) => {
          const { toastPresets } = getToastPresets();
          const saveProjectFailed = vi.spyOn(
            toastPresets.app,
            "saveProjectFailed",
          );

          const { workflowVersionsStore, projectId, workflowStore } =
            await setupStore();

          useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
          workflowStore.activeWorkflow = createWorkflow({ projectId });

          mockedAPI.workflow.disposeVersion.mockResolvedValueOnce(true);
          mockedAPI.desktop.saveProject.mockRejectedValueOnce(rejectedValue);
          mockedVersionsApi.createVersion.mockResolvedValueOnce(response);
          useUnsavedChangesDialogMock.mockResolvedValue({
            action: UnsavedChangesAction.SAVE,
          });
          await workflowVersionsStore.createVersion({ name, description });

          expect(mockedVersionsApi.createVersion).not.toHaveBeenCalled();
          expect(mockedAPI.workflow.disposeVersion).not.toHaveBeenCalled();
          expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
            allowOverwritePrompt: false,
            projectId,
          });
          expect(useRouter().push).not.toHaveBeenCalled();
          expect(saveProjectFailed).toHaveBeenCalledWith({
            error: rejectedValue,
          });
        },
      );

      it("creating two versions in a row also increases the version limit", async () => {
        let currentUsage = 0;
        mockedVersionsApi.fetchVersionLimit.mockImplementation((_) => {
          const versionLimit = {
            currentUsage,
            limit: 2,
          };
          currentUsage += 1;
          return Promise.resolve(versionLimit);
        });
        mockedVersionsApi.createVersion.mockResolvedValue(response);
        const { workflowVersionsStore } = await setupStore();

        await workflowVersionsStore.createVersion({
          name: "v1",
          description: "...",
        });
        expect(
          workflowVersionsStore.activeProjectVersionsModeInfo?.versionLimit,
        ).toEqual({
          currentUsage: 1,
          limit: 2,
        });

        await workflowVersionsStore.createVersion({
          name: "v1",
          description: "...",
        });
        expect(
          workflowVersionsStore.activeProjectVersionsModeInfo?.versionLimit,
        ).toEqual({
          currentUsage: 2,
          limit: 2,
        });
      });
    });

    it("deleteVersion", async () => {
      const { workflowVersionsStore } = await setupStore();

      await workflowVersionsStore.deleteVersion(1);

      expect(mockedVersionsApi.deleteVersion).toHaveBeenCalledWith({
        itemId: "mockItemId",
        version: 1,
      });
    });

    it("delete selected version", async () => {
      const { workflowVersionsStore, projectId } = await setupStore();
      // @ts-expect-error
      workflowVersionsStore.activeProjectCurrentVersion = version;

      await workflowVersionsStore.deleteVersion(version);

      expect(useRouter().push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId },
        query: {
          version: null,
        },
      });
    });

    it("restoreVersion restores version to a clean and unversioned current-state project", async () => {
      const {
        workflowVersionsStore,
        dirtyProjectsTrackingStore,
        applicationStore,
      } = await setupStore();
      dirtyProjectsTrackingStore.dirtyProjectsMap = { [projectId]: true };

      await workflowVersionsStore.restoreVersion(1);

      expect(mockedAPI.workflow.restoreVersion).toHaveBeenCalledWith({
        projectId,
        version: "1",
      });
      expect(mockedVersionsApi.fetchItemSavepoints).toHaveBeenLastCalledWith(
        expect.objectContaining({
          itemId: "mockItemId",
        }),
      );
      expect(mockedVersionsApi.loadSavepointMetadata).toHaveBeenCalledTimes(
        mockSavepoints.length,
      );
      expect(useRouter().push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId },
        query: {
          version: null,
        },
        force: true,
      });
      expect(dirtyProjectsTrackingStore.isDirtyActiveProject).toBeFalsy();
      expect(applicationStore.activeProjectOrigin?.version).toBeUndefined();
    });

    describe("switchVersion", () => {
      afterEach(vi.resetAllMocks);

      it("in clean state sets new route, sets version on openProject.origin, and does not try to save project", async () => {
        const { workflowVersionsStore, applicationStore, projectId } =
          await setupStore();

        const info: ReturnType<
          typeof workflowVersionsStore.versionsModeInfo.get
        > = {
          hasLoadedAll: false,
          loadedVersions: [loadedVersion],
          unversionedSavepoint: null,
          permissions: [],
        };
        workflowVersionsStore.versionsModeInfo.set(projectId, info);

        const openProjectBefore = applicationStore.openProjects.find(
          (openProject) => openProject.projectId === projectId,
        );
        expect(openProjectBefore!.origin!.version).toBeUndefined();

        await workflowVersionsStore.switchVersion(version);
        expect(useRouter().push).toHaveBeenLastCalledWith({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId },
          query: { version: version.toString() },
        });

        // Simulate setting openProjects in the backend
        applicationStore.setOpenProjects([
          {
            ...initialOpenProjects[0],
            origin: { ...initialOpenProjects[0].origin, versionId: "1" },
          },
          initialOpenProjects[1],
        ]);
        const openProjectAfter = applicationStore.openProjects.find(
          (openProject) => openProject.projectId === projectId,
        );

        expect(openProjectAfter!.origin!.version).toStrictEqual(
          info.loadedVersions[0],
        );

        // Switch back to draft
        await workflowVersionsStore.switchVersion(CURRENT_STATE_VERSION);
        expect(useRouter().push).toHaveBeenLastCalledWith({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId },
          query: {
            version: null,
          },
        });
        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();

        // Simulate setting openProjects in the backend
        applicationStore.setOpenProjects(initialOpenProjects);
        const openProjectAfterAfter = applicationStore.openProjects.find(
          (openProject) => openProject.projectId === projectId,
        );

        expect(openProjectAfterAfter!.origin!.version).toBeUndefined();
      });

      it("in dirty state, does nothing on cancel", async () => {
        const { workflowVersionsStore, projectId, workflowStore } =
          await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });
        const toast = mockedObject(getToastsProvider());

        await workflowVersionsStore.switchVersion(version);

        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();
        expect(useRouter().push).not.toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("in dirty state, discards unsaved changes, sets new route, and does not try to save project on discard", async () => {
        const {
          workflowVersionsStore,
          projectId,
          workflowStore,
          dirtyProjectsTrackingStore,
        } = await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });
        const toast = mockedObject(getToastsProvider());
        useUnsavedChangesDialogMock.mockResolvedValue({
          action: UnsavedChangesAction.DISCARD,
        });
        mockedAPI.workflow.disposeVersion.mockResolvedValueOnce(true);

        await workflowVersionsStore.switchVersion(version);

        expect(mockedAPI.workflow.disposeVersion).toHaveBeenCalledWith({
          projectId,
          version: CURRENT_STATE_VERSION,
        });
        expect(
          dirtyProjectsTrackingStore.updateDirtyProjectsMap,
        ).toHaveBeenCalledWith({
          [projectId]: false,
        });
        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();
        expect(useRouter().push).toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("in dirty state with successful saveProject sets new route but does not show error toast on save", async () => {
        const { workflowVersionsStore, projectId, workflowStore } =
          await setupStore();

        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        workflowStore.activeWorkflow = createWorkflow({ projectId });
        mockedAPI.desktop.saveProject.mockResolvedValueOnce(true);
        const toast = mockedObject(getToastsProvider());
        useUnsavedChangesDialogMock.mockResolvedValue({
          action: UnsavedChangesAction.SAVE,
        });

        await workflowVersionsStore.switchVersion(version);

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
          allowOverwritePrompt: false,
          projectId,
        });
        expect(useRouter().push).toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it.each([["some error"], [{}]])(
        "in dirty state with unsuccessful saveProject does not set new route but shows error toast on save",
        async (rejectedValue) => {
          const { toastPresets } = getToastPresets();
          const saveProjectFailed = vi.spyOn(
            toastPresets.app,
            "saveProjectFailed",
          );

          const { workflowVersionsStore, projectId, workflowStore } =
            await setupStore();
          useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
          workflowStore.activeWorkflow = createWorkflow({ projectId });
          mockedAPI.desktop.saveProject.mockRejectedValueOnce(rejectedValue);
          useUnsavedChangesDialogMock.mockResolvedValue({
            action: UnsavedChangesAction.SAVE,
          });

          await workflowVersionsStore.switchVersion(version);

          expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
            allowOverwritePrompt: false,
            projectId,
          });
          expect(useRouter().push).not.toHaveBeenCalled();
          expect(saveProjectFailed).toHaveBeenCalledWith({
            error: rejectedValue,
          });
        },
      );
    });

    describe("refreshData", () => {
      it("load", async () => {
        const { workflowVersionsStore } = await setupStore();
        expect(workflowVersionsStore.loading).toBe(false);

        const { promise, resolve } =
          promiseUtils.createUnwrappedPromise<
            Awaited<ReturnType<typeof mockedVersionsApi.fetchItemSavepoints>>
          >();
        mockedVersionsApi.fetchItemSavepoints.mockReturnValue(promise);

        workflowVersionsStore.refreshData();
        expect(workflowVersionsStore.loading).toBe(true);

        resolve({
          totalCount: mockSavepoints.length,
          savepoints: mockSavepoints,
        });
        await flushPromises();

        expect(workflowVersionsStore.loading).toBe(false);
        expect(mockedVersionsApi.fetchItemSavepoints).toHaveBeenLastCalledWith(
          expect.objectContaining({
            itemId: "mockItemId",
          }),
        );
        // expect no explicit limit to be defined
        expect(mockedVersionsApi.fetchItemSavepoints).toHaveBeenLastCalledWith(
          expect.not.objectContaining({
            limit: expect.anything(),
          }),
        );
        expect(mockedVersionsApi.loadSavepointMetadata).toHaveBeenCalledTimes(
          mockSavepoints.length,
        );

        // expect version limit to be fetched
        expect(mockedVersionsApi.fetchVersionLimit).toHaveBeenCalledWith({
          itemId: "mockItemId",
        });
      });

      it("loadAll", async () => {
        const { workflowVersionsStore } = await setupStore();

        await workflowVersionsStore.refreshData({ loadAll: true });

        expect(mockedVersionsApi.fetchItemSavepoints).toHaveBeenCalledWith(
          expect.objectContaining({ limit: -1 }),
        );
      });

      it("load permissions", async () => {
        const { workflowVersionsStore } = await setupStore();
        mockedVersionsApi.fetchPermissions.mockResolvedValueOnce(["COPY"]);

        await workflowVersionsStore.refreshData({ loadAll: true });

        expect(mockedVersionsApi.fetchPermissions).toHaveBeenCalledWith({
          itemId: "mockItemId",
        });
        expect(
          workflowVersionsStore.activeProjectVersionsModeInfo?.permissions,
        ).toEqual(["COPY"]);
      });
    });

    it("activateVersionsMode", async () => {
      const { workflowVersionsStore, applicationStore, spaceProvidersStore } =
        await setupStore();
      applicationStore.setActiveProjectId("otherMockProjectId");
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "inactive",
      );

      await workflowVersionsStore.activateVersionsMode();
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "active",
      );

      spaceProvidersStore.activeProjectProvider!.type =
        SpaceProviderNS.TypeEnum.LOCAL;
      await workflowVersionsStore.activateVersionsMode();
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "promoteHub",
      );
    });

    it("deactivateVersionsMode", async () => {
      const { workflowVersionsStore } = await setupStore();
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "active",
      );

      await workflowVersionsStore.deactivateVersionsMode();
      expect(useRouter().push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: "root:0:1" },
        query: { version: null },
      });
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "inactive",
      );
    });

    it("ignores 404 when fetching version limits, no errors are thrown", async () => {
      mockedVersionsApi.fetchVersionLimit.mockRejectedValue(
        new rfcErrors.RFCError({ title: "resource not found", status: 404 }),
      );
      const { workflowVersionsStore } = await setupStore();

      await workflowVersionsStore.refreshData();

      expect(
        workflowVersionsStore.activeProjectVersionsModeInfo?.versionLimit,
      ).toBeUndefined();
    });
  });
});
