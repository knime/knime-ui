import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import CloudComponentIcon from "@knime/styles/img/icons/cloud-component.svg";
import CloudWorkflowIcon from "@knime/styles/img/icons/cloud-workflow.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import CloseButton from "@/components/common/CloseButton.vue";
import AppHeaderTab from "../AppHeaderTab.vue";

describe("AppHeaderTab.vue", () => {
  const doMount = (props = {}) => {
    const defaultProps = {
      name: "MockTab",
      projectId: "1",
      isActive: false,
      windowWidth: 1024,
      projectType: "Workflow",
      provider: "local",
    };

    return shallowMount(AppHeaderTab, { props: { ...defaultProps, ...props } });
  };

  it('should set the "active" class when the `isActive` prop is true', () => {
    const wrapper = doMount({ isActive: true });
    expect(wrapper.find(".tab-item").classes()).toContain("active");
  });

  describe("switch workflow", () => {
    it("should emit a switchWorkflow event when the tab is NOT active", () => {
      const wrapper = doMount({ projectId: "1" });

      wrapper.find(".tab-item").trigger("click");
      expect(wrapper.emitted("switchWorkflow")[0][0]).toBe("1");
    });

    it("should not emit a switchWorkflow event when the tab is active", () => {
      const wrapper = doMount({ projectId: "1", isActive: true });

      wrapper.find(".tab-item").trigger("click");
      expect(wrapper.emitted("switchWorkflow")).toBeUndefined();
    });
  });

  it("should emit a close-workflow event on middle click", async () => {
    const wrapper = doMount({ projectId: "1" });

    // testing click with middle click works best with triggering mouseup
    await wrapper.find(".tab-item").trigger("mouseup", { button: 1 });
    expect(wrapper.emitted("closeProject")[0][0]).toBe("1");
  });

  it("should emit a close-workflow event if the close button is pressed", async () => {
    const wrapper = doMount({ projectId: "1" });

    const stopPropagation = vi.fn();
    await wrapper
      .findComponent(CloseButton)
      .vm.$emit("close", { stopPropagation });

    expect(stopPropagation).toHaveBeenCalled();
    expect(wrapper.emitted("closeProject")[0][0]).toBe("1");
  });

  describe("truncates the workflow name", () => {
    const longName = `
            03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_
            Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_En
            gine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transfo
            rm_Using_Rule_Engine_and_String_Manipulation
        `.trim();

    it.each([
      // [viewport size, max characters]
      [400, 10],
      [700, 20],
      [1000, 50],
      [1366, 100],
      [1800, 150],
      [2200, 200],
      [3000, 256],
    ])(
      "truncates the name for a %spx width to a max of %s characters long",
      (width, maxChars) => {
        window.innerWidth = width;

        const wrapper = doMount({ name: longName, windowWidth: width });

        const nameElement = wrapper.find(".text");

        // +2 to account for the " …"
        expect(nameElement.text().length).toBe(maxChars + 2);
      },
    );
  });

  it("should show the workflow icon when a workflow is loaded for local space", () => {
    const wrapper = doMount({ projectType: "Workflow", provider: "local" });

    expect(wrapper.findComponent(WorkflowIcon).exists()).toBe(true);
    expect(wrapper.findComponent(NodeWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudComponentIcon).exists()).toBe(false);
  });

  it("should show the component icon when a component is loaded for local space", () => {
    const wrapper = doMount({ projectType: "Component", provider: "local" });

    expect(wrapper.findComponent(WorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(NodeWorkflowIcon).exists()).toBe(true);
    expect(wrapper.findComponent(CloudWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudComponentIcon).exists()).toBe(false);
  });

  it("should show the workflow icon when a workflow is loaded", () => {
    const wrapper = doMount({ projectType: "Workflow", provider: "hub" });

    expect(wrapper.findComponent(WorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(NodeWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudWorkflowIcon).exists()).toBe(true);
    expect(wrapper.findComponent(CloudComponentIcon).exists()).toBe(false);
  });

  it("should show the component icon when a component is loaded", () => {
    const wrapper = doMount({ projectType: "Component", provider: "hub" });

    expect(wrapper.findComponent(WorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(NodeWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudWorkflowIcon).exists()).toBe(false);
    expect(wrapper.findComponent(CloudComponentIcon).exists()).toBe(true);
  });
});
