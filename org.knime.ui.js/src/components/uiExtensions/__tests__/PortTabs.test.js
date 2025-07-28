import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import { TabBar } from "@knime/components";
import FlowVarTabIcon from "@knime/styles/img/icons/expose-flow-variables.svg";

import portIcon from "@/components/common/PortIconRenderer";
import { mockStores } from "@/test/utils/mockStores";
import PortTabs, { portIconSize } from "../PortTabs.vue";

vi.mock("@/components/common/PortIconRenderer", () => ({ default: vi.fn() }));

describe("PortTabs.vue", () => {
  const doShallowMount = (props = {}) => {
    const mockedStores = mockStores();

    return shallowMount(PortTabs, {
      global: { plugins: [mockedStores.testingPinia] },
      props,
    });
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes "modelValue" through', () => {
    const wrapper = doShallowMount({
      modelValue: "5",
      node: { outPorts: [] },
    });

    expect(wrapper.findComponent(TabBar).props("modelValue")).toBe("5");
  });

  it('emits an "update:modelValue"-event if TabBar changes', async () => {
    const wrapper = doShallowMount({
      modelValue: "5",
      node: { outPorts: [] },
    });

    wrapper.findComponent(TabBar).vm.$emit("update:modelValue", 1);
    await nextTick();
    expect(wrapper.emitted("update:modelValue")[0]).toStrictEqual([1]);
  });

  it("arranges tabs for metanode", () => {
    portIcon
      .mockReturnValueOnce("portIcon-fv")
      .mockReturnValueOnce("portIcon-1");
    const wrapper = doShallowMount({
      node: {
        kind: "metanode",
        outPorts: [
          {
            index: 0,
            name: "flowVariable port",
          },
          {
            index: 1,
            name: "triangle port",
          },
        ],
      },
    });

    expect(wrapper.findComponent(TabBar).props("possibleValues")).toStrictEqual(
      [
        { value: "0", label: "0: flowVariable port", icon: "portIcon-fv" },
        { value: "1", label: "1: triangle port", icon: "portIcon-1" },
      ],
    );
    expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
  });

  it("displays view tab as the first tab", () => {
    portIcon.mockReturnValue("portIcon");

    const wrapper = doShallowMount({
      hasViewTab: true,
      node: {
        kind: "node",
        outPorts: [
          {
            index: 0,
            name: "flowVariable port",
          },
          {
            index: 1,
            name: "triangle port",
          },
        ],
      },
    });

    expect(wrapper.findComponent(TabBar).props().possibleValues).toStrictEqual([
      { value: "view", label: "View", icon: expect.anything() },
      { value: "1", label: "1: triangle port", icon: expect.anything() },
      { value: "0", label: "Flow Variables", icon: expect.anything() },
    ]);
    expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
  });

  it("arranges tabs for normal node", () => {
    portIcon.mockReturnValueOnce("portIcon-1");
    const wrapper = doShallowMount({
      node: {
        kind: "node",
        outPorts: [
          {
            index: 0,
            name: "flowVariable port",
          },
          {
            index: 1,
            name: "triangle port",
          },
        ],
      },
    });

    expect(wrapper.findComponent(TabBar).props("possibleValues")).toStrictEqual(
      [
        { value: "1", label: "1: triangle port", icon: "portIcon-1" },
        { value: "0", label: "Flow Variables", icon: FlowVarTabIcon },
      ],
    );
    expect(portIcon).toHaveBeenCalledWith(expect.anything(), portIconSize);
  });
});
