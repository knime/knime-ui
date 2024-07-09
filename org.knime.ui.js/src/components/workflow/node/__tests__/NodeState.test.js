import { expect, describe, beforeEach, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";

import { muteConsole } from "@knime/utils/test-utils";

import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import NodeState from "../NodeState.vue";

describe("NodeState.vue", () => {
  const provide = {
    anchorPoint: { x: 123, y: 456 },
  };
  let props, wrapper, doShallowMount, $store;

  beforeEach(() => {
    props = {
      executionState: null,
      progress: null,
      error: null,
      warning: null,
      issue: null,
      resolutions: [],
    };

    doShallowMount = () => {
      wrapper = shallowMount(NodeState, {
        props,
        global: {
          plugins: $store ? [$store] : [],
          mocks: { $shapes, $colors },
          provide,
        },
      });
    };
  });

  const getTrafficLights = () => {
    let lights = wrapper.findAll("g g circle").map((el) => {
      const { fill, stroke } = el.attributes();
      return { fill, stroke };
    });
    return lights;
  };

  it.each([
    [
      "IDLE",
      [
        { fill: $colors.trafficLight.red, stroke: undefined },
        { fill: "none", stroke: $colors.darkeningMask },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
      ],
    ],
    [
      "CONFIGURED",
      [
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.yellow, stroke: undefined },
        { fill: "none", stroke: $colors.darkeningMask },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
      ],
    ],
    [
      "EXECUTED",
      [
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.green, stroke: undefined },
        { fill: "none", stroke: $colors.darkeningMask },
      ],
    ],
    // TODO NXT-279: for now halted is the same state as executed
    [
      "HALTED",
      [
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.green, stroke: undefined },
        { fill: "none", stroke: $colors.darkeningMask },
      ],
    ],
    [
      null,
      [
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
        { fill: $colors.trafficLight.inactive, stroke: undefined },
        { fill: "none", stroke: $colors.trafficLight.inactiveBorder },
      ],
    ],
    ["any other state", []],
  ])("draws traffic lights for state %s", (state, style) => {
    if (state) {
      props.executionState = state;
    }
    muteConsole(doShallowMount);
    expect(getTrafficLights()).toStrictEqual(style);
  });

  it("shows all null state", () => {
    expect(wrapper.text()).toBe("");
    expect(wrapper.find(".warning").exists()).toBe(false);
    expect(wrapper.find(".error").exists()).toBe(false);
    expect(wrapper.find(".progress-circle").exists()).toBe(false);
  });

  it('shows "queued"', () => {
    props.executionState = "QUEUED";
    doShallowMount();
    expect(wrapper.text()).toBe("queued");
  });

  it('shows "paused"', () => {
    props.executionState = "QUEUED";
    props.loopStatus = "PAUSED";
    doShallowMount();
    expect(wrapper.text()).toBe("paused");
  });

  it("shows dancing ball", () => {
    props.executionState = "EXECUTING";
    props.progress = null;
    doShallowMount();

    expect(wrapper.find(".progress-circle").exists()).toBe(true);
    expect(wrapper.text()).toBe("");
  });

  it("shows progress percentage", () => {
    props.executionState = "EXECUTING";
    props.progress = 0.5178;
    doShallowMount();

    expect(wrapper.find(".progress-circle").exists()).toBe(false);
    expect(wrapper.find("[clip-path]").attributes("clip-path")).toBe(
      "polygon(0 0, 51.78% 0, 51.78% 100%, 0 100%)",
    );
    expect(wrapper.text()).toMatch("51%");
  });

  it("handles invalid progress percentage", () => {
    props.executionState = "EXECUTING";
    props.progress = 1.234; // 123.4%
    doShallowMount();

    expect(wrapper.find(".progress-circle").exists()).toBe(false);
    expect(wrapper.find("[clip-path]").attributes("clip-path")).toBe(
      "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    );
    expect(wrapper.text()).toMatch("100%");
  });

  it("shows error indicator", () => {
    props.error = "error message";
    props.warning = "warning message";
    doShallowMount();

    expect(wrapper.find(".error").exists()).toBe(true);
    expect(wrapper.find(".warning").exists()).toBe(false);
  });

  it("shows warning indicator", () => {
    props.warning = "warning message";
    doShallowMount();

    expect(wrapper.find(".warning").exists()).toBe(true);
    expect(wrapper.find(".error").exists()).toBe(false);
  });

  describe("tooltips", () => {
    let currentTooltip;

    beforeEach(() => {
      $store = mockVuexStore({
        workflow: {
          mutations: {
            setTooltip(state, tooltip) {
              currentTooltip = tooltip;
            },
          },
        },
      });
      vi.useFakeTimers();
    });

    it("shows no tooltips by default", async () => {
      doShallowMount();
      wrapper.find("g").trigger("mouseenter");
      await Vue.nextTick();
      expect(currentTooltip).toBeFalsy();
    });

    it("shows tooltips on error", async () => {
      props.error = "this is an error";
      doShallowMount();

      wrapper.find("g").trigger("mouseenter");
      vi.runAllTimers();
      await Vue.nextTick();

      expect(currentTooltip).toStrictEqual({
        anchorPoint: { x: 123, y: 456 },
        text: "this is an error",
        type: "error",
        position: {
          x: 16,
          y: 52,
        },
        hoverable: true,
        gap: 10,
        issue: null,
        resolutions: [],
      });

      wrapper.find("g").trigger("mouseleave");
      await Vue.nextTick();
      expect(currentTooltip).toBeFalsy();
    });

    it("shows tooltips with error/warning, issue and resolution", async () => {
      props.error = "this is an error";
      props.issue = "this is the issue";
      props.resultions = ["this is a potental resolution"];
      doShallowMount();

      wrapper.find("g").trigger("mouseenter");
      vi.runAllTimers();
      await Vue.nextTick();

      expect(currentTooltip).toStrictEqual({
        anchorPoint: { x: 123, y: 456 },
        text: "this is an error",
        type: "error",
        position: {
          x: 16,
          y: 52,
        },
        hoverable: true,
        gap: 10,
        issue: props.issue,
        resolutions: props.resolutions,
      });

      wrapper.find("g").trigger("mouseleave");
      await Vue.nextTick();
      expect(currentTooltip).toBeFalsy();
    });

    it("updates tooltips on data change", async () => {
      props.progressMessages = ["Progress"];
      doShallowMount();

      wrapper.find("g").trigger("mouseenter");
      await Vue.nextTick();

      wrapper.setProps({
        progressMessages: ["mo Progress", "Level 2"],
      });
      await Vue.nextTick();

      vi.runAllTimers();

      expect(currentTooltip).toStrictEqual({
        anchorPoint: { x: 123, y: 456 },
        text: "mo Progress – Level 2",
        position: {
          x: 16,
          y: 52,
        },
        hoverable: true,
        gap: 10,
        issue: null,
        resolutions: [],
      });
    });
  });
});
