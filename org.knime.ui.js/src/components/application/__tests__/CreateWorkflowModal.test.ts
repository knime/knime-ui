import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { InputField, Modal } from "@knime/components";

import { $bus } from "@/plugins/event-bus";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import CreateWorkflowModal from "../CreateWorkflowModal.vue";

const busEmitSpy = vi.spyOn($bus, "emit");

const mockedAPI = deepMocked(API);

describe("CreateWorkflowModal.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MOCK_DATA = [
    {
      id: "1",
      name: "File 1",
    },
    {
      id: "2",
      name: "File 2",
    },
    {
      id: "3",
      name: "File 3",
    },
    {
      id: "4",
      name: "File 3",
    },
  ];

  const projectId = "someProject";
  const doMount = ({ items = MOCK_DATA, isOpen = true } = {}) => {
    mockedAPI.space.createWorkflow.mockResolvedValue({ id: "new-wf" });
    mockedAPI.space.listWorkflowGroup.mockResolvedValue({ items });

    const mockedStores = mockStores();

    mockedStores.spaceCachingStore.setProjectPath({
      projectId,
      value: {
        spaceId: "space",
        spaceProviderId: "provider",
        itemId: "root",
      },
    });

    mockedStores.spaceCachingStore.setWorkflowGroupContent({
      projectId,
      content: { items },
    });

    // modal state
    mockedStores.spacesStore.setCreateWorkflowModalConfig({
      isOpen,
      projectId,
    });

    const wrapper = mount(CreateWorkflowModal, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
      attachTo: document.body,
    });

    return { wrapper, mockedStores };
  };

  describe("createWorkflowModal", () => {
    it("opens on state change", async () => {
      const { wrapper, mockedStores } = doMount({ isOpen: false });
      mockedStores.spacesStore.setCreateWorkflowModalConfig({
        isOpen: true,
        projectId,
      });
      await nextTick();
      expect(wrapper.find("input").isVisible()).toBe(true);
    });

    it("closes on state change", async () => {
      const { wrapper, mockedStores } = doMount({ isOpen: true });

      wrapper.findComponent(Modal).vm.$emit("cancel");
      await nextTick();

      expect(wrapper.find("input").isVisible()).toBe(false);
      expect(
        mockedStores.spacesStore.setCreateWorkflowModalConfig,
      ).toHaveBeenCalledWith({ isOpen: false, projectId: null });
    });

    it("should create workflow", async () => {
      const { wrapper, mockedStores } = doMount();

      const newName = "Test name";
      const input = wrapper.find("input");
      input.element.value = newName;
      input.trigger("input");

      const submitButton = wrapper.findAll("button").at(-1)!;
      expect(submitButton.attributes("disabled")).toBeUndefined();

      await submitButton.trigger("click");
      expect(submitButton.attributes("disabled")).toBe("");

      await flushPromises();

      expect(
        mockedStores.spaceOperationsStore.createWorkflow,
      ).toHaveBeenCalledWith({
        projectId: "someProject",
        workflowName: newName,
      });

      expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");

      expect(
        mockedStores.spaceOperationsStore.openProject,
      ).toHaveBeenCalledWith({
        providerId: "provider",
        spaceId: "space",
        itemId: "new-wf",
      });
    });

    it("should disable button when name is invalid", async () => {
      const { wrapper } = doMount();

      const input = wrapper.find("input");
      input.element.value = 'invalid Name?*?#:"<>%~|/\\>?';
      input.trigger("input");
      await nextTick();

      const errorMessage = wrapper.find(".item-error");
      expect(errorMessage.text()).toMatch("contains invalid characters");
    });

    it("should focus the input", () => {
      vi.useFakeTimers();
      const { wrapper } = doMount();

      const input = wrapper.find("input");
      const focusSpy = vi.spyOn(input.element, "focus");
      vi.runAllTimers();
      expect(focusSpy).toHaveBeenCalled();
    });

    describe("name Suggestion", () => {
      it("should set default name suggestion", () => {
        const { wrapper } = doMount();
        const input = wrapper.find("input");
        expect(input.element.value).toBe("KNIME_project");
      });

      it("should find suitable name suggestion", async () => {
        const { wrapper } = doMount({
          items: [
            {
              id: "1",
              name: "KNIME_project",
            },
            {
              id: "2",
              name: "KNIME_project1",
            },
          ],
        });
        await flushPromises();

        const input = wrapper.find("input");
        expect(input.element.value).toBe("KNIME_project2");
      });
    });

    describe("hotkeys", () => {
      it("should submit on keypress enter with a valid name but only once", async () => {
        const { wrapper, mockedStores } = doMount();

        const newName = "A valid name";
        const input = wrapper.find("input");
        input.element.value = newName;
        input.trigger("input");

        const inputField = wrapper.findComponent(InputField);
        await inputField.vm.$emit("keyup", { key: "Enter" });
        await inputField.vm.$emit("keyup", { key: "Enter" });

        expect(
          mockedStores.spaceOperationsStore.createWorkflow,
        ).toHaveBeenNthCalledWith(1, {
          projectId: "someProject",
          workflowName: newName,
        });
      });

      it("should not submit on keypress enter with an invalid name", async () => {
        const { wrapper, mockedStores } = doMount();

        const newName = 'An invalid name *?#:"<>%~|/\\>?';
        const input = wrapper.find("input");
        input.element.value = newName;
        await input.trigger("input");

        const inputField = wrapper.findComponent(InputField);
        inputField.vm.$emit("keyup", { key: "Enter" });

        expect(
          mockedStores.spaceOperationsStore.createWorkflow,
        ).not.toHaveBeenCalledWith({
          workflowName: newName,
        });
      });
    });
  });
});
