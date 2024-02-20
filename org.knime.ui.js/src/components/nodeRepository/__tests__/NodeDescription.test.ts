import { expect, describe, it, vi, afterEach } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import Description from "webapps-common/ui/components/Description.vue";
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";

import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";
import NodeDescription from "../NodeDescription.vue";

vi.mock("@/environment");

describe("NodeDescription", () => {
  const getNodeDescriptionMock = vi.fn().mockReturnValue({
    id: 1,
    description: "This is a node.",
    links: [
      {
        text: "link",
        url: "www.link.com",
      },
    ],
  });

  const getComponentDescriptionMock = vi.fn().mockReturnValue({
    id: 1,
    description: "This is a Component.",
    links: [
      {
        text: "link",
        url: "www.link.com",
      },
    ],
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = async ({ props = {} } = {}) => {
    const defaultProps = {
      selectedNode: {
        id: 1,
        name: "Test",
        nodeFactory: {
          className: "some.class.name",
          settings: "",
        },
      },
    };

    const $store = mockVuexStore({
      nodeRepository: {
        actions: {
          getNodeDescription: getNodeDescriptionMock,
          getComponentDescription: getComponentDescriptionMock,
        },
      },
    });

    // @ts-ignore
    const wrapper = mount(NodeDescription, {
      props: { ...defaultProps, ...props },
      global: { plugins: [$store] },
    });

    // wait for the initial fetch of data
    await Vue.nextTick();
    await Vue.nextTick();

    return { wrapper, $store };
  };

  it("renders all components", async () => {
    const { wrapper } = await doMount();
    expect(wrapper.findComponent(Description).exists()).toBe(true);
    expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);
    expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(true);
  });

  it("renders name of the selected node", async () => {
    const { wrapper } = await doMount();
    const title = wrapper.find("h2");
    expect(title.text()).toBe("Test");
  });

  it("renders description of the selected node", async () => {
    const { wrapper } = await doMount();
    const description = wrapper.find(".description");
    expect(description.text()).toBe("This is a node.");
  });

  it("renders placeholder text if there is no description", async () => {
    getNodeDescriptionMock.mockReturnValue({
      id: 1,
    });
    const { wrapper } = await doMount();
    await Vue.nextTick();
    const description = wrapper.find("span");
    expect(description.text()).toBe("There is no description for this node.");
  });

  it("does not render external links if there are not any", async () => {
    getNodeDescriptionMock.mockReturnValue({
      id: 1,
      description: "This is a node.",
    });
    const { wrapper } = await doMount();
    expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
    expect(wrapper.findComponent(Description).exists()).toBe(true);
    expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(false);
  });

  it("calls getNodeDescriptionMock when selected node changes", async () => {
    const { wrapper } = await doMount();
    expect(getNodeDescriptionMock).toHaveBeenCalled();
    wrapper.setProps({
      selectedNode: {
        id: 2,
        name: "Node",
        nodeFactory: {
          className: "some.other.thing",
          settings: "",
        },
      },
    });
    await Vue.nextTick();
    expect(getNodeDescriptionMock).toHaveBeenCalledTimes(2);
  });

  it("changes title and description when node is not visible", async () => {
    const { wrapper } = await doMount({ props: { selectedNode: null } });
    const title = wrapper.find("h2");
    expect(title.text()).toBe("");
    expect(wrapper.findComponent(Description).exists()).toBe(false);
    expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
    const placeholder = wrapper.find(".placeholder");
    expect(placeholder.text()).toBe("Please select a node");
  });

  it("should fetch a component description", async () => {
    const { wrapper } = await doMount({
      props: {
        isComponent: true,
        selectedNode: { id: "componentId", name: "Component" },
      },
    });

    expect(getNodeDescriptionMock).not.toHaveBeenCalled();
    expect(getComponentDescriptionMock).toHaveBeenCalled();
    expect(wrapper.find(".extension-info").exists()).toBe(false);
  });

  it("should render node extension information", async () => {
    getNodeDescriptionMock.mockResolvedValueOnce({
      id: 1,
      description: "This is a node.",
      links: [
        {
          text: "link",
          url: "www.link.com",
        },
      ],
      extension: {
        name: "Extension name",
        vendor: { name: "Vendor name", isKNIME: false },
      },
    });
    const { wrapper } = await doMount();
    await Vue.nextTick();
    const description = wrapper.find(".description");

    expect(description.text()).toBe("This is a node.");
    expect(wrapper.find(".extension-info").exists()).toBe(true);
    expect(wrapper.find(".extension-name").text()).toMatch("Extension name");
    expect(wrapper.find(".extension-vendor").text()).toMatch("Vendor name");
    expect(wrapper.find(".knime-icon").exists()).toBe(false);
  });
});
