import { afterEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import { mockStores } from "@/test/utils/mockStores";
import HotkeyHandler from "../HotkeyHandler.vue";

const expectEventHandled = () => {
  expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};
const expectEventNotHandled = () => {
  expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
};
const expectPreventDefaultHandled = () => {
  expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
};

describe("HotKeys", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doShallowMount = () => {
    KeyboardEvent.prototype.preventDefault = vi.fn();
    KeyboardEvent.prototype.stopPropagation = vi.fn();

    const $shortcuts = {
      findByHotkey: vi.fn().mockReturnValue([]),
      isEnabled: vi.fn(),
      preventDefault: vi.fn(),
      dispatch: vi.fn(),
    };

    const mockedStores = mockStores();
    const wrapper = shallowMount(HotkeyHandler, {
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shortcuts },
      },
    });

    return { wrapper, mockedStores, $shortcuts };
  };

  it("shortcut found and is enabled", () => {
    const { $shortcuts } = doShallowMount();
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(true);
    $shortcuts.preventDefault.mockReturnValue(false);

    // random key combination
    const e = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });
    document.dispatchEvent(e);

    expect($shortcuts.isEnabled).toHaveBeenCalledWith("shortcut");
    expect($shortcuts.dispatch).toHaveBeenCalledWith("shortcut", {
      event: e,
      src: "global",
    });
    expectEventHandled();
    // enabled shortcuts always prevent even if the config says other
    expectPreventDefaultHandled();
  });

  it("no matching shortcut found", () => {
    const { $shortcuts } = doShallowMount();
    $shortcuts.findByHotkey.mockReturnValue([]);

    // random key combination
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );

    expect($shortcuts.dispatch).not.toHaveBeenCalled();
  });

  it.each(["Control", "Shift", "Meta"])(
    "modifier %s-keydown does nothing",
    (key) => {
      doShallowMount();
      document.dispatchEvent(new KeyboardEvent("keydown", { key }));

      expectEventNotHandled();
    },
  );

  it("shortcut found but is not enabled", () => {
    const { $shortcuts } = doShallowMount();
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(false);
    $shortcuts.preventDefault.mockReturnValue(true);

    // random key combination
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );

    expect($shortcuts.isEnabled).toHaveBeenCalledWith("shortcut");
    expect($shortcuts.dispatch).not.toHaveBeenCalledWith("shortcut");
    expectEventHandled();
    expectPreventDefaultHandled();
  });

  it("shortcut allows event default action", () => {
    const { $shortcuts } = doShallowMount();
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(false);
    $shortcuts.preventDefault.mockReturnValue(false);

    // random key combination
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );

    expect($shortcuts.isEnabled).toHaveBeenCalledWith("shortcut");
    expect($shortcuts.dispatch).not.toHaveBeenCalledWith("shortcut");

    expectEventHandled();
  });

  describe("prevent shortcuts depending on focus", () => {
    it("input element focused (with exceptions)", () => {
      const { wrapper } = doShallowMount();
      const inputEl = document.createElement("input");
      document.body.appendChild(inputEl);

      const e = { target: null };
      expect(wrapper.vm.preventShortcuts(e)).toBeFalsy();
      e.target = inputEl;
      expect(wrapper.vm.preventShortcuts(e)).toBeTruthy();
      // exception for port tabbar
      inputEl.setAttribute("name", "output-port");
      expect(wrapper.vm.preventShortcuts(e)).toBeFalsy();
    });

    it("ui extension focused", () => {
      vi.mock("@/components/uiExtensions");
      const { wrapper } = doShallowMount();

      vi.mocked(isUIExtensionFocused).mockReturnValueOnce(false);
      expect(
        wrapper.vm.preventShortcuts(
          new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
        ),
      ).toBeFalsy();
      vi.mocked(isUIExtensionFocused).mockReturnValueOnce(true);
      expect(
        wrapper.vm.preventShortcuts(
          new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
        ),
      ).toBeTruthy();
    });
  });
});
