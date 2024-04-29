import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import WorkflowMonitorFilters from "../WorkflowMonitorFilters.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

describe("WorkflowMonitorFilters.vue", () => {
  type ComponentProps = InstanceType<typeof WorkflowMonitorFilters>["$props"];
  const defaultProps: ComponentProps = {
    activeFilter: "SHOW_ERRORS",
  };

  const doMount = ({ props }: { props?: ComponentProps } = {}) => {
    const wrapper = mount(WorkflowMonitorFilters, {
      props: {
        ...defaultProps,
        ...props,
      },
    });

    return { wrapper };
  };

  it("should render filters", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metadata: { id: "SHOW_ERRORS" } }),
        expect.objectContaining({ metadata: { id: "SHOW_ALL" } }),
      ]),
    );
  });

  it("emits change event", () => {
    const { wrapper } = doMount();

    const secondItem = wrapper.findComponent(SubMenu).props("items").at(1);

    wrapper.findComponent(SubMenu).vm.$emit("item-click", "", secondItem);
    expect(wrapper.emitted("change")![0][0]).toBe("SHOW_ALL");
  });
});
