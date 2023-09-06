import { isMac } from "webapps-common/util/navigator";
import type { Hotkey, Hotkeys } from "@/shortcuts";

/**
 * Returns a string representation of a hotkey. Replaces some special key names with symbols
 */
export const formatHotkeys = (hotkeys: Hotkeys) => {
  type KeyFormatMap = Partial<Record<Hotkey, string>>;
  const globalKeyMap: KeyFormatMap = {
    ArrowUp: "↑",
    ArrowDown: "↓",
  };

  const MacOSkeyMap: KeyFormatMap = {
    Shift: "⇧",
    Delete: "⌫",
    Ctrl: "⌘",
    Alt: "⌥",
  };

  const mapSymbols = (formatMap: KeyFormatMap) => (key: Hotkey) =>
    formatMap[key] || key;
  const identity = (value: any) => value;

  return (
    hotkeys
      // map all keys that should be displayed differently
      .map(mapSymbols(globalKeyMap))
      // map only for mac the symbols that should be displayed differently
      .map(isMac() ? mapSymbols(MacOSkeyMap) : identity)
      .join(" ")
  );
};
