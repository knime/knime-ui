import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WorkflowMonitorMessage from "../WorkflowMonitorMessage.vue";
import {
  createNodeTemplateWithExtendedPorts,
  createWorkflowMonitorMessage,
} from "@/test/factories";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";

describe("WorkflowMonitorMessage.vue", () => {
  type ComponentProps = InstanceType<typeof WorkflowMonitorMessage>["$props"];

  const defaultProps: ComponentProps = {
    message: createWorkflowMonitorMessage(),
  };

  const doMount = ({ props }: { props?: ComponentProps } = {}) => {
    const wrapper = mount(WorkflowMonitorMessage, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render message", () => {
    const nodeTemplate = createNodeTemplateWithExtendedPorts();
    const { wrapper } = doMount({
      props: {
        nodeTemplate,
      },
    });

    expect(wrapper.find(".nested-indicator").exists()).toBe(false);
    expect(wrapper.findComponent(NodePreview).exists()).toBe(true);
    expect(wrapper.findComponent(NodePreview).props("type")).toBe(
      nodeTemplate.type,
    );
    expect(wrapper.findComponent(NodePreview).props("inPorts")).toEqual(
      nodeTemplate.inPorts,
    );
    expect(wrapper.findComponent(NodePreview).props("outPorts")).toEqual(
      nodeTemplate.outPorts,
    );
    expect(wrapper.findComponent(NodePreview).props("icon")).toEqual(
      nodeTemplate.icon,
    );
    expect(wrapper.find(".content").text()).toMatch(
      defaultProps.message!.message,
    );
    expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
  });

  it("should render nested indicator", () => {
    const nodeTemplate = createNodeTemplateWithExtendedPorts();
    const { wrapper } = doMount({
      props: {
        nodeTemplate,
        nested: true,
      },
    });

    expect(wrapper.find(".nested-indicator").exists()).toBe(true);
  });

  it("should render as a skeleton", () => {
    const { wrapper } = doMount({
      props: {
        skeleton: true,
        message: null,
        nodeTemplate: null,
      },
    });

    expect(wrapper.findComponent(FunctionButton).exists()).toBe(false);
    expect(wrapper.findComponent(NodePreview).exists()).toBe(false);
    expect(wrapper.find(".content").text()).toBe("");
  });

  it("should render a skeleton placeholder for the node preview", () => {
    const { wrapper } = doMount({
      props: {
        nodeTemplate: null,
      },
    });

    expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
    expect(wrapper.findComponent(NodePreview).exists()).toBe(false);
    expect(wrapper.find(".content").text()).toBe(defaultProps.message?.message);
  });

  it("should emit a 'showIssue' event", async () => {
    const { wrapper } = doMount({
      props: {
        nodeTemplate: null,
      },
    });

    await wrapper.findComponent(FunctionButton).vm.$emit("click");

    expect(wrapper.emitted("showIssue")).toBeDefined();
  });
});
