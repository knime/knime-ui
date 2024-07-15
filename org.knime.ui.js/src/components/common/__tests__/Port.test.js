import { expect, describe, beforeEach, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import PortIcon from "webapps-common/ui/components/node/PortIcon.vue";
import Port from "../Port.vue";

import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

describe("Port", () => {
  let wrapper, props, storeConfig, doShallowMount, $store;
  const FLOW_VARIABLE = "FV";
  const TABLE = "TA";
  const OTHER = "OT";

  describe.each([
    ["FV", "flowVariable", $colors.portColors.flowVariable],
    ["TA", "table", $colors.portColors.table],
    ["OT", "other", "#123442"],
  ])("port (%s)", (typeId, portKind, portColor) => {
    beforeEach(() => {
      wrapper = null;
      props = {
        port: {
          optional: false,
          inactive: false,
          index: 0,
          typeId,
        },
      };
      storeConfig = {
        application: {
          state: {
            availablePortTypes: {
              [TABLE]: {
                kind: "table",
                name: "Data",
              },
              [FLOW_VARIABLE]: {
                kind: "flowVariable",
                name: "Flow Variable",
              },
              [OTHER]: {
                kind: "other",
                color: "#123442",
                name: "Something",
              },
            },
          },
        },
      };
      doShallowMount = () => {
        $store = mockVuexStore(storeConfig);
        wrapper = shallowMount(Port, {
          props,
          global: { plugins: [$store], mocks: { $shapes, $colors } },
        });
      };
    });

    describe("renders default", () => {
      beforeEach(() => {
        doShallowMount();
      });

      it("renders correct port", () => {
        const { color, type } = wrapper.findComponent(PortIcon).props();
        expect(type).toBe(portKind);
        expect(color).toBe(portColor);
      });

      it("not inactive", () => {
        expect(wrapper.find("path").exists()).toBe(false);
      });

      it("renders mandatory (filled)", () => {
        expect(wrapper.findComponent(PortIcon).props().filled).toBe(true);
      });
    });

    it("renders inactive port", () => {
      props.port.inactive = true;
      doShallowMount();

      expect(wrapper.findAll("path").length).toBe(2);
    });

    it("renders optional port", () => {
      props.port.optional = true;
      props.port.index = 1;
      doShallowMount();

      const { filled } = wrapper.findComponent(PortIcon).props();
      expect(filled).toBe(false);
    });

    if (portKind === "flowVariable") {
      it("always renders filled Mickey Mouse ears", () => {
        props.port.optional = true;
        props.port.index = 0;
        doShallowMount();

        const { filled } = wrapper.findComponent(PortIcon).props();
        expect(filled).toBe(true);
      });
    }

    it.each(["IDLE"])("draws traffic light for state %s (red)", (state) => {
      props.port.nodeState = state;
      doShallowMount();

      let { fill: bgColor } = wrapper.findAll("g g circle").at(1).attributes();
      let { d, transform } = wrapper.find("g g path").attributes();

      expect(bgColor).toBe($colors.trafficLight.red);
      expect(d).not.toContain("h");
      expect(transform).toBeUndefined();
    });

    it.each(["CONFIGURED", "QUEUED"])(
      "draws traffic light for state %s (yellow)",
      (state) => {
        props.port.nodeState = state;
        doShallowMount();

        let { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)
          .attributes();
        let { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.yellow);
        expect(d).toContain("h");
        expect(transform).toBe("rotate(90)");
      },
    );

    it.each(["HALTED", "EXECUTED"])(
      "draws traffic light for state %s (green)",
      (state) => {
        props.port.nodeState = state;
        doShallowMount();

        let { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)
          .attributes();
        let { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.green);
        expect(d).toContain("h");
        expect(transform).toBeUndefined();
      },
    );

    it.each(["EXECUTING"])(
      "draws traffic light for state %s (blue)",
      (state) => {
        props.port.nodeState = state;
        doShallowMount();

        let { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)
          .attributes();
        let { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.blue);
        expect(d).not.toContain("h");
        expect(transform).toBeUndefined();
      },
    );

    describe("selection", () => {
      it("should display the port-outline when selected", async () => {
        doShallowMount();
        await wrapper.setProps({ isSelected: true });

        expect(wrapper.find(".port-outline").exists()).toBe(true);
      });
    });
  });
});
