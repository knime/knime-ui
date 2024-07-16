import { expect, describe, it, vi, afterEach } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { Modal, InputField } from "@knime/components";

import { deepMocked, mockVuexStore } from "@/test/utils";
import * as spacesStore from "@/store/spaces";

import CreateWorkflowModal from "../CreateWorkflowModal.vue";
import { API } from "@api";
import { $bus } from "@/plugins/event-bus";

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

    const $store = mockVuexStore({
      application: {
        state: {
          openProjects: [],
        },
      },
      spaces: spacesStore,
    });

    $store.commit("spaces/setProjectPath", {
      projectId,
      value: {
        spaceId: "space",
        spaceProviderId: "provider",
        itemId: "root",
      },
    });

    $store.commit("spaces/setWorkflowGroupContent", {
      projectId,
      content: { items },
    });

    // modal state
    $store.commit("spaces/setCreateWorkflowModalConfig", {
      isOpen,
      projectId,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(CreateWorkflowModal, {
      global: {
        plugins: [$store],
        stubs: { BaseModal: true },
      },
      attachTo: document.body,
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  describe("createWorkflowModal", () => {
    it("opens on state change", async () => {
      const { wrapper, $store } = doMount({ isOpen: false });
      await $store.commit("spaces/setCreateWorkflowModalConfig", {
        isOpen: true,
        projectId,
      });
      await Vue.nextTick();
      expect(wrapper.find("input").isVisible()).toBe(true);
    });

    it("closes on state change", async () => {
      const { wrapper, commitSpy } = doMount({ isOpen: true });

      wrapper.findComponent(Modal).vm.$emit("cancel");
      await Vue.nextTick();

      expect(wrapper.find("input").isVisible()).toBe(false);
      expect(commitSpy).toHaveBeenCalledWith(
        "spaces/setCreateWorkflowModalConfig",
        { isOpen: false, projectId: null },
      );
    });

    it("should create workflow", async () => {
      const { wrapper, dispatchSpy } = doMount();

      const newName = "Test name";
      const input = wrapper.find("input");
      input.element.value = newName;
      input.trigger("input");

      const submitButton = wrapper.findAll("button").at(-1)!;
      expect(submitButton.attributes("disabled")).toBeUndefined();

      await submitButton.trigger("click");
      expect(submitButton.attributes("disabled")).toBe("");

      await flushPromises();

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/createWorkflow", {
        projectId: "someProject",
        workflowName: newName,
      });

      expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
        providerId: "provider",
        spaceId: "space",
        itemId: "new-wf",
      });
    });

    it("should disable button when name is invalid", async () => {
      const { wrapper } = await doMount();

      const input = wrapper.find("input");
      input.element.value = 'invalid Name?*?#:"<>%~|/\\>?';
      input.trigger("input");
      await Vue.nextTick();

      const errorMessage = wrapper.find(".item-error");
      expect(errorMessage.text()).toMatch("contains invalid characters");
    });

    it("should focus the input", async () => {
      vi.useFakeTimers();
      const { wrapper } = await doMount();

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
        const { wrapper, dispatchSpy } = doMount();

        const newName = "A valid name";
        const input = wrapper.find("input");
        input.element.value = newName;
        input.trigger("input");

        const inputField = wrapper.findComponent(InputField);
        await inputField.vm.$emit("keyup", { key: "Enter" });
        await inputField.vm.$emit("keyup", { key: "Enter" });

        expect(dispatchSpy).toHaveBeenNthCalledWith(
          1,
          "spaces/createWorkflow",
          {
            projectId: "someProject",
            workflowName: newName,
          },
        );
      });

      it("should not submit on keypress enter with an invalid name", async () => {
        const { wrapper, dispatchSpy } = doMount();

        const newName = 'An invalid name *?#:"<>%~|/\\>?';
        const input = wrapper.find("input");
        input.element.value = newName;
        await input.trigger("input");

        const inputField = wrapper.findComponent(InputField);
        await inputField.vm.$emit("keyup", { key: "Enter" });
        expect(dispatchSpy).not.toHaveBeenCalledWith("spaces/createWorkflow", {
          workflowName: newName,
        });
      });
    });
  });
});
