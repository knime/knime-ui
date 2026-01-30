import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { NodeFeatureList } from "@knime/components";

import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import { createExtendedPort } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import NodeDescriptionLayout from "../NodeDescriptionLayout.vue";

describe("NodeDescription", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  type ComponentProps = InstanceType<typeof NodeDescriptionLayout>["$props"];
  type MountOpts = {
    props?: Partial<ComponentProps>;
  };

  const defaultProps: ComponentProps = {
    name: "Test",
  };

  const doMount = ({ props = {} }: MountOpts = {}) => {
    const mockedStores = mockStores();

    const wrapper = mount(NodeDescriptionLayout, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper };
  };

  it("renders all components", () => {
    const inPorts = [createExtendedPort()];
    const outPorts = [createExtendedPort()];
    const { wrapper } = doMount({
      props: {
        name: "Foo",
        links: [{ url: "", text: "" }],
        inPorts,
        outPorts,
      },
    });

    expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);
    expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(true);
    expect(wrapper.findComponent(NodeFeatureList).props("inPorts")).toEqual(
      inPorts,
    );
    expect(wrapper.findComponent(NodeFeatureList).props("outPorts")).toEqual(
      outPorts,
    );
  });

  it("renders name", () => {
    const { wrapper } = doMount();
    const title = wrapper.find("h2");
    expect(title.text()).toBe("Test");
  });

  it("renders placeholder text if there is no description", () => {
    const { wrapper } = doMount();
    const description = wrapper.find("span");
    expect(description.text()).toBe("There is no description for this node.");
  });
});
