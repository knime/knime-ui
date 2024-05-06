import { expect, describe, beforeEach, afterEach, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { escapePressed as escapePressedMock } from "@/mixins/escapeStack";

import HotkeyHandler from "../HotkeyHandler.vue";
import { isUIExtensionFocused } from "@/components/uiExtensions";

vi.mock("@/mixins/escapeStack", () => ({
  escapePressed: vi.fn(),
}));

const expectEventHandled = () => {
  expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};
const expectEventNotHandled = () => {
  expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
};
const expectPreventDefaultHandled = () => {
  expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
};

const expectPreventDefaultNotHandled = () => {
  expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
};

describe("HotKeys", () => {
  let doShallowMount, wrapper, $store, storeConfig, $shortcuts;

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    $shortcuts = {
      findByHotkey: vi.fn().mockReturnValue([]),
      isEnabled: vi.fn(),
      preventDefault: vi.fn(),
      dispatch: vi.fn(),
    };

    $store = null;
    wrapper = null;

    KeyboardEvent.prototype.preventDefault = vi.fn();
    KeyboardEvent.prototype.stopPropagation = vi.fn();

    escapePressedMock.mockClear();

    storeConfig = {
      workflow: {
        state: {
          activeWorkflow: { someProperty: 0 },
        },
      },
      canvas: {
        state: {
          suggestPanning: false,
        },
        mutations: {
          setSuggestPanning: vi.fn().mockImplementation((state, val) => {
            state.suggestPanning = val;
          }),
        },
      },
    };

    doShallowMount = () => {
      $store = mockVuexStore(storeConfig);
      wrapper = shallowMount(HotkeyHandler, {
        global: {
          plugins: [$store],
          mocks: { $shortcuts },
        },
      });
    };
  });

  it("escape triggers event", () => {
    doShallowMount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(escapePressedMock).toHaveBeenCalled();
  });

  it("shortcut found and is enabled", () => {
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(true);
    $shortcuts.preventDefault.mockReturnValue(false);
    doShallowMount();

    // random key combination
    const e = new KeyboardEvent("keydown", { key: "b", ctrlKey: true });
    document.dispatchEvent(e);

    expect($shortcuts.isEnabled).toHaveBeenCalledWith("shortcut");
    expect($shortcuts.dispatch).toHaveBeenCalledWith("shortcut", { event: e });
    expectEventHandled();
    // enabled shortcuts always prevent even if the config says other
    expectPreventDefaultHandled();
  });

  it("no matching shortcut found", () => {
    $shortcuts.findByHotkey.mockReturnValue([]);
    doShallowMount();

    // random key combination
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );

    expect($shortcuts.dispatch).not.toHaveBeenCalled();
    expectEventNotHandled();
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
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(false);
    $shortcuts.preventDefault.mockReturnValue(true);
    doShallowMount();

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
    $shortcuts.findByHotkey.mockReturnValue(["shortcut"]);
    $shortcuts.isEnabled.mockReturnValue(false);
    $shortcuts.preventDefault.mockReturnValue(false);
    doShallowMount();

    // random key combination
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );

    expect($shortcuts.isEnabled).toHaveBeenCalledWith("shortcut");
    expect($shortcuts.dispatch).not.toHaveBeenCalledWith("shortcut");

    expectEventHandled();
    expectPreventDefaultNotHandled();
  });

  describe("prevent shortcuts depending on focus", () => {
    it("input element focused (with exceptions)", () => {
      doShallowMount();
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
      doShallowMount();

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
