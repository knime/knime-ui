import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import HubIcon from "@knime/styles/img/icons/cloud-knime.svg";
import LocalSpaceIcon from "@knime/styles/img/icons/local-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { createSpaceProvider } from "@/test/factories";
import StatusPill from "../StatusPill.vue";

describe("StatusPill.vue", () => {
  it("renders Hub icon and text when providerType is HUB", () => {
    const wrapper = mount(StatusPill, {
      props: {
        provider: createSpaceProvider({
          id: "provider",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      },
    });
    expect(wrapper.findComponent(HubIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Hub");
  });

  it("renders Server icon and text when providerType is SERVER", () => {
    const wrapper = mount(StatusPill, {
      props: {
        provider: createSpaceProvider({
          id: "provider",
          type: SpaceProviderNS.TypeEnum.SERVER,
        }),
      },
    });
    expect(wrapper.findComponent(ServerIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Server");
  });

  it("renders LocalSpace icon and text when providerType is LOCAL", () => {
    const wrapper = mount(StatusPill, {
      props: {
        provider: createSpaceProvider({
          id: "provider",
          type: SpaceProviderNS.TypeEnum.LOCAL,
        }),
      },
    });
    expect(wrapper.findComponent(LocalSpaceIcon).exists()).toBe(true);
    expect(wrapper.text()).toContain("Local");
  });
});
