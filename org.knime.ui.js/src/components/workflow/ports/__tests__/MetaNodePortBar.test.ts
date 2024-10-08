/* eslint-disable vitest/no-conditional-tests */
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import type { NodePort as NodePortType } from "@/api/gateway-api/generated-api";
import ConnectorSnappingProvider from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import { $bus } from "@/plugins/event-bus";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { geometry } from "@/util/geometry";
import MetaNodePortBar from "../MetaNodePortBar.vue";
import NodePort from "../NodePort/NodePort.vue";

describe("MetaNodePortBar.vue", () => {
  const height = 549;

  const doMount = ({
    props = {},
    bounds = null,
  }: {
    props?: { ports?: Partial<NodePortType>[]; type?: "in" | "out" };
    bounds?: { height: number } | null;
  } = {}) => {
    const defaultProps = {
      ports: [],
      containerId: "metanode:1",
    };

    const $store = mockVuexStore({
      selection: selectionStore,
      workflow: workflowStore,
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

    const ports = props.ports ?? defaultProps.ports;

    $store.commit(
      "workflow/setActiveWorkflow",
      createWorkflow({
        metaInPorts: { ports, bounds },
        metaOutPorts: { ports, bounds },
      }),
    );

    $store.commit(
      "workflow/setCalculatedMetanodePortBarBounds",
      geometry.calculateMetaNodePortBarBounds(
        $store.state.workflow.activeWorkflow,
      ),
    );

    const wrapper = mount(MetaNodePortBar, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors, $bus },
        plugins: [$store],
        stubs: { NodePort: true },
      },
    });

    return { wrapper, $store };
  };

  describe.each(["in" as const, "out" as const])('type "%s"', (type) => {
    it("renders a portbar without bounds", () => {
      const { wrapper } = doMount({ props: { type } });

      const [x, y] = type === "in" ? [-100, -61] : [900, -61];

      // global positioning
      expect(wrapper.find("g").attributes("transform")).toBe(
        `translate(${x}, ${y})`,
      );

      // visible port bar
      const portBar = wrapper.find(".port-bar");
      expect(Number(portBar.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth,
      );
      expect(Number(portBar.attributes("height"))).toEqual(
        $shapes.defaultMetaNodeBarHeight,
      );

      const expectedX = type === "in" ? -$shapes.metaNodeBarWidth : 0;
      expect(Number(portBar.attributes("x"))).toEqual(expectedX);

      // invisible hover-area
      const hoverArea = wrapper.find(".hover-area");
      expect(Number(hoverArea.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2,
      );
      expect(Number(hoverArea.attributes("height"))).toEqual(
        $shapes.defaultMetaNodeBarHeight,
      );
      const expectedHoverAreaX =
        type === "in"
          ? -$shapes.metaNodeBarWidth - $shapes.metaNodeBarHorizontalPadding
          : -$shapes.metaNodeBarHorizontalPadding;

      expect(Number(hoverArea.attributes("x"))).toEqual(expectedHoverAreaX);
    });

    it("renders a portbar with bounds", () => {
      const bounds = { x: 100, y: 100, width: 10, height: 300 };
      const { wrapper } = doMount({ props: { type }, bounds });

      // global positioning
      expect(wrapper.find("g").attributes("transform")).toBe(
        "translate(100, 100)",
      );

      // visible port bar
      const portBar = wrapper.find(".port-bar");
      expect(Number(portBar.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth,
      );
      expect(Number(portBar.attributes("height"))).toEqual(bounds.height);

      const expectedX = type === "in" ? -$shapes.metaNodeBarWidth : 0;
      expect(Number(portBar.attributes("x"))).toEqual(expectedX);

      // invisible hover-area
      const hoverArea = wrapper.find(".hover-area");
      expect(Number(hoverArea.attributes("width"))).toEqual(
        $shapes.metaNodeBarWidth + $shapes.metaNodeBarHorizontalPadding * 2,
      );
      expect(Number(hoverArea.attributes("height"))).toEqual(bounds.height);
      const expectedHoverAreaX =
        type === "in"
          ? -$shapes.metaNodeBarWidth - $shapes.metaNodeBarHorizontalPadding
          : -$shapes.metaNodeBarHorizontalPadding;

      expect(Number(hoverArea.attributes("x"))).toEqual(expectedHoverAreaX);
    });

    it("selects port bar on click", async () => {
      const bounds = { x: 100, y: 100, width: 10, height: 300 };
      const { wrapper, $store } = doMount({ props: { type }, bounds });

      await wrapper.find(".hover-area").trigger("click");

      expect($store.state.selection.selectedMetanodePortBars).toStrictEqual({
        [type]: true,
      });

      expect(wrapper.find(".port-bar-selected").exists()).toBe(true);
    });

    it("renders ports", () => {
      const ports = [
        {
          index: 0,
          type: "type0",
        },
        {
          index: 1,
          type: "type1",
        },
      ];
      const { wrapper } = doMount({ props: { ports, type } });

      const nodePorts = wrapper.findAllComponents(NodePort);
      const [port0, port1] = nodePorts;

      expect(ports.length).toBe(2);

      expect(port0.props()).toStrictEqual(
        expect.objectContaining({
          port: ports.at(0),
          direction: type === "in" ? "out" : "in",
          nodeId: "metanode:1",
          relativePosition: [
            ($shapes.portSize / 2) * (type === "in" ? 1 : -1),
            $shapes.defaultMetaNodeBarHeight / (ports.length + 1),
          ],
          targeted: false,
        }),
      );

      expect(port1.props()).toStrictEqual(
        expect.objectContaining({
          port: ports.at(1),
          direction: type === "in" ? "out" : "in",
          nodeId: "metanode:1",
          relativePosition: [
            ($shapes.portSize / 2) * (type === "in" ? 1 : -1),
            (2 * $shapes.defaultMetaNodeBarHeight) / (ports.length + 1),
          ],
          targeted: false,
        }),
      );
    });

    it("sets target port", async () => {
      const ports = [
        {
          index: 0,
          type: "type0",
        },
        {
          index: 1,
          type: "type1",
        },
      ];
      const { wrapper } = doMount({ props: { ports, type } });

      const nodePorts = wrapper.findAllComponents(NodePort);
      const [port0, port1] = nodePorts;

      expect(port0.props("targeted")).toBeFalsy();
      expect(port1.props("targeted")).toBeFalsy();

      // set target port 0
      wrapper.findComponent(ConnectorSnappingProvider).setData({
        targetPort: {
          index: 0,
        },
      });
      await nextTick();
      expect(port0.props("targeted")).toBe(true);
      expect(port1.props("targeted")).toBeFalsy();

      // set target port 1
      wrapper.findComponent(ConnectorSnappingProvider).setData({
        targetPort: {
          index: 1,
        },
      });
      await nextTick();
      expect(port0.props("targeted")).toBeFalsy();
      expect(port1.props("targeted")).toBe(true);
    });
  });
});
