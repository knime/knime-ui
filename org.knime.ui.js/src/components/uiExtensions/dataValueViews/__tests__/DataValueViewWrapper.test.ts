import { describe, expect, it } from "vitest";
import { nextTick, toRef } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import DataValueViewLoader from "../DataValueViewLoader.vue";
import DataValueViewWrapper, { type Props } from "../DataValueViewWrapper.vue";
import ResizableComponentWrapper from "../ResizableComponentWrapper.vue";

describe("DataValueViewWrapper", () => {
  const props: Props = {
    projectId: "project-id",
    nodeId: "node-id",
    selectedColIndex: 0,
    selectedRowIndex: 0,
    anchor: toRef(null),
    workflowId: "workflow-id",
    selectedPortIndex: 0,
  };

  const doShallowMount = (customProps: Partial<Props> = {}) => {
    const wrapper = shallowMount(DataValueViewWrapper, {
      props: { ...props, ...customProps },
    });
    return { wrapper };
  };

  it("uses the default view size when the view was not resized", () => {
    const { wrapper } = doShallowMount();
    window.innerWidth = 1000;
    window.dispatchEvent(new Event("resize"));
    expect(wrapper.attributes().style).toContain("width: 396px;");
    expect(wrapper.attributes().style).toContain("height: 277.5px;");
  });

  describe("resizing the data value view", () => {
    it("uses the resized position and the resized size in favor of the default size", async () => {
      const { wrapper } = doShallowMount();
      const resizableWrapper = wrapper.findComponent(ResizableComponentWrapper);
      await flushPromises();
      resizableWrapper.vm.$emit("custom-resize", {
        width: 500,
        height: 300,
        left: -50,
        top: -70,
      });
      await nextTick(); // wait one tick until the styles are updated
      expect(wrapper.attributes().style).toContain("width: 500px;");
      expect(wrapper.attributes().style).toContain("height: 300px;");
      expect(wrapper.attributes().style).toContain("top: -70px;");
      expect(wrapper.attributes().style).toContain("left: -50px;");
    });

    it("saves the resized sizes in the session storage", () => {
      const { wrapper } = doShallowMount();
      const resizableWrapper = wrapper.findComponent(ResizableComponentWrapper);
      const savedSize = { width: 700, height: 500 };
      resizableWrapper.vm.$emit("custom-resize", savedSize);
      wrapper.unmount();
      expect(
        sessionStorage.getItem("data-value-view-resized-size"),
      ).toStrictEqual(JSON.stringify(savedSize));
    });

    it("uses the sizes from the session storage instead of the default", async () => {
      sessionStorage.setItem(
        "data-value-view-resized-size",
        JSON.stringify({ width: 765, height: 432 }),
      );
      const { wrapper } = doShallowMount();
      await nextTick();
      expect(wrapper.attributes().style).toContain("width: 765px;");
      expect(wrapper.attributes().style).toContain("height: 432px;");
      expect(wrapper.attributes().style).toContain("top: 0px;");
      expect(wrapper.attributes().style).toContain("left: 0px;");
      sessionStorage.clear();
    });
  });

  describe("dragging the data value view", () => {
    const doShallowMountWithMouseDown = async (
      customProps: Partial<Props> = {},
    ) => {
      const { wrapper } = doShallowMount(customProps);
      await nextTick();
      await wrapper.trigger("mousedown");
      return { wrapper };
    };

    const moveMouse = (x: number, y: number) =>
      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: x, clientY: y }),
      );

    it("drags the data value view", async () => {
      const { wrapper } = await doShallowMountWithMouseDown();
      await nextTick();
      expect(
        wrapper.findComponent(DataValueViewLoader).attributes().style,
      ).toContain("pointer-events: none;");

      moveMouse(10, 10);
      moveMouse(10, -20);

      await nextTick();

      expect(wrapper.attributes().style).toContain("left: 10px;");
      expect(wrapper.attributes().style).toContain("top: -20px;");

      window.dispatchEvent(new Event("mouseup"));
      await nextTick();
      expect(
        wrapper.findComponent(DataValueViewLoader).attributes().style,
      ).not.toContain("pointer-events: none;");
    });

    it("keeps the position of the view when the data changes", async () => {
      const { wrapper } = await doShallowMountWithMouseDown();
      moveMouse(10, 10);
      window.dispatchEvent(new Event("mouseup"));
      await wrapper.setProps({ selectedRowIndex: 1 });
      await nextTick();
      expect(wrapper.attributes().style).toContain("left: 10px;");
    });
  });
});
