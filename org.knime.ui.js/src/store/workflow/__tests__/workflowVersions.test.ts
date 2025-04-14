/* eslint-disable max-lines */
import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";
import { useRouter } from "vue-router";

import {
  CURRENT_STATE_VERSION,
  type ItemSavepoint,
  type WithAvatar,
  type WithLabels,
  useVersionsApi,
} from "@knime/hub-features/versions";

import { SpaceProviderNS } from "@/api/custom-types";
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
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
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

vi.mock("@/composables/useConfirmDialog", () => ({
  useConfirmDialog: () => ({
    show: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
}));

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(() => ({})),
}));

const mockedAPI = deepMocked(API);

const version = 1;

describe("workflow store: versions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const setupStore = async () => {
    const stores = mockStores();
    const { workflowVersionsStore, applicationStore, spaceProvidersStore } =
      stores;

    const projectId = "someMockProjectId";
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
    applicationStore.setOpenProjects([
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
    ]);

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
          loadedVersions: [
            {
              author: "Max Mustermock",
              avatar: {
                kind: "account",
                name: "Max Mustermock",
              },
              createdOn: "2025-01-01T00:00:00.000Z",
              labels: [],
              title: "V1",
              version: 1,
            },
          ],
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

    it("createVersion", async () => {
      const { workflowVersionsStore } = await setupStore();
      const name = "mockName";
      const description = "Some mock description.";

      mockedVersionsApi.createVersion.mockResolvedValueOnce({
        version,
        author: "",
        createdOn: "",
        title: "",
      });
      await workflowVersionsStore.createVersion({
        name,
        description,
      });

      expect(mockedVersionsApi.createVersion).toHaveBeenCalledWith({
        projectItemId: "mockItemId",
        title: name,
        description,
      });
      expect(
        workflowVersionsStore.activeProjectVersionsModeInfo?.loadedVersions,
      ).toContainEqual(expect.objectContaining({ version }));
    });

    it("deleteVersion", async () => {
      const { workflowVersionsStore } = await setupStore();

      await workflowVersionsStore.deleteVersion(1);

      expect(mockedVersionsApi.deleteVersion).toHaveBeenCalledWith({
        projectItemId: "mockItemId",
        version: 1,
      });
    });

    it("delete selected version", async () => {
      const { workflowVersionsStore, projectId } = await setupStore();
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

    describe("switchVersion", () => {
      it("in clean state sets new route, sets version on openProject.origin, and does not try to save project", async () => {
        const { workflowVersionsStore, applicationStore, projectId } =
          await setupStore();

        const info: ReturnType<
          typeof workflowVersionsStore.versionsModeInfo.get
        > = {
          hasLoadedAll: false,
          loadedVersions: [
            {
              author: "Max Mustermock",
              avatar: {
                kind: "account",
                name: "Max Mustermock",
              },
              createdOn: "2025-01-01T00:00:00.000Z",
              labels: [],
              title: "V1",
              version: 1,
            },
          ],
          unversionedSavepoint: null,
          permissions: [],
        };
        workflowVersionsStore.versionsModeInfo.set(projectId, info);

        const openProject = applicationStore.openProjects.find(
          (openProject) => openProject.projectId === projectId,
        );
        expect(openProject!.origin!.version).toBeUndefined();

        await workflowVersionsStore.switchVersion(version);
        expect(useRouter().push).toHaveBeenLastCalledWith({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId },
          query: {
            version: version.toString(),
          },
        });
        expect(openProject!.origin!.version).toStrictEqual(
          info.loadedVersions[0],
        );

        await workflowVersionsStore.switchVersion(CURRENT_STATE_VERSION);
        expect(useRouter().push).toHaveBeenLastCalledWith({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId },
          query: {
            version: null,
          },
        });
        expect(mockedAPI.desktop.saveProject).not.toHaveBeenCalled();
        expect(openProject!.origin!.version).toBeUndefined();
      });

      it("in dirty state with successful saveProject sets new route but does not show error toast", async () => {
        const {
          workflowVersionsStore,
          projectId,
          workflowStore,
          workflowPreviewSnapshotsStore,
        } = await setupStore();
        useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
        vi.mocked(
          workflowPreviewSnapshotsStore.getActiveWorkflowSnapshot,
        ).mockResolvedValueOnce("svg img data");
        workflowStore.activeWorkflow = createWorkflow({ projectId });
        mockedAPI.desktop.saveProject.mockResolvedValueOnce(true);
        const toast = mockedObject(getToastsProvider());

        await workflowVersionsStore.switchVersion(version);

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
          projectId,
          workflowPreviewSvg: "svg img data",
        });
        expect(useRouter().push).toHaveBeenCalled();
        expect(toast.show).not.toHaveBeenCalled();
      });

      it.each([
        ["some error", "some error"],
        [{}, "unknown"],
      ])(
        "in dirty state with unsuccessful saveProject does not set new route but shows error toast",
        async (rejectedValue, expectedErrorCause) => {
          const {
            workflowVersionsStore,
            projectId,
            workflowStore,
            workflowPreviewSnapshotsStore,
          } = await setupStore();
          useDirtyProjectsTrackingStore().dirtyProjectsMap[projectId] = true;
          vi.mocked(
            workflowPreviewSnapshotsStore.getActiveWorkflowSnapshot,
          ).mockResolvedValueOnce("svg img data");
          workflowStore.activeWorkflow = createWorkflow({ projectId });
          mockedAPI.desktop.saveProject.mockRejectedValueOnce(rejectedValue);
          const toast = mockedObject(getToastsProvider());

          await workflowVersionsStore.switchVersion(version);

          expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith({
            projectId,
            workflowPreviewSvg: "svg img data",
          });
          expect(useRouter().push).not.toHaveBeenCalled();
          expect(toast.show).toHaveBeenCalledWith({
            type: "warning",
            deduplicationKey:
              "workflowVersion.ts::saveVersion::ProjectWasNotSaved",
            headline: "Could not save workflow",
            message: `Saving project failed. Cause: ${expectedErrorCause}`,
            autoRemove: true,
          });
        },
      );
    });

    describe("refreshData", () => {
      it("load", async () => {
        const { workflowVersionsStore } = await setupStore();
        expect(workflowVersionsStore.loading).toBe(false);

        const { promise, resolve } =
          createUnwrappedPromise<
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
      expect(workflowVersionsStore.activeProjectVersionsModeStatus).toBe(
        "inactive",
      );
    });
  });
});
