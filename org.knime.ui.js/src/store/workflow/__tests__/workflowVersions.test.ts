import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useRouter } from "vue-router";

import {
  CURRENT_STATE_VERSION,
  type ItemSavepoint,
  type WithAvatar,
  type WithLabels,
  useVersionsApi,
} from "@knime/hub-features/versions";

import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import type { VersionsModeStatus } from "../workflowVersions";

import { loadStore } from "./loadStore";

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

describe("workflow store: versions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const setupStore = async () => {
    const stores = loadStore();
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
    // Omit any mock calls caused by this inital "activation"
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
      workflowVersionsStore.deactivateVersionsMode();
      await nextTick();
      expect(workflowVersionsStore.isSidepanelOpen).toBe(false);
    });

    it("activeProjectCurrentVersion", async () => {
      const { workflowVersionsStore, workflowStore } = await setupStore();

      workflowStore.activeWorkflow = createWorkflow({
        info: {
          version: "42",
        },
      });
      expect(workflowVersionsStore.activeProjectCurrentVersion).toBe(42);

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
        version: 42,
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
      ).toContainEqual(expect.objectContaining({ version: 42 }));
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
      vi.mocked(workflowVersionsStore).activeProjectCurrentVersion = 42;

      await workflowVersionsStore.deleteVersion(42);

      expect(useRouter().push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId },
        query: {
          version: null,
        },
      });
    });

    it("switchVersion", async () => {
      const { workflowVersionsStore, projectId } = await setupStore();

      await workflowVersionsStore.switchVersion(42);
      expect(useRouter().push).toHaveBeenLastCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId },
        query: {
          version: "42",
        },
      });

      await workflowVersionsStore.switchVersion(CURRENT_STATE_VERSION);
      expect(useRouter().push).toHaveBeenLastCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId },
        query: {
          version: null,
        },
      });
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
