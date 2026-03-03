import { afterEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import { mockStores } from "@/test/utils/mockStores";
import HotkeyHandler from "../HotkeyHandler.vue";

vi.mock("@/components/uiExtensions");

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

  const doShallowMount = ({
    hotkeys,
    isEnabled,
  }: { hotkeys?: string[]; isEnabled?: boolean } = {}) => {
    KeyboardEvent.prototype.preventDefault = vi.fn();
    KeyboardEvent.prototype.stopPropagation = vi.fn();

    const $shortcuts = {
      findByHotkey: vi.fn().mockReturnValue(hotkeys ?? []),
      isEnabled: vi.fn().mockReturnValue(isEnabled ?? false),
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
      const { $shortcuts } = doShallowMount({
        hotkeys: ["foo", "bar"],
        isEnabled: true,
      });
      const inputEl = document.createElement("input");
      inputEl.dataset.allowShortcuts = "bar";
      document.body.appendChild(inputEl);

      const event = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });
      Object.defineProperty(event, "target", {
        value: inputEl,
      });

      document.dispatchEvent(event);

      expect($shortcuts.dispatch).toHaveBeenCalledWith("bar", {
        event: expect.anything(),
        src: "global",
      });
    });

    it("input element focused (without exceptions)", () => {
      const { $shortcuts } = doShallowMount({
        hotkeys: ["foo", "bar"],
        isEnabled: true,
      });
      const inputEl = document.createElement("input");
      document.body.appendChild(inputEl);

      const event = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });
      Object.defineProperty(event, "target", {
        value: inputEl,
      });

      document.dispatchEvent(event);

      expect($shortcuts.dispatch).not.toHaveBeenCalled();
    });

    it("ui extension focused", () => {
      const { $shortcuts } = doShallowMount({
        hotkeys: ["foo"],
        isEnabled: true,
      });
      const event = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });

      vi.mocked(isUIExtensionFocused).mockReturnValue(true);
      document.dispatchEvent(event);
      expect($shortcuts.dispatch).not.toHaveBeenCalled();

      vi.mocked(isUIExtensionFocused).mockReturnValue(false);
      document.dispatchEvent(event);
      expect($shortcuts.dispatch).toHaveBeenCalled();
    });
  });
});
