import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import LoadingIcon from "@knime/styles/img/icons/reload.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import KaiStatus from "../KaiStatus.vue";

describe("KaiStatus.vue", () => {
  describe("visibility", () => {
    it("renders nothing when status is empty (default)", () => {
      const wrapper = mount(KaiStatus);

      expect(wrapper.find(".status").exists()).toBe(false);
    });

    it("renders the status div when status is provided", () => {
      const wrapper = mount(KaiStatus, { props: { status: "Building…" } });

      expect(wrapper.find(".status").exists()).toBe(true);
      expect(wrapper.find(".status").text()).toBe("Building…");
    });
  });

  describe("variant='loading' (default)", () => {
    it("renders a spinning LoadingIcon when variant is not specified", () => {
      const wrapper = mount(KaiStatus, { props: { status: "Thinking…" } });

      expect(wrapper.findComponent(LoadingIcon).exists()).toBe(true);
      expect(wrapper.find(".spinning").exists()).toBe(true);
    });

    it("does not render a UserIcon in loading variant", () => {
      const wrapper = mount(KaiStatus, { props: { status: "Thinking…" } });

      expect(wrapper.findComponent(UserIcon).exists()).toBe(false);
    });
  });

  describe("variant='waiting'", () => {
    it("renders a UserIcon when variant is 'waiting'", () => {
      const wrapper = mount(KaiStatus, {
        props: { status: "Waiting for input", variant: "waiting" },
      });

      expect(wrapper.findComponent(UserIcon).exists()).toBe(true);
    });

    it("does not render a spinning LoadingIcon in waiting variant", () => {
      const wrapper = mount(KaiStatus, {
        props: { status: "Waiting for input", variant: "waiting" },
      });

      expect(wrapper.find(".spinning").exists()).toBe(false);
    });
  });
});
