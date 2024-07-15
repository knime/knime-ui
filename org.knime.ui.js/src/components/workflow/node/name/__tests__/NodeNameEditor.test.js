import { expect, describe, beforeAll, afterEach, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";

import * as $shapes from "@/style/shapes";
import ActionBar from "@/components/common/ActionBar.vue";

import NodeNameEditor from "../NodeNameEditor.vue";
import NodeNameTextarea from "../NodeNameTextarea.vue";

describe("NodeNameEditor", () => {
  const props = {
    value: "test",
    nodePosition: { x: 15, y: 13 },
    nodeId: "root:1",
  };

  const doMount = () => {
    const storeConfig = {
      canvas: {
        getters: {
          viewBox: () => ({ left: 0, top: 0 }),
        },
      },
    };
    const $store = mockVuexStore(storeConfig);
    const wrapper = mount(NodeNameEditor, {
      props,
      global: {
        plugins: [$store],
        mocks: { $shapes },
        stubs: { NodeNameTextarea: true },
      },
    });

    return wrapper;
  };

  it("should render the ActionBar and the Textarea", () => {
    const wrapper = doMount();
    expect(wrapper.findComponent(NodeNameTextarea).exists()).toBe(true);
    expect(wrapper.findComponent(ActionBar).exists()).toBe(true);
  });

  describe("blocks events to canvas", () => {
    const mockStopPropagation = vi.fn();
    const mockPreventDefault = vi.fn();

    beforeAll(() => {
      MouseEvent.prototype.stopPropagation = mockStopPropagation;
      MouseEvent.prototype.preventDefault = mockPreventDefault;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should block click events", () => {
      const wrapper = doMount();
      const rect = wrapper.find("rect");

      rect.trigger("click");

      expect(mockStopPropagation).toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
    });

    it("should block contextmenu events", () => {
      const wrapper = doMount();
      const rect = wrapper.find("rect");

      rect.trigger("contextmenu");

      expect(mockStopPropagation).toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
    });
  });

  it("should save name when clicking on rect overlay", () => {
    const wrapper = doMount();
    const rect = wrapper.find("rect");

    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("update:modelValue", "new value");
    wrapper.findComponent(NodeNameTextarea).vm.$emit("save");
    rect.trigger("click");

    expect(wrapper.emitted("save")[0][0]).toEqual(
      expect.objectContaining({
        newName: "new value",
      }),
    );
  });

  describe("action bar", () => {
    it("should be positioned based on the relevant prop", () => {
      const wrapper = doMount();
      const actionBar = wrapper.findComponent(ActionBar);
      const expectedPosition = "translate(31,-6)";

      expect(actionBar.attributes("transform")).toBe(expectedPosition);
    });

    it("should emit save when clicking the save button", () => {
      const wrapper = doMount();
      wrapper
        .findComponent(NodeNameTextarea)
        .vm.$emit("update:modelValue", "new value");

      wrapper.findAll(".action-button").at(0).trigger("click");
      expect(wrapper.emitted("save")).toBeDefined();
    });

    it("should emit a cancel event when clicking the cancel button", () => {
      const wrapper = doMount();
      wrapper.findAll(".action-button").at(1).trigger("click");

      expect(wrapper.emitted("cancel")).toBeDefined();
    });
  });

  describe("handle textarea events", () => {
    it.each(["widthChange", "heightChange"])(
      "should forward a (%s) event",
      (eventName) => {
        const wrapper = doMount();
        const emittedValue = 200;
        wrapper
          .findComponent(NodeNameTextarea)
          .vm.$emit(eventName, emittedValue);
        expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
      },
    );

    it("should emit a save event", () => {
      const wrapper = doMount();
      wrapper
        .findComponent(NodeNameTextarea)
        .vm.$emit("update:modelValue", "new value");
      wrapper.findComponent(NodeNameTextarea).vm.$emit("save");

      expect(wrapper.emitted("save")).toBeDefined();
    });

    it("should not emit a save event if the name did not change", () => {
      const wrapper = doMount();
      wrapper
        .findComponent(NodeNameTextarea)
        .vm.$emit("update:modelValue", props.value);
      wrapper.findComponent(NodeNameTextarea).vm.$emit("save");

      expect(wrapper.emitted("save")).toBeUndefined();
    });

    it("should emit a cancel event", () => {
      const wrapper = doMount();
      wrapper.findComponent(NodeNameTextarea).vm.$emit("cancel");
      expect(wrapper.emitted("cancel")).toBeDefined();
    });
  });

  it("should trim content before saving", () => {
    const wrapper = doMount();
    const emittedValue = "   this is the content    ";

    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("update:modelValue", emittedValue);
    wrapper.findComponent(NodeNameTextarea).vm.$emit("save");

    expect(wrapper.emitted("save")[0][0]).toEqual(
      expect.objectContaining({
        newName: emittedValue.trim(),
      }),
    );
  });

  it("should not save empty values", () => {
    const wrapper = doMount();
    const emittedValue = "    ";

    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("update:modelValue", emittedValue);
    wrapper.findComponent(NodeNameTextarea).vm.$emit("save");

    expect(wrapper.emitted("save")).toBeUndefined();
    expect(wrapper.emitted("cancel")).toBeDefined();
  });

  it("should emit the latest dimensions of the editor when saving", () => {
    const wrapper = doMount();
    const emittedWidth = 200;
    const emittedHeight = 100;
    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("widthChange", emittedWidth);
    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("heightChange", emittedHeight);

    wrapper
      .findComponent(NodeNameTextarea)
      .vm.$emit("update:modelValue", "new value");
    wrapper.findComponent(NodeNameTextarea).vm.$emit("save");

    expect(wrapper.emitted("save")[0][0]).toEqual(
      expect.objectContaining({
        dimensionsOnClose: { width: emittedWidth, height: emittedHeight },
      }),
    );
  });

  it("should show an error message for invalid characters input", async () => {
    const wrapper = doMount();
    expect(wrapper.find("foreignObject").exists()).toBe(false);
    await wrapper.findComponent(NodeNameTextarea).vm.$emit("invalidInput");
    expect(wrapper.find("foreignObject").exists()).toBe(true);
    expect(wrapper.find("foreignObject").text()).toContain(
      "are not allowed and have been removed.",
    );
  });

  it("hides error message after some time", async () => {
    const wrapper = doMount();
    vi.useFakeTimers();
    expect(wrapper.find("foreignObject").exists()).toBe(false);
    await wrapper.findComponent(NodeNameTextarea).vm.$emit("invalidInput");
    expect(wrapper.find("foreignObject").exists()).toBe(true);
    vi.runAllTimers();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("foreignObject").exists()).toBe(false);
  });

  it("clears active hide error message timer if another inlaid input occurs", async () => {
    const wrapper = doMount();
    window.clearTimeout = vi.fn();
    await wrapper.findComponent(NodeNameTextarea).vm.$emit("invalidInput");
    await wrapper.findComponent(NodeNameTextarea).vm.$emit("invalidInput");
    expect(window.clearTimeout).toBeCalled();
  });

  it("updates value of textarea on value prop change", async () => {
    const wrapper = doMount();
    expect(wrapper.findComponent(NodeNameTextarea).props("modelValue")).toBe(
      "test",
    );
    await wrapper.setProps({ value: "newValue" });
    expect(wrapper.findComponent(NodeNameTextarea).props("modelValue")).toBe(
      "newValue",
    );
  });
});
