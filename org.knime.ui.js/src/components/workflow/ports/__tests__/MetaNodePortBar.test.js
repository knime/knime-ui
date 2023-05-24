import { expect, describe, beforeEach, it } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { $bus } from "@/plugins/event-bus";

import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import NodeConnectorDetection from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import NodePort from "../NodePort/NodePort.vue";
import MetaNodePortBar from "../MetaNodePortBar.vue";

describe("MetaNodePortBar.vue", () => {
  let props, doMount, wrapper, $store;
  const x = 222;
  const y = 123;
  const height = 549;

  beforeEach(() => {
    wrapper = null;
    props = {
      position: { x, y },
      ports: [],
      containerId: "metanode:1",
    };
    $store = mockVuexStore({
      canvas: {
        state: {},
        getters: {
          contentBounds() {
            return {
              left: 0,
              top: 0,
              width: 500,
              height,
            };
          },
        },
      },
    });

    doMount = () => {
      wrapper = mount(MetaNodePortBar, {
        props,
        global: {
          mocks: { $shapes, $colors, $bus },
          plugins: [$store],
          stubs: { NodePort: true },
        },
      });
    };
  });

  describe.each(["in", "out"])('type "%s"', (type) => {
    beforeEach(() => {
      props.type = type;
    });

    it("renders a bar", () => {
      doMount();

      // global positioning
      expect(wrapper.find("g").attributes("transform")).toBe(
        `translate(${x}, ${y})`
      );

      // visible port bar
      let portBar = wrapper.find(".port-bar");
      expect(Number(portBar.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth
      );
      expect(Number(portBar.attributes("height"))).toEqual(height);
      if (type === "in") {
        expect(Number(portBar.attributes("x"))).toEqual(
          -$shapes.metaNodeBarWidth
        );
      } else {
        expect(Number(portBar.attributes("x"))).toBe(0);
      }

      // invisible hover-area
      let hoverArea = wrapper.find(".hover-area");
      expect(Number(hoverArea.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2
      );
      expect(Number(hoverArea.attributes("height"))).toEqual(height);
      if (type === "in") {
        expect(Number(hoverArea.attributes("x"))).toEqual(
          -$shapes.metaNodeBarWidth - $shapes.metaNodeBarHorizontalPadding
        );
      } else {
        expect(Number(hoverArea.attributes("x"))).toEqual(
          -$shapes.metaNodeBarHorizontalPadding
        );
      }
    });

    it("renders ports", () => {
      props.ports = [
        {
          index: 0,
          type: "type0",
        },
        {
          index: 1,
          type: "type1",
        },
      ];
      doMount();

      let ports = wrapper.findAllComponents(NodePort);
      let [port0, port1] = ports;

      expect(ports.length).toBe(2);

      expect(port0.props()).toStrictEqual(
        expect.objectContaining({
          port: props.ports[0],
          direction: type === "in" ? "out" : "in",
          nodeId: "metanode:1",
          relativePosition: [
            ($shapes.portSize / 2) * (type === "in" ? 1 : -1),
            549 / (ports.length + 1),
          ],
          targeted: false,
        })
      );

      expect(port1.props()).toStrictEqual(
        expect.objectContaining({
          port: props.ports[1],
          direction: type === "in" ? "out" : "in",
          nodeId: "metanode:1",
          relativePosition: [
            ($shapes.portSize / 2) * (type === "in" ? 1 : -1),
            (2 * 549) / (ports.length + 1),
          ],
          targeted: false,
        })
      );
    });

    it("sets target port", async () => {
      props.ports = [
        {
          index: 0,
          type: "type0",
        },
        {
          index: 1,
          type: "type1",
        },
      ];
      doMount();

      let ports = wrapper.findAllComponents(NodePort);
      let [port0, port1] = ports;

      expect(port0.props("targeted")).toBeFalsy();
      expect(port1.props("targeted")).toBeFalsy();

      // set target port 0
      wrapper.findComponent(NodeConnectorDetection).setData({
        targetPort: {
          index: 0,
        },
      });
      await Vue.nextTick();
      expect(port0.props("targeted")).toBe(true);
      expect(port1.props("targeted")).toBeFalsy();

      // set target port 1
      wrapper.findComponent(NodeConnectorDetection).setData({
        targetPort: {
          index: 1,
        },
      });
      await Vue.nextTick();
      expect(port0.props("targeted")).toBeFalsy();
      expect(port1.props("targeted")).toBe(true);
    });
  });
});
