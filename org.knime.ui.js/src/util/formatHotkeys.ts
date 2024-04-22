import { isMac } from "webapps-common/util/navigator";
import type { Hotkey, Hotkeys } from "@/shortcuts";

/**
 * Returns a string array where all special chars are replaced
 */
export const mapKeyFormat = (hotkeys: Hotkeys) => {
  type KeyFormatMap = Partial<Record<Hotkey, string>>;
  const globalKeyMap: KeyFormatMap = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "↵",
    " ": "Space", // we use event.key and there space is an actual space not the code "Space"
    CtrlOrCmd: "Ctrl",
  };

  const MacOSkeyMap: KeyFormatMap = {
    Shift: "⇧",
    Delete: "⌫",
    CtrlOrCmd: "⌘",
    Ctrl: "⌃",
    Alt: "⌥",
    Enter: "↩",
  };

  const mapSymbols =
    (formatMap: KeyFormatMap) =>
    (key: Hotkey): Hotkey | string =>
      formatMap[key] ?? key;

  const identity = (value: any) => value;

  return (
    hotkeys
      // map only for mac the symbols that should be displayed differently
      .map((key) =>
        isMac() ? mapSymbols(MacOSkeyMap)(key as Hotkey) : identity(key),
      )
      // map all keys that should be displayed differently
      .map(mapSymbols(globalKeyMap))
  );
};

export const getSeparator = () => {
  return " ";
};

/**
 * Returns a string representation of a hotkey. Replaces some special key names with symbols
 */
export const formatHotkeys = (hotkeys: Hotkeys) => {
  return mapKeyFormat(hotkeys).join(getSeparator());
};
