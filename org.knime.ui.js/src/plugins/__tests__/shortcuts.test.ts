import { afterEach, describe, expect, it, vi } from "vitest";
import { clear as clearUserAgent, mockUserAgent } from "jest-useragent-mock";

describe("Shortcuts Plugin", () => {
  const loadPlugin = async (userAgent: string = "") => {
    const mockApp = { config: { globalProperties: {} } };

    const mockRouter = {
      push: vi.fn(),
    };

    vi.mock("@/shortcuts", () => ({
      default: {
        crazyHotkey: {
          hotkey: ["CtrlOrCmd", "Alt", "Shift", "Delete"],
          execute: vi.fn(),
          condition: vi.fn(),
        },
        digitRangeHotkey: {
          hotkey: ["CtrlOrCmd", "Alt", "Shift", "1-6"],
          execute: vi.fn(),
          condition: vi.fn(),
        },
        selectAll: {
          text: "selectAll mock text",
          hotkey: ["CtrlOrCmd", "A"],
        },
        copy: {
          text: () => "function result that returns text",
          hotkey: ["CtrlOrCmd", "C"],
          allowEventDefault: true,
        },
      },
    }));

    mockUserAgent(userAgent);
    const { default: shortcutPlugin } = await import("@/plugins/shortcuts");

    // @ts-ignore
    shortcutPlugin({ app: mockApp, $router: mockRouter });

    // @ts-ignore
    const $shortcuts = mockApp.config.globalProperties.$shortcuts;

    return { $shortcuts, mockRouter };
  };

  afterEach(() => {
    clearUserAgent();
    vi.resetModules();
  });

  describe("getText", () => {
    it("should get the name", async () => {
      const { $shortcuts } = await loadPlugin();

      expect($shortcuts.getText("selectAll")).toBe("selectAll mock text");
      expect($shortcuts.getText("copy")).toBe(
        "function result that returns text",
      );
      expect($shortcuts.getText("digitRangeHotkey")).toBe("");
      expect(() => $shortcuts.getText("somethingUnknown")).toThrow();
    });
  });

  describe("on apple", () => {
    it("hotkeyText on mac", async () => {
      const { $shortcuts } = await loadPlugin("mac");
      expect($shortcuts.get("crazyHotkey").hotkeyText).toBe("⌘ ⌥ ⇧ ⌫");
    });

    describe("hotkeys", () => {
      it("doesn't find Ctrl-A with [Ctrl-Key]", async () => {
        const { $shortcuts } = await loadPlugin("mac");
        expect(
          $shortcuts.findByHotkey({
            ctrlKey: true,
            key: "a",
          }),
        ).toStrictEqual([]);
      });

      it("find Ctrl-A with [Meta-Key]", async () => {
        const { $shortcuts } = await loadPlugin("mac");
        expect(
          $shortcuts.findByHotkey({
            metaKey: true,
            key: "a",
          }),
        ).toStrictEqual(["selectAll"]);
      });

      it("delete equals Backspace", async () => {
        const { $shortcuts } = await loadPlugin("mac");
        expect(
          $shortcuts.findByHotkey({
            metaKey: true,
            shiftKey: true,
            altKey: true,
            key: "Backspace",
          }),
        ).toStrictEqual(["crazyHotkey"]);
      });
    });
  });

  describe("on other platforms (windows, linux)", () => {
    it("hotkeyText formatted", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect($shortcuts.get("crazyHotkey").hotkeyText).toBe(
        "Ctrl Alt Shift Delete",
      );
    });

    it("adds name to shortcut", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect($shortcuts.get("crazyHotkey").name).toBe("crazyHotkey");
    });

    it.each([true, false])("isEnabled: %s", async (value) => {
      const { $shortcuts } = await loadPlugin("not apple");
      const shortcut = $shortcuts.get("crazyHotkey");
      shortcut.condition.mockReturnValue(value);

      expect($shortcuts.isEnabled("crazyHotkey")).toBe(value);
      expect(shortcut.condition).toHaveBeenCalled();
    });

    it("shortcut without condition is enabled", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect($shortcuts.isEnabled("selectAll")).toBe(true);
    });

    it("dispatch name to shortcut", async () => {
      const { $shortcuts, mockRouter } = await loadPlugin("not apple");
      const shortcut = $shortcuts.get("crazyHotkey");

      $shortcuts.dispatch("crazyHotkey", { event: { mockExtraPayload: true } });

      expect(shortcut.execute).toHaveBeenCalledWith({
        payload: { event: { mockExtraPayload: true } },
        $router: mockRouter,
      });
    });

    it("preventDefault by default", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect($shortcuts.preventDefault("crazyHotkey")).toBe(true);
    });

    it("no preventDefault if allowEventDefault is true", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect($shortcuts.preventDefault("copy")).toBe(false);
    });

    it("dispatch, isEnabled and preventDefault throw for unknown shortcut", async () => {
      const { $shortcuts } = await loadPlugin("not apple");
      expect(() => $shortcuts.isEnabled("unknown")).toThrow();
      expect(() => $shortcuts.dispatch("unknown")).toThrow();
      expect(() => $shortcuts.preventDefault("unknown")).toThrow();
    });

    describe("hotkeys", () => {
      it("find with all modifiers", async () => {
        const { $shortcuts } = await loadPlugin();
        expect(
          $shortcuts.findByHotkey({
            ctrlKey: true,
            shiftKey: true,
            altKey: true,
            key: "Delete",
          }),
        ).toStrictEqual(["crazyHotkey"]);
      });

      it("find Ctrl-A with [Ctrl-Key]", async () => {
        const { $shortcuts } = await loadPlugin();
        expect(
          $shortcuts.findByHotkey({
            ctrlKey: true,
            key: "a",
          }),
        ).toStrictEqual(["selectAll"]);
      });

      it("doesn't find Ctrl-A with [Meta-Key]", async () => {
        const { $shortcuts } = await loadPlugin();
        expect(
          $shortcuts.findByHotkey({
            metaKey: true,
            key: "a",
          }),
        ).toStrictEqual([]);
      });

      it.each(["Digit1", "Digit2", "Digit6"])(
        "find digitRangeHotkey '1-6' with key %s",
        async (code) => {
          const { $shortcuts } = await loadPlugin();
          expect(
            $shortcuts.findByHotkey({
              ctrlKey: true,
              shiftKey: true,
              altKey: true,
              key: "someKeyMaybeFromAnotherLayer",
              code,
            }),
          ).toStrictEqual(["digitRangeHotkey"]);
        },
      );

      it.each(["Digit0", "Digit7", "Digit9"])(
        "doesn't find digitRangeHotkey '1-6' with key %s",
        async (code) => {
          const { $shortcuts } = await loadPlugin();
          expect(
            $shortcuts.findByHotkey({
              ctrlKey: true,
              shiftKey: true,
              altKey: true,
              key: "someKeyMaybeFromAnotherModifierLayer",
              code,
            }),
          ).toStrictEqual([]);
        },
      );
    });
  });
});
