import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";

import GetStartedPage from "@/components/entryPage/GetStartedPage.vue";
import Card from "@/components/common/Card.vue";
import { cachedLocalSpaceProjectId } from "@/store/spaces";

describe("GettingStartedPage.vue", () => {
  const doMount = ({ openWorkflowMock = vi.fn() } = {}) => {
    const $store = mockVuexStore({
      application: {
        state: {
          exampleProjects: [
            {
              name: "Test",
              svg: "svg",
              origin: {
                itemId: "item",
                spaceId: "space",
                providerId: "provider",
              },
            },
            {
              name: "Test 2",
              svg: "svg2",
              origin: {
                itemId: "item2",
                spaceId: "space2",
                providerId: "provider2",
              },
            },
          ],
        },
      },
      spaces: {
        actions: {
          openWorkflow: openWorkflowMock,
        },
      },
    });

    const $router = {
      push: vi.fn(),
    };

    // stubs
    const SpaceSelectionPage = {
      template: "<div />",
    };

    const wrapper = mount(GetStartedPage, {
      global: {
        plugins: [$store],
        mocks: { $router },
        stubs: { SpaceSelectionPage },
      },
    });

    return { wrapper, $store, SpaceSelectionPage, $router };
  };

  it("renders the components", () => {
    const { wrapper, SpaceSelectionPage } = doMount();
    expect(wrapper.findComponent(Card).exists()).toBe(true);
    expect(wrapper.findComponent(SpaceSelectionPage).exists()).toBe(true);
  });

  it("click opens workflow", async () => {
    const openWorkflowMock = vi.fn();
    const { wrapper } = doMount({ openWorkflowMock });
    expect(wrapper.findComponent(Card).exists()).toBe(true);

    const cards = wrapper.findAll(".card");
    expect(cards.length).toBe(2);

    cards.at(0).trigger("click");
    await wrapper.vm.$nextTick();
    expect(openWorkflowMock).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectId: cachedLocalSpaceProjectId,
        workflowItemId: "item",
      })
    );
  });
});
