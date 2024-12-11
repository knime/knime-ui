import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import NodeSelectionPlane from "../NodeSelectionPlane.vue";

describe("NodeSlectionPlane.vue", () => {
  const commonPlane = {
    width: 0,
    extraHeight: 20,
    position: {
      x: 50,
      y: 50,
    },
    kind: "node",
  };

  const doShallowMount = (props = {}) =>
    shallowMount(NodeSelectionPlane, {
      props: {
        ...commonPlane,
        ...props,
      },
      global: {
        mocks: {
          $shapes,
          $colors,
        },
      },
    });

  it("sets position of the selection plane", () => {
    const wrapper = doShallowMount();
    expect(wrapper.findComponent(NodeSelectionPlane).props()).toStrictEqual({
      width: 0,
      extraHeight: 20,
      kind: "node",
      showFocus: false,
      showSelection: true,
      position: {
        x: 50,
        y: 50,
      },
    });
  });

  it("renders selection plane", () => {
    const wrapper = doShallowMount();
    expect(wrapper.findComponent(NodeSelectionPlane).exists()).toBe(true);
    expect(wrapper.find('[data-test-id="focus-plane"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="selection-plane"]').exists()).toBe(
      true,
    );
  });

  it("renders focus plane", () => {
    const wrapper = doShallowMount({ showFocus: true, showSelection: false });
    expect(wrapper.findComponent(NodeSelectionPlane).exists()).toBe(true);
    expect(wrapper.find('[data-test-id="focus-plane"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="selection-plane"]').exists()).toBe(
      false,
    );
  });

  it("checks node measures with status bar", () => {
    let wrapper = doShallowMount();
    expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({
      height: 97,
      width: 100,
      x: -34,
      y: -39,
    });
  });

  it("honors width setting if its bigger then the default width", () => {
    let wrapper = doShallowMount({ width: 120 });
    expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({
      height: 97,
      width: 120,
      x: -44,
      y: -39,
    });
  });

  it("honors extraHeight", () => {
    let wrapper = doShallowMount({ extraHeight: 44 });
    expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({
      height: 121,
      width: 100,
      x: -34,
      y: -63,
    });
  });

  it("checks node measures without status bar", () => {
    let wrapper = doShallowMount({ kind: "metanode" });
    expect(wrapper.vm.nodeSelectionMeasures).toStrictEqual({
      height: 77,
      width: 100,
      x: -34,
      y: -39,
    });
  });
});
