import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EntryPageLayout from "@/components/entryPage/EntryPageLayout.vue";
import PageHeader from "@/components/common/PageHeader.vue";

describe("EntryPageLayout.vue", () => {
  const doMount = () => {
    const $router = {
      push: vi.fn(),
    };

    const $route = {
      name: "GetStartedPage",
    };

    const wrapper = mount(EntryPageLayout, {
      global: {
        mocks: { $router, $route },
        stubs: { RouterView: { template: "<div/>" } },
      },
    });

    return { wrapper };
  };

  it("renders", () => {
    const { wrapper } = doMount();
    expect(wrapper.findComponent(PageHeader).exists()).toBe(true);
  });
});
