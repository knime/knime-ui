import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import * as applicationStore from "@/store/application";
import { mockVuexStore } from "@/test/utils";
import DownloadAPButton from "../DownloadAPButton.vue";

describe("Download AP Button", () => {
  type MountOptions = { propsOverrides?: { src?: string } };

  const defaultProps = {
    src: "something",
  };

  const doMount = ({ propsOverrides = {} }: MountOptions = {}) => {
    const $store = mockVuexStore({
      application: {
        ...applicationStore,
        analyticsPlatformDownloadURL: "testUrl.com",
      },
    });

    const props = {
      ...defaultProps,
      ...propsOverrides,
    };

    const wrapper = mount(DownloadAPButton, {
      props,
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, props, $store };
  };

  it("includes utm parameter", () => {
    const src = "test_location";
    const { wrapper, $store } = doMount({
      propsOverrides: { src },
    });
    expect(wrapper.attributes().href).toBe(
      `${$store.state.application.analyticsPlatformDownloadURL}?src=${src}`,
    );
  });
});
