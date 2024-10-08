import { beforeEach, describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import MetaNodePortBar from "../MetaNodePortBar.vue";
import MetaNodePortBars from "../MetaNodePortBars.vue";

describe("MetaNodePortBars.vue", () => {
  let props, doShallowMount, wrapper, $store, activeWorkflow;
  const top = 107;
  const extendedBoundsTop = 5;

  beforeEach(() => {
    activeWorkflow = { info: { containerId: "metanode" } };
    wrapper = null;
    props = {};
    $store = mockVuexStore({
      workflow: {
        state: {
          activeWorkflow,
          initialWorkflowBounds: {
            left: 0,
            width: 500,
            top,
            right: 100,
          },
        },
        getters: {
          workflowBounds() {
            return {
              left: 0,
              width: 500,
              top,
              right: 100,
            };
          },
        },
      },
      canvas: {
        getters: {
          contentBounds() {
            return {
              top: extendedBoundsTop,
            };
          },
        },
      },
    });

    doShallowMount = () => {
      wrapper = shallowMount(MetaNodePortBars, {
        props,
        global: {
          mocks: { $shapes },
          plugins: [$store],
        },
      });
    };
  });

  it("renders nothing if workflow has no ports", () => {
    doShallowMount();
    expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(0);
  });

  it.each([
    ["input", "in", "In"],
    ["output", "out", "Out"],
  ])(
    "renders one bar if workflow has %s ports only",
    (_, type, typeUppercased) => {
      let dummy = {};
      activeWorkflow[`meta${typeUppercased}Ports`] = {
        ports: [dummy],
      };
      doShallowMount();
      expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(1);
      let bar = wrapper.findAllComponents(MetaNodePortBar).at(0);
      expect(bar.props("type")).toBe(type);
      expect(bar.props("ports")).toEqual([dummy]);
      expect(bar.props("containerId")).toBe("metanode");
    },
  );

  it("renders two bars if workflow has both input and output ports", () => {
    let dummy = {};
    activeWorkflow.metaInPorts = {
      ports: [dummy],
    };
    activeWorkflow.metaOutPorts = {
      ports: [dummy, dummy],
    };
    doShallowMount();
    expect(wrapper.findAllComponents(MetaNodePortBar).length).toBe(2);
    let inBar = wrapper.findAllComponents(MetaNodePortBar).at(0);
    expect(inBar.props("type")).toBe("in");
    expect(inBar.props("ports")).toEqual([dummy]);
    expect(inBar.props("containerId")).toBe("metanode");

    let outBar = wrapper.findAllComponents(MetaNodePortBar).at(1);
    expect(outBar.props("type")).toBe("out");
    expect(outBar.props("ports")).toEqual([dummy, dummy]);
    expect(outBar.props("containerId")).toBe("metanode");
  });
});
