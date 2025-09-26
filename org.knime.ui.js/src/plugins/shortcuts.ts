import { type Router, useRouter } from "vue-router";

import { type ToastService, useToasts } from "@knime/components";
import { type Hotkey, hotkeys, navigatorUtils } from "@knime/utils";

import shortcuts, { type ShortcutsRegistry } from "@/shortcuts";
import type {
  FormattedShortcut,
  Hotkeys,
  ShortcutsService,
} from "@/shortcuts/types";

import type { PluginInitFunction } from "./types";

// Shortcut setup:
// - add string representation of hotkeys
// - add shortcut name
Object.entries(shortcuts).forEach(([name, shortcut]) => {
  // @ts-expect-error (please add error description)
  shortcut.name = name;

  if (shortcut.hotkey) {
    // @ts-expect-error (please add error description)
    shortcut.hotkeyText = hotkeys.formatHotkeys(shortcut.hotkey);
  }
});
Object.freeze(shortcuts);

const isDigitKeyInRange = (keyCode: string, hotkey: Hotkey | ""): boolean => {
  // Digit keys exist from 0 to 9, so valid ranges always have length 3
  const digitRangeLength = 3;
  if (hotkey.length !== digitRangeLength || !keyCode?.startsWith("Digit")) {
    return false;
  }

  const keyNumber = Number(keyCode.slice("Digit".length));
  const [lower, upper] = hotkey.split("-");

  return (
    Boolean(lower) &&
    Boolean(upper) &&
    parseInt(lower, 10) <= keyNumber &&
    keyNumber <= parseInt(upper, 10)
  );
};

export const createShortcutsService = ({
  $router,
  $toast,
}: {
  $router: Router;
  $toast: ToastService;
}) => {
  // get the whole shortcut by name
  const get: ShortcutsService["get"] = (shortcutName) =>
    ({ ...shortcuts[shortcutName] }) as FormattedShortcut;

  // find the names of the matching shortcuts
  const findByHotkey: ShortcutsService["findByHotkey"] = ({
    key,
    code,
    metaKey,
    ctrlKey,
    shiftKey,
    altKey,
  }) => {
    const checkHotkey = (hotkey: Hotkeys) => {
      const modifiers = hotkey.filter(
        (key): key is Hotkey => typeof key === "string",
      );
      const character = modifiers.pop() ?? "";

      // our special CtrlOrCmd has to match "Command ⌘" (metaKey) on Mac, and Ctrl-Key on other systems
      const ctrlOrMeta = navigatorUtils.isMac() ? "Meta" : "Ctrl";
      const platformModifiers = modifiers.map((modifier) =>
        modifier === "CtrlOrCmd" ? ctrlOrMeta : modifier,
      );

      const metaMatches =
        Boolean(metaKey) === platformModifiers.includes("Meta");
      const ctrlMatches =
        Boolean(ctrlKey) === platformModifiers.includes("Ctrl");
      const shiftMatches =
        Boolean(shiftKey) === platformModifiers.includes("Shift");
      const altMatches = Boolean(altKey) === platformModifiers.includes("Alt");

      const keysMatch =
        // keys are matched case insensitively
        key.toUpperCase() === character.toUpperCase() ||
        (character.includes("-") && isDigitKeyInRange(code, character)) ||
        // on mac 'backspace' can be used instead of delete
        (navigatorUtils.isMac() &&
          character === "Delete" &&
          key === "Backspace");

      return (
        metaMatches && ctrlMatches && shiftMatches && altMatches && keysMatch
      );
    };

    const foundShortcuts = Object.entries(shortcuts).flatMap(
      ([shortcutName, { hotkey, additionalHotkeys = [] }]) => {
        if (!hotkey) {
          return [];
        }

        const additionalKeys = additionalHotkeys.map(
          (value: { key: Hotkeys }) => value.key,
        );

        // check for matching keys
        if ([hotkey, ...additionalKeys].some(checkHotkey)) {
          consola.trace("Shortcut", hotkey, shortcutName);
          return [shortcutName];
        }
        return [];
      },
    );

    consola.info("shortcuts::findByHotkey", {
      params: {
        key,
        code,
        metaKey,
        ctrlKey,
        shiftKey,
        altKey,
      },
      foundShortcuts,
    });

    return foundShortcuts;
  };

  const getByName = (shortcutName: keyof ShortcutsRegistry) => {
    const shortcut = shortcuts[shortcutName];

    if (!shortcut) {
      consola.warn("shortcuts::dispatch -> Shortcut not found", {
        shortcuts,
        shortcutName,
      });
      throw new Error(`Shortcut ${shortcutName} doesn't exist`);
    }

    return shortcut;
  };

  // find out whether a specific shortcut is currently enabled
  const isEnabled: ShortcutsService["isEnabled"] = (shortcutName) => {
    const shortcut = getByName(shortcutName);

    if (!shortcut.condition) {
      return true;
    }

    return shortcut.condition({ $router });
  };

  const preventDefault: ShortcutsService["preventDefault"] = (shortcutName) => {
    const shortcut = getByName(shortcutName);

    return !shortcut.allowEventDefault;
  };

  // execute a shortcut
  const dispatch: ShortcutsService["dispatch"] = (
    shortcutName,
    payload = {},
  ) => {
    consola.info("shortcuts::dispatch", { shortcutName, payload });
    const shortcut = getByName(shortcutName);

    shortcut.execute({
      $router,
      $toast,
      payload,
    });
  };

  const getText: ShortcutsService["getText"] = (shortcutName) => {
    const shortcut = getByName(shortcutName);

    if (!shortcut || !shortcut.text) {
      return "";
    }

    return typeof shortcut.text === "function"
      ? shortcut.text()
      : shortcut.text;
  };

  const $shortcuts: ShortcutsService = {
    isEnabled,
    dispatch,
    preventDefault,
    findByHotkey,
    get,
    getText,
  };

  return $shortcuts;
};

export const useShortcuts = () => {
  const $router = useRouter();
  // TODO: NXT-3449 (Change to remove getToastsProvider() or retire $toasts arg altogether)
  const $toast = useToasts();

  return createShortcutsService({ $router, $toast });
};

// define plugin
const init: PluginInitFunction = ({ app, $router, $toast }) => {
  const $shortcuts = createShortcutsService({ $router, $toast });

  // define global $shortcuts property
  app.config.globalProperties.$shortcuts = $shortcuts;
};

export default init;
