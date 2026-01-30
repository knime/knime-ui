import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { NodeFeatureList } from "@knime/components";

import { mockStores } from "@/test/utils/mockStores";
import ComponentInstanceDescription from "../ComponentInstanceDescription.vue";
import NodeDescriptionLayout from "../NodeDescriptionLayout.vue";

vi.mock("@/environment");

describe("ComponentInstanceDescription", () => {
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

  type ComponentProps = InstanceType<
    typeof ComponentInstanceDescription
  >["$props"];

  type MountOpts = {
    props?: Partial<ComponentProps>;
  };

  const defaultProps: ComponentProps = {
    nodeId: "root:1",
    name: "Test",
  };

  const doMount = async ({ props = {} }: MountOpts = {}) => {
    const mockedStores = mockStores();

    mockedStores.nodeDescriptionStore.getComponentDescription =
      getComponentDescriptionMock;

    const wrapper = mount(ComponentInstanceDescription, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    // wait for the initial fetch of data
    await flushPromises();

    return { wrapper, mockedStores };
  };

  it("loads and renders", async () => {
    const { wrapper, mockedStores } = await doMount();

    expect(
      mockedStores.nodeDescriptionStore.getComponentDescription,
    ).toHaveBeenCalledWith({
      nodeId: defaultProps.nodeId,
    });

    expect(wrapper.findComponent(NodeDescriptionLayout).exists()).toBe(true);
    expect(wrapper.findComponent(NodeDescriptionLayout).props("name")).toBe(
      "Test",
    );
    expect(wrapper.findComponent(NodeDescriptionLayout).props("links")).toEqual(
      [{ text: "link", url: "www.link.com" }],
    );
    expect(
      wrapper.findComponent(NodeDescriptionLayout).props("inPorts"),
    ).toBeTruthy();
    expect(
      wrapper.findComponent(NodeDescriptionLayout).props("outPorts"),
    ).toBeTruthy();
  });

  it("refetches data when nodeId node changes", async () => {
    const { wrapper } = await doMount();
    expect(getComponentDescriptionMock).toHaveBeenCalled();

    wrapper.setProps({
      nodeId: "root:2",
    });

    await nextTick();
    expect(getComponentDescriptionMock).toHaveBeenCalledTimes(2);
  });

  it("sanitizes malicious HTML in component port descriptions", async () => {
    getComponentDescriptionMock.mockReturnValueOnce({
      id: 1,
      description: "Component with potential XSS",
      links: [],
      inPorts: [
        {
          name: "Input Port 1",
          description: "<img src=x onerror=\"alert('XSS')\" />",
        },
      ],
      outPorts: [],
      options: [],
      views: [],
    });

    const { wrapper } = await doMount({
      props: { nodeId: "component-id", name: "Malicious Component" },
    });

    const featureList = wrapper.findComponent(NodeFeatureList);
    expect(featureList.exists()).toBe(true);

    const html = featureList.html();
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("alert(");
  });

  it("renders cleaned plain text if malicious description is present in component port descriptions", async () => {
    getComponentDescriptionMock.mockReturnValueOnce({
      id: 1,
      description: "Some description",
      links: [],
      inPorts: [
        {
          name: "InPort 1",
          description: '<script>alert("bad")</script>Safe text',
        },
      ],
      outPorts: [],
      options: [],
      views: [],
    });

    const { wrapper } = await doMount({
      props: { nodeId: "component-id", name: "Script Test" },
    });

    const featureList = wrapper.findComponent(NodeFeatureList);
    const html = featureList.html();
    expect(html).toContain("Safe text");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert");
  });
});
