import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import type { Toast } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";
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

const getExpectedToastWithHeadline = (headline: string): Toast => {
  return {
    headline,
    autoRemove: false,
    buttons: expect.any(Array),
    message: "An unexpected error occurred.",
    type: "error",
  };
};
const someError = new Error("someError");
const toast = getToastsProvider();

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
        mockedVersionsStore.deactivateVersionsMode = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("close");
        expect(
          mockedVersionsStore.deactivateVersionsMode,
        ).toHaveBeenCalledWith();
      });

      it("select", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.switchVersion = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("select", version);
        expect(mockedVersionsStore.switchVersion).toHaveBeenCalledWith(version);
      });

      it("delete", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deleteVersion = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("delete", version);
        expect(mockedVersionsStore.deleteVersion).toHaveBeenCalledWith(version);
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("delete shows error toast on failure", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deleteVersion.mockImplementationOnce(() => {
          throw someError;
        });

        wrapper.findComponent(ManageVersions).vm.$emit("delete", version);
        expect(mockedVersionsStore.deleteVersion).toHaveBeenCalledWith(version);
        expect(toast.show).toHaveBeenCalledWith(
          getExpectedToastWithHeadline("Deletion of the version failed"),
        );
      });

      it("restore", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.restoreVersion = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("restore", version);
        expect(mockedVersionsStore.restoreVersion).toHaveBeenCalledWith(
          version,
        );
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("restore shows error toast on failure", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.restoreVersion.mockImplementationOnce(() => {
          throw someError;
        });

        wrapper.findComponent(ManageVersions).vm.$emit("restore", version);
        expect(mockedVersionsStore.restoreVersion).toHaveBeenCalledWith(
          version,
        );
        expect(toast.show).toHaveBeenCalledWith(
          getExpectedToastWithHeadline("Restoring of the version failed"),
        );
      });

      it("loadAll", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.refreshData = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("loadAll");
        expect(mockedVersionsStore.refreshData).toHaveBeenCalledWith({
          loadAll: true,
        });
        expect(toast.show).not.toHaveBeenCalled();
      });

      it("loadAll shows error toast on failure", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.refreshData.mockImplementationOnce(() => {
          throw someError;
        });

        wrapper.findComponent(ManageVersions).vm.$emit("loadAll");
        expect(mockedVersionsStore.refreshData).toHaveBeenCalledWith({
          loadAll: true,
        });
        expect(toast.show).toHaveBeenCalledWith(
          getExpectedToastWithHeadline("Loading all versions failed"),
        );
      });
    });

    describe("source: VersionPanelPromoteHub", () => {
      it("close", () => {
        const { wrapper, mockedVersionsStore } = doMount({
          versionsModeStatus: "promoteHub",
        });
        mockedVersionsStore.deactivateVersionsMode = vi.fn();

        wrapper.findComponent(VersionPanelPromoteHub).vm.$emit("close");
        expect(
          mockedVersionsStore.deactivateVersionsMode,
        ).toHaveBeenCalledWith();
      });

      it("uploads the opened workflow", () => {
        const { wrapper, mockedStores } = doMount({
          versionsModeStatus: "promoteHub",
        });
        const { spacesStore, applicationStore } = mockedStores;

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
        vi.mocked(spacesStore).uploadToSpace.mockImplementation(vi.fn());

        wrapper.findComponent(VersionPanelPromoteHub).vm.$emit("upload");

        expect(spacesStore.uploadToSpace).toHaveBeenCalledWith({
          itemIds: ["mockItemId"],
          openAfterUpload: true,
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

      mockedVersionsStore.createVersion = vi.fn();
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
      expect(toast.show).toHaveBeenCalledWith(
        getExpectedToastWithHeadline("Creation of the version failed"),
      );
    });
  });

  describe("showErrorToast", () => {
    it("works for RFCError", () => {
      const { wrapper } = doMount();

      const headline = "some headline";
      (wrapper.vm as any).showErrorToast({
        error: new rfcErrors.RFCError({
          title: "some title",
          status: 0,
          date: new Date(),
          requestId: "requestId",
        }),
        headline,
      });

      expect(toast.show).toHaveBeenCalledWith({
        type: "error",
        headline,
        component: expect.any(Object),
        autoRemove: false,
      });
    });

    it("works for other errors", () => {
      const { wrapper } = doMount();

      (wrapper.vm as any).showErrorToast({
        error: someError,
        headline: "some headline",
      });

      expect(toast.show).toHaveBeenCalledWith(
        getExpectedToastWithHeadline("some headline"),
      );
    });
  });
});
