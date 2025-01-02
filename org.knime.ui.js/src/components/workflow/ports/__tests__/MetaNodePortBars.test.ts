import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import MetaNodePortBar from "../MetaNodePortBar.vue";
import MetaNodePortBars from "../MetaNodePortBars.vue";

describe("MetaNodePortBars.vue", () => {
  const top = 107;
  const extendedBoundsTop = 5;

  const doMount = () => {
    const mockedStores = mockStores();
    mockedStores.workflowStore.activeWorkflow = createWorkflow({
      info: { containerId: "metanode" },
    });
    mockedStores.workflowStore.workflowBounds = {
      left: 0,
      width: 500,
      top,
      right: 100,
    };
    mockedStores.canvasStore.contentBounds = {
      top: extendedBoundsTop,
    };

    const wrapper = shallowMount(MetaNodePortBars, {
      global: {
        mocks: { $shapes },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("renders nothing if workflow has no ports", () => {
    const { wrapper } = doMount();
    expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(0);
  });

  it.each([
    ["input", "in", "In"],
    ["output", "out", "Out"],
  ])(
    "renders one bar if workflow has %s ports only",
    async (_, type, typeUppercased) => {
      const { wrapper, mockedStores } = doMount();
      const dummy = {};
      mockedStores.workflowStore.activeWorkflow[`meta${typeUppercased}Ports`] =
        { ports: [dummy] };
      await nextTick();
      expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(1);
      const bar = wrapper.findAllComponents(MetaNodePortBar).at(0);
      expect(bar.props("type")).toBe(type);
      expect(bar.props("ports")).toEqual([dummy]);
      expect(bar.props("containerId")).toBe("metanode");
    },
  );

  it("renders two bars if workflow has both input and output ports", async () => {
    const { wrapper, mockedStores } = doMount();
    const dummy = {};
    mockedStores.workflowStore.activeWorkflow.metaInPorts = {
      ports: [dummy],
    };
    mockedStores.workflowStore.activeWorkflow.metaOutPorts = {
      ports: [dummy, dummy],
    };
    await nextTick();
    expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(2);
    const inBar = wrapper.findAllComponents(MetaNodePortBar).at(0);
    expect(inBar.props("type")).toBe("in");
    expect(inBar.props("ports")).toEqual([dummy]);
    expect(inBar.props("containerId")).toBe("metanode");

    const outBar = wrapper.findAllComponents(MetaNodePortBar).at(1);
    expect(outBar.props("type")).toBe("out");
    expect(outBar.props("ports")).toEqual([dummy, dummy]);
    expect(outBar.props("containerId")).toBe("metanode");
  });
});
