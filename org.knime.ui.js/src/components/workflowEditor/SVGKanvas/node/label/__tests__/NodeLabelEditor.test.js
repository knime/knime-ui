import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import ActionBar from "@/components/workflowEditor/common/svgActionBar/ActionBar.vue";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import NodeLabelEditor from "../NodeLabelEditor.vue";
import NodeLabelTextArea from "../NodeLabelTextArea.vue";

describe("NodeLabelEditor", () => {
  const props = {
    value: "test",
    nodePosition: { x: 15, y: 13 },
    nodeId: "root:1",
    kind: "node",
  };
  const doMount = () => {
    const mockedStores = mockStores();

    mockedStores.canvasStore.viewBox = { left: 0, top: 0 };
    const wrapper = mount(NodeLabelEditor, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes },
        stubs: { NodeLabelTextArea: true },
      },
    });

    return { wrapper };
  };

  it("should render the ActionBar and the Textarea", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(NodeLabelTextArea).exists()).toBe(true);
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
      const { wrapper } = doMount();
      const rect = wrapper.find("rect");

      rect.trigger("click");

      expect(mockStopPropagation).toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
    });

    it("should block contextmenu events", () => {
      const { wrapper } = doMount();
      const rect = wrapper.find("rect");

      rect.trigger("contextmenu");

      expect(mockStopPropagation).toHaveBeenCalled();
      expect(mockPreventDefault).toHaveBeenCalled();
    });
  });

  it("should save name when clicking on rect overlay", () => {
    const { wrapper } = doMount();
    const rect = wrapper.find("rect");

    wrapper
      .findComponent(NodeLabelTextArea)
      .vm.$emit("update:modelValue", "new value");
    wrapper.findComponent(NodeLabelTextArea).vm.$emit("save");
    rect.trigger("click");

    expect(wrapper.emitted("save")[0][0]).toEqual(
      expect.objectContaining({
        newLabel: "new value",
      }),
    );
  });

  describe("action bar", () => {
    it("should be positioned based on the relevant prop", () => {
      const { wrapper } = doMount();
      const actionBar = wrapper.findComponent(ActionBar);
      const expectedPosition = "translate(31,61)";

      expect(actionBar.attributes("transform")).toBe(expectedPosition);
    });

    it("should be positioned differently for metanode", async () => {
      const { wrapper } = doMount();
      await wrapper.setProps({ kind: "metanode" });
      const actionBar = wrapper.findComponent(ActionBar);
      const expectedPosition = "translate(31,41)";

      expect(actionBar.attributes("transform")).toBe(expectedPosition);
    });

    it("should be positioned differently for when there is a portOffset", async () => {
      const { wrapper } = doMount();
      await wrapper.setProps({ portOffset: 9 });
      const actionBar = wrapper.findComponent(ActionBar);
      const expectedPosition = "translate(31,70)";
      expect(actionBar.attributes("transform")).toBe(expectedPosition);
    });

    it("should emit save when clicking the save button", () => {
      const { wrapper } = doMount();
      wrapper
        .findComponent(NodeLabelTextArea)
        .vm.$emit("update:modelValue", "new value");

      wrapper.findAll(".action-button").at(0).trigger("click");

      expect(wrapper.emitted("save")).toBeDefined();
    });

    it("should emit a cancel event when clicking the cancel button", () => {
      const { wrapper } = doMount();
      wrapper.findComponent(ActionBar).vm.$emit("cancel");

      wrapper.findAll(".action-button").at(1).trigger("click");

      expect(wrapper.emitted("cancel")).toBeDefined();
    });
  });

  describe("handle textarea events", () => {
    it("should emit a save event", () => {
      const { wrapper } = doMount();
      wrapper
        .findComponent(NodeLabelTextArea)
        .vm.$emit("update:modelValue", "new value");
      wrapper.findComponent(NodeLabelTextArea).vm.$emit("save");

      expect(wrapper.emitted("save")).toBeDefined();
    });

    it("should not emit a save event if the label did not change", () => {
      const { wrapper } = doMount();
      wrapper
        .findComponent(NodeLabelTextArea)
        .vm.$emit("update:modelValue", props.value);
      wrapper.findComponent(NodeLabelTextArea).vm.$emit("save");

      expect(wrapper.emitted("save")).toBeUndefined();
    });

    it("should emit a cancel event", () => {
      const { wrapper } = doMount();
      wrapper.findComponent(NodeLabelTextArea).vm.$emit("cancel");
      expect(wrapper.emitted("cancel")).toBeDefined();
    });
  });

  it("should trim content before saving", () => {
    const { wrapper } = doMount();
    const emittedValue = "   this is the content    ";

    wrapper
      .findComponent(NodeLabelTextArea)
      .vm.$emit("update:modelValue", emittedValue);
    wrapper.findComponent(NodeLabelTextArea).vm.$emit("save");

    expect(wrapper.emitted("save")[0][0]).toEqual(
      expect.objectContaining({
        newLabel: emittedValue.trim(),
      }),
    );
  });

  it("updates value of textarea on value prop change", async () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(NodeLabelTextArea).props("modelValue")).toBe(
      "test",
    );
    await wrapper.setProps({ value: "newValue" });
    expect(wrapper.findComponent(NodeLabelTextArea).props("modelValue")).toBe(
      "newValue",
    );
  });
});
