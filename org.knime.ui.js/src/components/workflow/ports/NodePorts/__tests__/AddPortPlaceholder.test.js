import { describe, expect, it, vi } from "vitest";
import { Transition, nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import Port from "@/components/common/Port.vue";
import {
  actions as workflowStoreActions,
  mutations as workflowStoreMutations,
} from "@/store/workflow";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import AddPortPlaceholder, {
  addPortPlaceholderPath,
} from "../AddPortPlaceholder.vue";

describe("AddPortPlaceholder.vue", () => {
  const doMount = ({ props, portTypeMenu } = {}) => {
    const defaultProps = {
      position: [10, 10],
      side: "output",
      nodeId: "node-id",
      targeted: false,
      targetPort: null,
      portGroups: { input: { supportedPortTypeIds: ["type1", "type2"] } },
    };

    const provide = {
      anchorPoint: {
        x: 10,
        y: 10,
      },
    };

    const storeConfig = {
      workflow: {
        state: {
          portTypeMenu: {
            isOpen: false,
            ...portTypeMenu,
          },
        },
        actions: workflowStoreActions,
        mutations: workflowStoreMutations,
      },
    };

    const $store = mockVuexStore(storeConfig);

    const wrapper = shallowMount(AddPortPlaceholder, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        mocks: { $shapes, $colors },
        provide,
      },
    });

    return { wrapper, $store };
  };

  describe("addPortPlaceholder", () => {
    it("set position", () => {
      const { wrapper } = doMount();
      expect(wrapper.attributes("transform")).toBe("translate(10,10)");
    });

    it("add Port Button", () => {
      const { wrapper } = doMount();

      const addPortButton = wrapper.find(".add-port-icon");

      expect(addPortButton.classes()).not.toContain("active");
      expect(addPortButton.find("path").attributes("d")).toBe(
        addPortPlaceholderPath,
      );
    });

    it("show and hide with port type menu", async () => {
      vi.useFakeTimers();
      const { wrapper, $store } = doMount();

      expect(wrapper.element.style.opacity).toBe("");

      await $store.dispatch("workflow/openPortTypeMenu", {
        nodeId: "node-id",
        props: { side: "output" },
      });

      expect(wrapper.element.style.opacity).toBe("1");

      await $store.dispatch("workflow/closePortTypeMenu");
      vi.runAllTimers();

      expect(wrapper.element.style.opacity).toBe("");
    });

    it("opening menu again aborts delayed fade out", async () => {
      const { wrapper, $store } = doMount();

      expect(wrapper.element.style.opacity).toBe("");

      vi.useFakeTimers();
      await $store.dispatch("workflow/openPortTypeMenu", {
        nodeId: "node-id",
        props: { side: "output" },
      });
      await $store.dispatch("workflow/closePortTypeMenu");
      await $store.dispatch("workflow/openPortTypeMenu", {
        nodeId: "node-id",
        props: { side: "output" },
      });
      vi.advanceTimersToNextTimer();

      expect(wrapper.element.style.opacity).toBe("1");
    });

    it("adds port directly, if only one option is given", () => {
      const props = {
        portGroups: {
          input: { supportedPortTypeIds: ["table"], canAddInPort: true },
        },
      };
      const { wrapper } = doMount({ props });

      wrapper.find(".add-port-icon").trigger("click");
      expect(wrapper.emitted("addPort")).toStrictEqual([
        [{ portGroup: "input", typeId: "table" }],
      ]);
    });

    it("uses targetPort as preview port if placeholder is targeted", async () => {
      const targetPort = { typeId: "targetTypeId" };
      const { wrapper } = doMount();

      expect(wrapper.find(".add-port-icon").exists()).toBe(true);
      await wrapper.setProps({ targeted: true, targetPort });

      expect(wrapper.find(".add-port-icon").exists()).toBe(false);
      expect(wrapper.findComponent(Port).props("port")).toStrictEqual(
        targetPort,
      );
    });

    it("does not show preview port if menu is closed", () => {
      const { wrapper } = doMount({
        portTypeMenu: { isOpen: false, previewPort: { typeId: "test" } },
      });

      expect(wrapper.findComponent(Port).exists()).toBe(false);
    });

    describe("with open menu", () => {
      const mountWithOpenMenu = async () => {
        const { wrapper, ...rest } = doMount();
        await wrapper.find(".add-port-icon").trigger("click");
        return { wrapper, ...rest };
      };

      it("opens the menu on click", async () => {
        const { $store } = await mountWithOpenMenu();

        expect($store.state.workflow.portTypeMenu).toMatchObject({
          nodeId: "node-id",
          props: {
            position: {
              x: 20,
              y: 20,
            },
            side: "output",
            portGroups: {},
          },
          events: {
            itemActive: expect.any(Function),
            itemClick: expect.any(Function),
            menuClose: expect.any(Function),
          },
        });
      });

      it("sets add-port-icon active", async () => {
        const { wrapper } = await mountWithOpenMenu();
        expect(wrapper.find(".add-port-icon").classes()).toContain("active");
      });

      it("preview port", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();

        const port = { typeId: "table" };
        $store.state.workflow.portTypeMenu.events.itemActive({ port });
        await nextTick();

        expect(wrapper.find(".add-port-icon").exists()).toBe(false);
        expect(wrapper.findComponent(Port).props("port")).toStrictEqual(port);

        expect(wrapper.findComponent(Transition).attributes("name")).toBe(
          "port-fade",
        );
      });

      it("resets port preview", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();

        $store.state.workflow.portTypeMenu.events.itemActive(null);
        await nextTick();

        expect(wrapper.find(".add-port-icon").exists()).toBe(true);
        expect(wrapper.findComponent(Port).exists()).toBe(false);
      });

      it("closes menu on click", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();

        await wrapper.find(".add-port-icon").trigger("click");

        expect($store.state.workflow.portTypeMenu.isOpen).toBe(false);
      });

      it("closes menu on menuClose event", async () => {
        const { $store } = await mountWithOpenMenu();

        $store.state.workflow.portTypeMenu.events.menuClose();
        await nextTick();

        expect($store.state.workflow.portTypeMenu.isOpen).toBe(false);
      });

      it("close menu without selecting a port resets port preview", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();
        const callbacks = $store.state.workflow.portTypeMenu.events;

        callbacks.itemActive({ portId: "table" });
        callbacks.menuClose();
        await nextTick();

        expect(wrapper.findComponent(Port).exists()).toBe(false);
        expect(wrapper.find(".add-port-icon").exists()).toBe(true);
      });

      it("click on item reset preview without transition", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();

        const port = { typeId: "table" };
        $store.state.workflow.portTypeMenu.events.itemClick({ port });

        await nextTick();
        expect(wrapper.findComponent(Transition).attributes("name")).toBe(
          "none",
        );
        expect(wrapper.findComponent(Port).exists()).toBe(false);
        expect(wrapper.find(".add-port-icon").exists()).toBe(true);

        // checks transitionEnabled is reset to true in nextTick
        await nextTick();
        expect(wrapper.findComponent(Transition).attributes("name")).toBe(
          "port-fade",
        );
      });

      it("click on item emits event", async () => {
        const { wrapper, $store } = await mountWithOpenMenu();

        $store.state.workflow.portTypeMenu.events.itemClick({
          typeId: "table",
        });

        expect(wrapper.emitted("addPort")).toStrictEqual([
          [{ typeId: "table", portGroup: undefined }],
        ]);
      });
    });
  });
});
