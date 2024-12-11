import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import Port from "@/components/common/Port.vue";
import { createPort } from "@/test/factories";
import Connector from "../../connectors/Connector.vue";
import NodePortActiveConnector from "../NodePortActiveConnector.vue";
import NodePortActiveConnectorDecoration from "../NodePortActiveConnectorDecoration.vue";

describe("NodePortActiveConnector.vue", () => {
  type ComponentProps = InstanceType<typeof NodePortActiveConnector>["$props"];
  const defaultProps: ComponentProps = {
    port: createPort({ connectedVia: ["root:1_1"] }),
    dragConnector: {
      id: "drag-connector",
      absolutePoint: [10, 10],
      sourceNode: "root:1",
      sourcePort: 0,
      flowVariableConnection: false,
      allowedActions: { canDelete: false },
    },
    direction: "out",
    didDragToCompatibleTarget: false,
  };

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const wrapper = mount(NodePortActiveConnector, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          Connector: true,
          Port: true,
        },
      },
    });

    return { wrapper };
  };

  it("should render correctly when dragConnector is set", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(Connector).props()).toEqual(
      expect.objectContaining(defaultProps.dragConnector),
    );
    expect(wrapper.findComponent(Port).props("port")).toEqual(
      defaultProps.port,
    );
    expect(wrapper.findComponent(Port).attributes("transform")).toBe(
      "translate(10,10)",
    );
  });

  it("should show the port decoration", async () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
    ).toBe(true);

    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).props(),
    ).toEqual({
      position: defaultProps.dragConnector?.absolutePoint,
      nodeRelation: "SUCCESSORS",
    });

    // doesn't display when `didDragToCompatibleTarget` is true
    await wrapper.setProps({ didDragToCompatibleTarget: true });
    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
    ).toBe(false);

    await wrapper.setProps({ didDragToCompatibleTarget: false });
    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
    ).toBe(true);

    // doesn't display when `disableQuickAction` is true
    await wrapper.setProps({ disableQuickAction: true });
    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
    ).toBe(false);

    await wrapper.setProps({ disableQuickAction: false });
    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
    ).toBe(true);
  });

  describe("indicate replacement", () => {
    afterEach(() => {
      document.body.querySelector("[data-connector-id]")?.remove();
    });

    it("should indicate when dragging out of a connected input port", async () => {
      const { wrapper } = doMount({
        props: {
          direction: "in",
        },
      });

      const indicateReplacementEventHandler = vi.fn();
      const fakeRemoteConnector = document.createElement("div");
      fakeRemoteConnector.setAttribute("data-connector-id", "root:1_1");
      fakeRemoteConnector.addEventListener(
        "indicate-replacement",
        indicateReplacementEventHandler,
      );
      document.body.appendChild(fakeRemoteConnector);

      await wrapper.setProps({ showConnectionReplacement: true });

      expect(indicateReplacementEventHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ detail: { state: true } }),
      );

      await wrapper.setProps({ showConnectionReplacement: false });

      expect(indicateReplacementEventHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ detail: { state: false } }),
      );
    });

    it("should never indicate for output ports", async () => {
      const { wrapper } = doMount({
        props: {
          direction: "out",
        },
      });

      const indicateReplacementEventHandler = vi.fn();
      const fakeRemoteConnector = document.createElement("div");
      fakeRemoteConnector.setAttribute("data-connector-id", "root:1_1");
      fakeRemoteConnector.addEventListener(
        "indicate-replacement",
        indicateReplacementEventHandler,
      );
      document.body.appendChild(fakeRemoteConnector);

      await wrapper.setProps({ showConnectionReplacement: true });

      expect(indicateReplacementEventHandler).toHaveBeenCalledOnce();
    });

    it("should indicate replacement if dragConnector changes when dragging towards compatible targets", async () => {
      const { wrapper } = doMount({
        props: { didDragToCompatibleTarget: true },
      });

      const indicateReplacementEventHandler = vi.fn();
      const fakeRemoteConnector = document.createElement("div");
      fakeRemoteConnector.setAttribute("data-connector-id", "root:1_1");
      fakeRemoteConnector.addEventListener(
        "indicate-replacement",
        indicateReplacementEventHandler,
      );
      document.body.appendChild(fakeRemoteConnector);

      await wrapper.setProps({ dragConnector: null });
      expect(indicateReplacementEventHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ detail: { state: false } }),
      );
    });

    it("should prevent indicate replacement change when a quick action will be performed", async () => {
      const { wrapper } = doMount();

      const indicateReplacementEventHandler = vi.fn();
      const fakeRemoteConnector = document.createElement("div");
      fakeRemoteConnector.setAttribute("data-connector-id", "root:1_1");
      fakeRemoteConnector.addEventListener(
        "indicate-replacement",
        indicateReplacementEventHandler,
      );
      document.body.appendChild(fakeRemoteConnector);

      await wrapper.setProps({ dragConnector: null });
      expect(indicateReplacementEventHandler).not.toHaveBeenCalled();
    });
  });

  it("should set the node relation for the port decoration", async () => {
    const { wrapper } = doMount();

    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).props(),
    ).toEqual({
      position: defaultProps.dragConnector?.absolutePoint,
      nodeRelation: "SUCCESSORS",
    });

    await wrapper.setProps({ direction: "in" });
    expect(
      wrapper.findComponent(NodePortActiveConnectorDecoration).props(),
    ).toEqual({
      position: defaultProps.dragConnector?.absolutePoint,
      nodeRelation: "PREDECESSORS",
    });
  });
});
