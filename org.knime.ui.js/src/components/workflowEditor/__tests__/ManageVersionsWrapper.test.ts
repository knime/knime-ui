import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import {
  CreateVersionForm,
  ManageVersions,
} from "@knime/hub-features/versions";

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
} as const;

describe("ManageVersionsWrapper.vue", () => {
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

        wrapper.findComponent(ManageVersions).vm.$emit("select", 42);
        expect(mockedVersionsStore.switchVersion).toHaveBeenCalledWith(42);
      });

      it("delete", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.deleteVersion = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("delete", 42);
        expect(mockedVersionsStore.deleteVersion).toHaveBeenCalledWith(42);
      });

      it("restore", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.restoreVersion = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("restore", 42);
        expect(mockedVersionsStore.restoreVersion).toHaveBeenCalledWith(42);
      });

      it("loadAll", () => {
        const { wrapper, mockedVersionsStore } = doMount();
        mockedVersionsStore.refreshData = vi.fn();

        wrapper.findComponent(ManageVersions).vm.$emit("loadAll");
        expect(mockedVersionsStore.refreshData).toHaveBeenCalledWith({
          loadAll: true,
        });
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

      it("upload", () => {
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
        vi.mocked(spacesStore).copyBetweenSpaces.mockImplementation(vi.fn());

        wrapper.findComponent(VersionPanelPromoteHub).vm.$emit("upload");

        expect(spacesStore.copyBetweenSpaces).toHaveBeenCalledWith({
          projectId: "mockProjectId",
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

      mockedVersionsStore.createVersion = vi.fn();
      const versionData = {
        name: "mockName",
        description: "someMockDescription",
      };
      wrapper.findComponent(CreateVersionForm).vm.$emit("create", versionData);
      expect(mockedVersionsStore.createVersion).toHaveBeenCalledWith(
        versionData,
      );
    });

    it("handles cancel event", async () => {
      const { wrapper } = doMount();
      await openCreateVersionsForm(wrapper);

      wrapper.findComponent(CreateVersionForm).vm.$emit("cancel");
      await nextTick();

      expect(wrapper.findComponent(CreateVersionForm).exists()).toBe(false);
    });
  });
});
