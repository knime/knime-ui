import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { PortIcon } from "@knime/components";

import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import Port from "../Port.vue";

describe("Port", () => {
  const FLOW_VARIABLE = "FV";
  const TABLE = "TA";
  const OTHER = "OT";

  describe.each([
    ["FV", "flowVariable", $colors.portColors.flowVariable],
    ["TA", "table", $colors.portColors.table],
    ["OT", "other", "#123442"],
  ])("port (%s)", (typeId, portKind, portColor) => {
    const defaultProps = {
      port: {
        optional: false,
        inactive: false,
        index: 0,
        typeId,
      },
    };

    type MountOpts = {
      props?: Partial<InstanceType<typeof Port>>["$props"];
    };

    const doShallowMount = ({ props }: MountOpts = {}) => {
      const mockedStores = mockStores();

      mockedStores.applicationStore.availablePortTypes = {
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
      };

      const wrapper = shallowMount(Port, {
        props: { ...defaultProps, ...props },
        global: {
          plugins: [mockedStores.testingPinia],
          mocks: { $shapes, $colors },
        },
      });

      return { wrapper, mockedStores };
    };

    describe("renders default", () => {
      it("renders correct port", () => {
        const { wrapper } = doShallowMount();
        const { color, type } = wrapper.findComponent(PortIcon).props();
        expect(type).toBe(portKind);
        expect(color).toBe(portColor);
      });

      it("not inactive", () => {
        const { wrapper } = doShallowMount();
        expect(wrapper.find("path").exists()).toBe(false);
      });

      it("renders mandatory (filled)", () => {
        const { wrapper } = doShallowMount();
        expect(wrapper.findComponent(PortIcon).props().filled).toBe(true);
      });
    });

    it("renders inactive port", () => {
      const { wrapper } = doShallowMount({
        props: {
          port: { ...defaultProps.port, inactive: true },
        },
      });

      expect(wrapper.findAll("path").length).toBe(2);
    });

    it("renders optional port", () => {
      const { wrapper } = doShallowMount({
        props: {
          port: { ...defaultProps.port, optional: true, index: 1 },
        },
      });

      const { filled } = wrapper.findComponent(PortIcon).props();
      expect(filled).toBe(false);
    });

    if (portKind === "flowVariable") {
      // eslint-disable-next-line vitest/no-conditional-tests
      it("always renders filled Mickey Mouse ears", () => {
        const { wrapper } = doShallowMount({
          props: {
            port: { ...defaultProps.port, optional: true, index: 0 },
          },
        });

        const { filled } = wrapper.findComponent(PortIcon).props();
        expect(filled).toBe(true);
      });
    }

    it.each(["IDLE"])("draws traffic light for state %s (red)", (state) => {
      const { wrapper } = doShallowMount({
        props: {
          port: { ...defaultProps.port, nodeState: state },
        },
      });

      const { fill: bgColor } = wrapper
        .findAll("g g circle")
        .at(1)!
        .attributes();
      const { d, transform } = wrapper.find("g g path").attributes();

      expect(bgColor).toBe($colors.trafficLight.red);
      expect(d).not.toContain("h");
      expect(transform).toBeUndefined();
    });

    it.each(["CONFIGURED", "QUEUED"])(
      "draws traffic light for state %s (yellow)",
      (state) => {
        const { wrapper } = doShallowMount({
          props: {
            port: { ...defaultProps.port, nodeState: state },
          },
        });

        const { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)!
          .attributes();
        const { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.yellow);
        expect(d).toContain("h");
        expect(transform).toBe("rotate(90)");
      },
    );

    it.each(["HALTED", "EXECUTED"])(
      "draws traffic light for state %s (green)",
      (state) => {
        const { wrapper } = doShallowMount({
          props: {
            port: { ...defaultProps.port, nodeState: state },
          },
        });

        const { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)!
          .attributes();
        const { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.green);
        expect(d).toContain("h");
        expect(transform).toBeUndefined();
      },
    );

    it.each(["EXECUTING"])(
      "draws traffic light for state %s (blue)",
      (state) => {
        const { wrapper } = doShallowMount({
          props: {
            port: { ...defaultProps.port, nodeState: state },
          },
        });

        const { fill: bgColor } = wrapper
          .findAll("g g circle")
          .at(1)!
          .attributes();
        const { d, transform } = wrapper.find("g g path").attributes();

        expect(bgColor).toBe($colors.trafficLight.blue);
        expect(d).not.toContain("h");
        expect(transform).toBeUndefined();
      },
    );

    describe("selection", () => {
      it("should display the port-outline when selected", async () => {
        const { wrapper } = doShallowMount();
        await wrapper.setProps({ isSelected: true });

        expect(wrapper.find(".port-outline").exists()).toBe(true);
      });
    });
  });
});
