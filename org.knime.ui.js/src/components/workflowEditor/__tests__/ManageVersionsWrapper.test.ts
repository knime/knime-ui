import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { useEventBus } from "@vueuse/core";

import {
  CreateVersionForm,
  ManageVersions,
} from "@knime/hub-features/versions";

import { getToastsProvider } from "@/plugins/toasts";
import {
  type VersionsModeStatus,
  useWorkflowVersionsStore,
} from "@/store/workflow/workflowVersions";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import ManageVersionsWrapper from "../ManageVersionsWrapper.vue";
import VersionPanelPromoteHub from "../VersionPanelPromoteHub.vue";

const mockDate = "2024-11-11T11:11:00.000Z";
const mockVersionsModeInfo: ReturnType<
  typeof useWorkflowVersionsStore
>["activeProjectVersionsModeInfo"] = {
  hasLoadedAll: false,
  loadedVersions: [
    {
      author: "Mock Author",
      avatar: {
        kind: "account",
        name: "Mock  Author",
      },
      createdOn: mockDate,
      labels: [{ label: { name: "mockLabel" }, labelId: "mockLabelId" }],
      title: "Version Mock 2",
      version: 2,
    },
    {
      author: "Mock Author",
      avatar: {
        kind: "account",
        name: "Mock  Author",
      },
      createdOn: mockDate,
      labels: [{ label: { name: "mockLabel" }, labelId: "mockLabelId" }],
      title: "Version Mock 1",
      version: 1,
    },
  ],
  unversionedSavepoint: {
    author: "Mock Author",
    avatar: {
      kind: "account",
      name: "Mock  Author",
    },
    changes: [
      {
        author: "Mock Author",
        createdOn: mockDate,
        eventActionType: "UPDATED",
        message: "Mock UPDATE",
      },
    ],
    labels: [{ label: { name: "mockLabel" }, labelId: "mockLabelId" }],
    lastEditedOn: mockDate,
    savepointNumber: 42,
  },
  permissions: ["EDIT", "DELETE"],
};

class BackendError extends Error {
  code: number;
  data: any;

  constructor(code, data) {
    super();
    this.code = code;
    this.data = data;
  }
}
const someError = new BackendError(-32600, {
  code: "ServiceCallException",
  title: "error message",
  canCopy: false,
  message: "error message",
});
const toast = getToastsProvider();

const eventHandlers: Set<Function> = new Set();

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...(actual as object),
    useEventBus: vi.fn(() => ({
      on: (handler: Function) => eventHandlers.add(handler),
      off: (handler: Function) => eventHandlers.delete(handler),
      emit: (...args: any[]) => {
        for (const handler of eventHandlers) {
          handler(...args);
        }
      },
    })),
  };
});

describe("ManageVersionsWrapper.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    props,
    versionsModeStatus = "active",
  }: {
    props?: Partial<InstanceType<typeof ManageVersionsWrapper>["$props"]>;
    versionsModeStatus?: VersionsModeStatus;
  } = {}) => {
    const mockedStores = mockStores();
    const { workflowVersionsStore } = mockedStores;

    const mockedVersionsStore = vi.mocked(workflowVersionsStore);

    mockedVersionsStore.activeProjectVersionsModeInfo = mockVersionsModeInfo;
    mockedVersionsStore.activeProjectVersionsModeStatus = versionsModeStatus;
    mockedVersionsStore.activeProjectCurrentVersion = 2;
    mockedVersionsStore.activeProjectHasUnversionedChanges = true;

    const wrapper = mount(ManageVersionsWrapper, {
      props: { ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores, mockedVersionsStore };
  };

  describe("component rendering", () => {
    it("renders ManageVersions", () => {
      const { wrapper } = doMount();

      const manageVersions = wrapper.findComponent(ManageVersions);
      expect(manageVersions.exists()).toBe(true);
    });

    it("renders info panel for local workflows", () => {
      const { wrapper } = doMount({
        versionsModeStatus: "promoteHub",
      });

      expect(wrapper.findComponent(ManageVersions).exists()).toBe(false);
      expect(wrapper.findComponent(VersionPanelPromoteHub).exists()).toBe(true);
    });
  });

  describe("events", () => {
    describe("source: ManageVersions", () => {
      const version = 42;

      it("close", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deactivateVersionsMode.mockResolvedValue();

        wrapper.findComponent(ManageVersions).vm.$emit("close");
        expect(
          mockedVersionsStore.deactivateVersionsMode,
        ).toHaveBeenCalledWith();
      });

      it("select", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.switchVersion.mockResolvedValue();

        wrapper.findComponent(ManageVersions).vm.$emit("select", version);
        expect(mockedVersionsStore.switchVersion).toHaveBeenCalledWith(version);
      });

      it("delete", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deleteVersion.mockResolvedValue();

        wrapper.findComponent(ManageVersions).vm.$emit("delete", version);
        expect(mockedVersionsStore.deleteVersion).toHaveBeenCalledWith(version);
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("delete shows error toast on failure", async () => {
        const { toastPresets } = getToastPresets();
        const preset = vi.spyOn(toastPresets.versions, "deleteFailed");
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deleteVersion.mockRejectedValue(someError);

        wrapper.findComponent(ManageVersions).vm.$emit("delete", version);
        await flushPromises();

        expect(mockedVersionsStore.deleteVersion).toHaveBeenCalledWith(version);
        expect(preset).toHaveBeenCalledWith({ error: someError });
      });

      it("restore", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.restoreVersion.mockResolvedValue();

        wrapper.findComponent(ManageVersions).vm.$emit("restore", version);
        expect(mockedVersionsStore.restoreVersion).toHaveBeenCalledWith(
          version,
        );
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("restore shows error toast on failure", async () => {
        const { toastPresets } = getToastPresets();
        const preset = vi.spyOn(toastPresets.versions, "restoreFailed");
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.restoreVersion.mockRejectedValue(someError);

        wrapper.findComponent(ManageVersions).vm.$emit("restore", version);
        await flushPromises();

        expect(mockedVersionsStore.restoreVersion).toHaveBeenCalledWith(
          version,
        );
        expect(preset).toHaveBeenCalledWith({ error: someError });
      });

      it("loadAll", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.refreshData.mockResolvedValue();

        wrapper.findComponent(ManageVersions).vm.$emit("loadAll");
        expect(mockedVersionsStore.refreshData).toHaveBeenCalledWith({
          loadAll: true,
        });
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("loadAll shows error toast on failure", async () => {
        const { toastPresets } = getToastPresets();
        const preset = vi.spyOn(toastPresets.versions, "fetchAllFailed");
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.refreshData.mockRejectedValue(someError);

        wrapper.findComponent(ManageVersions).vm.$emit("loadAll");
        await flushPromises();

        expect(mockedVersionsStore.refreshData).toHaveBeenCalledWith({
          loadAll: true,
        });
        expect(preset).toHaveBeenCalledWith({ error: someError });
      });
    });

    describe("source: VersionPanelPromoteHub", () => {
      it("close", () => {
        const { wrapper, mockedVersionsStore } = doMount({
          versionsModeStatus: "promoteHub",
        });
        mockedVersionsStore.deactivateVersionsMode.mockResolvedValue();

        wrapper.findComponent(VersionPanelPromoteHub).vm.$emit("close");
        expect(
          mockedVersionsStore.deactivateVersionsMode,
        ).toHaveBeenCalledWith();
      });

      it("uploads the opened workflow", () => {
        const { wrapper, mockedStores } = doMount({
          versionsModeStatus: "promoteHub",
        });
        const { applicationStore, spaceUploadsStore } = mockedStores;

        applicationStore.setOpenProjects([
          {
            name: "mockProject",
            projectId: "mockProjectId",
            origin: {
              itemId: "mockItemId",
              providerId: "mockProviderId",
              spaceId: "mockSpaceId",
            },
          },
        ]);
        applicationStore.setActiveProjectId("mockProjectId");
        vi.mocked(
          spaceUploadsStore,
        ).moveToHubFromLocalProvider.mockImplementation(vi.fn());

        wrapper.findComponent(VersionPanelPromoteHub).vm.$emit("upload");

        expect(
          spaceUploadsStore.moveToHubFromLocalProvider,
        ).toHaveBeenCalledWith({
          itemIds: ["mockItemId"],
        });
      });
    });
  });

  describe("version creation flow", () => {
    const openCreateVersionsForm = async (wrapper: VueWrapper) => {
      wrapper.findComponent(ManageVersions).vm.$emit("create");
      await nextTick();
    };

    it("renders creation form", async () => {
      const { wrapper } = doMount();
      expect(wrapper.findComponent(CreateVersionForm).exists()).toBe(false);

      await openCreateVersionsForm(wrapper);
      expect(wrapper.findComponent(CreateVersionForm).exists()).toBe(true);
    });

    it("handles create event", async () => {
      const { wrapper, mockedVersionsStore } = doMount();
      await openCreateVersionsForm(wrapper);

      mockedVersionsStore.createVersion.mockResolvedValue();
      const versionData = {
        name: "mockName",
        description: "someMockDescription",
      };
      wrapper.findComponent(CreateVersionForm).vm.$emit("create", versionData);
      expect(mockedVersionsStore.createVersion).toHaveBeenCalledWith(
        versionData,
      );
      expect(toast.show).not.toHaveBeenCalled();
    });

    it("handles cancel event", async () => {
      const { wrapper } = doMount();
      await openCreateVersionsForm(wrapper);

      wrapper.findComponent(CreateVersionForm).vm.$emit("cancel");
      await nextTick();

      expect(wrapper.findComponent(CreateVersionForm).exists()).toBe(false);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it("shows error toast on failure", async () => {
      const { toastPresets } = getToastPresets();
      const preset = vi.spyOn(toastPresets.versions, "createFailed");

      const { wrapper, mockedVersionsStore } = doMount();
      await openCreateVersionsForm(wrapper);

      mockedVersionsStore.createVersion.mockImplementationOnce(() => {
        throw someError;
      });
      const versionData = {
        name: "mockName",
        description: "someMockDescription",
      };
      wrapper.findComponent(CreateVersionForm).vm.$emit("create", versionData);
      expect(mockedVersionsStore.createVersion).toHaveBeenCalledWith(
        versionData,
      );
      expect(preset).toHaveBeenCalledWith({ error: someError });
    });
  });

  describe("workflow save event listener", () => {
    it("should call refreshData when workflow-saved event is emitted", async () => {
      const store = useWorkflowVersionsStore();
      const refreshDataSpy = vi.spyOn(store, "refreshData").mockResolvedValue();

      const workflowSavedBus = useEventBus("workflow-saved");
      workflowSavedBus.emit();

      await nextTick();

      expect(refreshDataSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple workflow-saved events", async () => {
      const store = useWorkflowVersionsStore();
      const refreshDataSpy = vi.spyOn(store, "refreshData").mockResolvedValue();

      const workflowSavedBus = useEventBus("workflow-saved");
      workflowSavedBus.emit();
      workflowSavedBus.emit();

      await nextTick();

      expect(refreshDataSpy).toHaveBeenCalledTimes(2);
    });
  });
});
