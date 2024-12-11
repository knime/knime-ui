import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import NodeTorsoMetanode from "../NodeTorsoMetanode.vue";

describe("State of Metanode", () => {
  const mount = (state) =>
    shallowMount(NodeTorsoMetanode, {
      props: { executionState: state },
      global: { mocks: { $colors } },
    });

  it("iDLE: draws no status", () => {
    const wrapper = mount("IDLE");
    expect(wrapper.findAll("polygon, polyline").length).toBe(0);
  });

  it("eXECUTED: draws check mark", () => {
    const wrapper = mount("EXECUTED");
    expect(wrapper.findAll("polygon, polyline").length).toBe(1);
    expect(wrapper.find("polyline").exists()).toBe(true);
  });

  it("eXECUTING: draws double arrow", () => {
    const wrapper = mount("EXECUTING");
    expect(wrapper.findAll("polygon, polyline").length).toBe(1);
    expect(wrapper.find("polygon").exists()).toBe(true);
  });
});
