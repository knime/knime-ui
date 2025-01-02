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
    mockedStores.applicationStore.analyticsPlatformDownloadURL = "testUrl.com";

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
    const { wrapper, mockedStores } = doMount({
      propsOverrides: { src },
    });
    expect(wrapper.attributes().href).toBe(
      `${mockedStores.applicationStore.analyticsPlatformDownloadURL}?src=${src}`,
    );
  });
});
