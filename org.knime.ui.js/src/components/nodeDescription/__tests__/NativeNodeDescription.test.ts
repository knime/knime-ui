import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { NODE_FACTORIES, createNativeNodeDescription } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import NativeNodeDescription from "../NativeNodeDescription.vue";
import NodeDescriptionExtensionInfo from "../NodeDescriptionExtensionInfo.vue";
import NodeDescriptionLayout from "../NodeDescriptionLayout.vue";

vi.mock("@/environment");

describe("NativeNodeDescription", () => {
  const getNodeDescriptionMock = vi.fn().mockReturnValue(
    createNativeNodeDescription({
      description: "This is a node.",
      links: [
        {
          text: "link",
          url: "www.link.com",
        },
      ],
    }),
  );

  afterEach(() => {
    vi.clearAllMocks();
  });

  type ComponentProps = InstanceType<typeof NativeNodeDescription>["$props"];
  type MountOpts = {
    props?: Partial<ComponentProps>;
  };

  const defaultProps: ComponentProps = {
    nodeTemplateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    name: "Test",
    nodeFactory: {
      className: "some.class.name",
      settings: "",
    },
  };

  const doMount = async ({ props = {} }: MountOpts = {}) => {
    const mockedStores = mockStores();

    mockedStores.nodeDescriptionStore.getNativeNodeDescription =
      getNodeDescriptionMock;

    const wrapper = mount(NativeNodeDescription, {
      props: { ...defaultProps, ...props },
      global: { plugins: [mockedStores.testingPinia] },
    });

    // wait for the initial fetch of data
    await flushPromises();

    return { wrapper, mockedStores };
  };

  it("loads and renders", async () => {
    const { wrapper, mockedStores } = await doMount();

    await flushPromises();
    expect(
      mockedStores.nodeDescriptionStore.getNativeNodeDescription,
    ).toHaveBeenCalledWith({
      factoryId: defaultProps.nodeTemplateId,
      nodeFactory: defaultProps.nodeFactory,
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

  it("re-fetches data when node template id changes", async () => {
    const { wrapper } = await doMount();
    await flushPromises();
    expect(getNodeDescriptionMock).toHaveBeenCalled();

    wrapper.setProps({
      nodeTemplateId: NODE_FACTORIES.CSVTableReaderNodeFactory,
    });

    await nextTick();
    expect(getNodeDescriptionMock).toHaveBeenCalledTimes(2);
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
    await nextTick();
    expect(wrapper.findComponent(NodeDescriptionExtensionInfo).exists()).toBe(
      true,
    );
  });
});
