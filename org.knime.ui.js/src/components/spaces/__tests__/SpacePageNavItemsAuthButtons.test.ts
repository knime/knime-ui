import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";

import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import * as spacesStore from "@/store/spaces";
import { createSpaceProvider } from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import SpacePageNavItemsAuthButtons from "../SpacePageNavItemsAuthButtons.vue";

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({})),
}));

describe("SpacePageNavItemAuthButtons.vue", () => {
  type ComponentProps = InstanceType<
    typeof SpacePageNavItemsAuthButtons
  >["$props"];

  const localProvider = createSpaceProvider();
  const hubProvider = createSpaceProvider({
    id: "provider1",
    name: "Hub provider",
    type: SpaceProviderNS.TypeEnum.HUB,
    connectionMode: "AUTHENTICATED",
    connected: true,
  });

  const doMount = ({ props }: { props: ComponentProps }) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(SpacePageNavItemsAuthButtons, {
      props,
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  describe("authenticated provider", () => {
    it("should render correctly for connected provider", () => {
      const { wrapper } = doMount({
        props: {
          item: {
            id: "item1",
            text: "Some hub provider",
            metadata: {
              spaceProvider: hubProvider,
            },
          },
        },
      });

      expect(wrapper.find(".login").exists()).toBe(false);
      expect(wrapper.find(".logout").exists()).toBe(true);
    });

    it("should render correctly for non-connected provider", () => {
      const { wrapper } = doMount({
        props: {
          item: {
            id: "item1",
            text: "Some hub provider",
            metadata: {
              spaceProvider: { ...hubProvider, connected: false },
            },
          },
        },
      });

      expect(wrapper.find(".login").exists()).toBe(true);
      expect(wrapper.find(".logout").exists()).toBe(false);
    });
  });

  describe("automatically connected provider", () => {
    it("should render correctly for connected provider", () => {
      const { wrapper } = doMount({
        props: {
          item: {
            id: "item1",
            text: "Some hub provider",
            metadata: {
              spaceProvider: localProvider,
            },
          },
        },
      });

      expect(wrapper.find(".login").exists()).toBe(false);
      expect(wrapper.find(".logout").exists()).toBe(false);
    });
  });

  it("should do login", async () => {
    const { wrapper, dispatchSpy } = doMount({
      props: {
        item: {
          id: "item1",
          text: "Some hub provider",
          metadata: {
            spaceProvider: { ...hubProvider, connected: false },
          },
        },
      },
    });

    expect(wrapper.findComponent(LoadingIcon).exists()).toBe(false);
    expect(wrapper.find(".login").attributes("disabled")).toBeUndefined();

    wrapper.find(".login").trigger("click");
    await nextTick();
    expect(wrapper.find(".login").attributes("disabled")).toBeDefined();

    expect(wrapper.findComponent(LoadingIcon).exists()).toBe(true);

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: hubProvider.id,
    });
  });

  it("should do logout", () => {
    const { wrapper, dispatchSpy } = doMount({
      props: {
        item: {
          id: "item1",
          text: "Some hub provider",
          metadata: {
            spaceProvider: hubProvider,
          },
        },
      },
    });

    wrapper.find(".logout").trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/disconnectProvider", {
      spaceProviderId: hubProvider.id,
      $router: expect.anything(),
    });
  });
});
