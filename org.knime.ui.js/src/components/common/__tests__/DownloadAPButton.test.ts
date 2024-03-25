import { expect, describe, it } from "vitest";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import * as applicationStore from "@/store/application";

import DownloadAPButton from "../DownloadAPButton.vue";

describe("Download AP Button", () => {
  const doMount = ({ propsOverrides = {} } = {}) => {
    const $store = mockVuexStore({
      application: {
        ...applicationStore,
        analyticsPlatformDownloadURL: "testUrl.com",
      },
    });

    const props = {
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

  it("default empty utm parameter", () => {
    const { wrapper, $store } = doMount();
    expect(wrapper.attributes().href).toBe(
      `${$store.state.application.analyticsPlatformDownloadURL}`,
    );
  });

  it("includes utm parameter", () => {
    const utmSource = "test_location";
    const { wrapper, $store } = doMount({
      propsOverrides: { utmSource },
    });
    expect(wrapper.attributes().href).toBe(
      `${$store.state.application.analyticsPlatformDownloadURL}?src=${utmSource}`,
    );
  });
});
