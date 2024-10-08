import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useConfirmDialog } from "@/composables/useConfirmDialog";
import ConfirmDialog from "../ConfirmDialog.vue";

describe("ConfirmDialog.vue", () => {
  const { show, cancel, confirm, dialogResult, isActive } = useConfirmDialog();

  afterEach(() => {
    cancel();
  });

  const doMount = () => {
    const wrapper = mount(ConfirmDialog, {
      global: {
        stubs: { BaseModal: true },
      },
    });

    return { wrapper };
  };

  it("should render with basic configuration", async () => {
    const { wrapper } = doMount();

    show({
      title: "This is the title",
      message: "This is the message",
    });

    await nextTick();

    expect(wrapper.find(".header").text()).toMatch("This is the title");
    expect(wrapper.find(".message").text()).toMatch("This is the message");
  });

  // we can use the ConfirmDialog component to also indirectly test the composable
  describe("composable", () => {
    it("should have the right state", async () => {
      doMount();

      const done = vi.fn();
      expect(isActive.value).toBe(false);
      dialogResult.value.then(done);

      show({
        title: "This is the title",
        message: "This is the message",
      });

      await nextTick();

      expect(isActive.value).toBe(true);
      expect(done).not.toHaveBeenCalled();

      const doNotAskAgain = true;
      confirm(doNotAskAgain);

      await flushPromises();
      expect(done).toHaveBeenCalledWith({ confirmed: true, doNotAskAgain });
    });
  });

  it.each([
    [
      "confirming",
      "[data-test-id='confirm-button']",
      { confirmed: true, doNotAskAgain: false },
    ],
    ["cancelling", "[data-test-id='cancel-button']", { confirmed: false }],
  ])(
    "should resolve correct value when %s",
    async (_, selector, expectedValue) => {
      const { wrapper } = doMount();

      const done = vi.fn();
      show({
        title: "This is the title",
        message: "This is the message",
      }).then(done);

      await nextTick();
      expect(done).not.toHaveBeenCalled();

      await wrapper.find(selector).trigger("click");

      await flushPromises();
      expect(done).toHaveBeenCalledWith(expectedValue);
    },
  );

  it("should handle 'do not ask again' option", async () => {
    const { wrapper } = doMount();

    const done = vi.fn();
    show({
      title: "This is the title",
      message: "This is the message",
      doNotAskAgainText: "Do not ask me again <br /> please please",
    }).then(done);
    await nextTick();

    expect(wrapper.find(".checkbox span span").element.innerHTML).toMatch(
      "Do not ask me again <br> please please",
    );

    await wrapper.find(".checkbox input").setValue("checked");
    await wrapper.find("[data-test-id='confirm-button']").trigger("click");
    await flushPromises();
    expect(done).toHaveBeenCalledWith({ confirmed: true, doNotAskAgain: true });
  });

  it("should render custom buttons", async () => {
    const { wrapper } = doMount();

    show({
      title: "This is the title",
      message: "This is the message",
      buttons: [
        { label: "Cancel", type: "cancel" },
        { label: "Another action", type: "cancel", flushRight: true },
        { label: "Accept", type: "confirm", flushRight: true },
      ],
    });

    await nextTick();

    const buttons = wrapper.findAll(".controls button");
    expect(buttons.length).toBe(3);

    expect(buttons.at(0)?.text()).toBe("Cancel");
    expect(buttons.at(0)?.classes()).not.toContain("flush-right");
    expect(buttons.at(1)?.text()).toBe("Another action");
    expect(buttons.at(1)?.classes()).toContain("flush-right");
    expect(buttons.at(2)?.text()).toBe("Accept");
    expect(buttons.at(2)?.classes()).toContain("flush-right");
  });

  it("can have buttons with custom handlers", async () => {
    const { wrapper } = doMount();

    const spy = vi.fn();

    const config: Parameters<typeof show>[0] = {
      title: "This is the title",
      message: "This is the message",
      buttons: [
        {
          label: "Cancel",
          type: "cancel",
          customHandler: ({ confirm }) => {
            spy("cancel button");
            // use the opposite action to showcase custom behavior
            confirm();
          },
        },
        {
          label: "Apply",
          type: "confirm",
          customHandler: ({ cancel }) => {
            spy("apply button");
            // use the opposite action to showcase custom behavior
            cancel();
          },
        },
      ],
    };

    const done = vi.fn();

    // show first time
    show(config).then(done);
    await nextTick();

    await wrapper.find("[data-test-id='confirm-button']").trigger("click");

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("apply button");
    expect(done).toHaveBeenCalledWith({ confirmed: false });

    // show second time
    show(config).then(done);
    await nextTick();

    await wrapper.find("[data-test-id='cancel-button']").trigger("click");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith("cancel button");
    expect(done).toHaveBeenCalledWith({
      confirmed: true,
      doNotAskAgain: false,
    });
  });
});
