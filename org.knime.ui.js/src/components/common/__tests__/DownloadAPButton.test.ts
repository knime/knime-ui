import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
import DownloadAPButton from "../DownloadAPButton.vue";

describe("Download AP Button", () => {
  type MountOptions = { propsOverrides?: { src?: string } };

  const defaultProps = {
    src: "something",
  };

  const doMount = ({ propsOverrides = {} }: MountOptions = {}) => {
    const mockedStores = mockStores();
    mockedStores.applicationStore.analyticsPlatformDownloadURL =
      "https://testUrl.com";

    const props = {
      ...defaultProps,
      ...propsOverrides,
    };

    const wrapper = mount(DownloadAPButton, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, props, mockedStores };
  };

  it("includes utm parameter", () => {
    const src = "test_location";
    const { wrapper } = doMount({
      propsOverrides: { src },
    });

    const href = wrapper.attributes().href;
    expect(href).toBeDefined();

    const url = new URL(href as string);
    expect(url.origin).toBe("https://testurl.com");
    expect(url.searchParams.get("src")).toBe(src);
  });
});
