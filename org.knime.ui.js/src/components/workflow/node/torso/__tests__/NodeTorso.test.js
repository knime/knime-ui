import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";

import { NodeTorsoNormal } from "@knime/components";

import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

import NodeTorso from "../NodeTorso.vue";
import NodeTorsoMissing from "../NodeTorsoMissing.vue";
import NodeTorsoUnknown from "../NodeTorsoUnknown.vue";
import NodeTorsoMetanode from "../NodeTorsoMetanode.vue";
import NodeTorsoForbidden from "../NodeTorsoForbidden.vue";

describe("NodeTorso.vue", () => {
  const doShallowMount = (props, { writable = true } = {}) => {
    const $store = mockVuexStore({
      workflow: {
        getters: {
          isWritable() {
            return writable;
          },
        },
      },
    });

    return shallowMount(NodeTorso, {
      props,
      global: {
        mocks: {
          $shapes,
          $colors,
          $store,
        },
      },
    });
  };

  it("sets background color", () => {
    let wrapper = doShallowMount({
      kind: "node",
      type: "Sink",
      icon: "data:image/icon",
    });
    expect(wrapper.findComponent(NodeTorsoNormal).props()).toStrictEqual({
      type: "Sink",
      isComponent: false,
      icon: "data:image/icon",
    });
  });

  it("renders component", () => {
    let wrapper = doShallowMount({
      kind: "component",
      type: "Sink",
      icon: "data:image/icon",
    });
    expect(wrapper.findComponent(NodeTorsoNormal).props()).toStrictEqual({
      type: "Sink",
      isComponent: true,
      icon: "data:image/icon",
    });
  });

  it("renders metanodes", () => {
    let wrapper = doShallowMount({
      kind: "metanode",
    });
    expect(wrapper.findComponent(NodeTorsoMetanode).exists()).toBeTruthy();
  });

  it("renders metanode state", () => {
    let wrapper = doShallowMount({
      kind: "metanode",
      executionState: "EXECUTED",
    });
    expect(
      wrapper.findComponent(NodeTorsoMetanode).props("executionState"),
    ).toBe("EXECUTED");
  });

  it.each(["node", "component"])("renders missing %s", (kind) => {
    let wrapper = doShallowMount({
      type: "Missing",
      kind,
    });
    expect(wrapper.findComponent(NodeTorsoMissing).exists()).toBeTruthy();
    expect(wrapper.findComponent(NodeTorsoNormal).exists()).toBeFalsy();
  });

  it.each(["node", "component"])("renders forbidden %s", (kind) => {
    let wrapper = doShallowMount({
      type: "Forbidden",
      kind,
    });
    expect(wrapper.findComponent(NodeTorsoForbidden).exists()).toBeTruthy();
    expect(wrapper.findComponent(NodeTorsoNormal).exists()).toBeFalsy();
  });

  it.each(["node", "component"])(
    "renders buggy %ss (during development)",
    (type) => {
      let wrapper = doShallowMount({
        type: "Unknown",
        kind: type,
      });
      expect(wrapper.findComponent(NodeTorsoUnknown).exists()).toBeTruthy();
      expect(wrapper.findComponent(NodeTorsoNormal).exists()).toBeFalsy();
    },
  );
});
