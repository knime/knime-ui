import { useRouter, type Router } from "vue-router";
import { useStore, type Store } from "vuex";

import { useToasts, type ToastService } from "webapps-common/ui/services/toast";
import { isMac } from "webapps-common/util/navigator";
import shortcuts from "@/shortcuts";
import type {
  ShortcutsService,
  FormattedShortcut,
  Hotkeys,
  Hotkey,
} from "@/shortcuts/types";
import { formatHotkeys } from "@/util/formatHotkeys";
import type { RootStoreState } from "@/store/types";
import type { PluginInitFunction } from "./types";

// Shortcut setup:
// - add string representation of hotkeys
// - add shortcut name
Object.entries(shortcuts).forEach(([name, shortcut]) => {
  // @ts-ignore
  shortcut.name = name;

  if (shortcut.hotkey) {
    // @ts-ignore
    shortcut.hotkeyText = formatHotkeys(shortcut.hotkey);
  }
});
Object.freeze(shortcuts);

export const createShortcutsService = ({
  $store,
  $router,
  $toast,
}: {
  $store: Store<RootStoreState>;
  $router: Router;
  $toast: ToastService;
}) => {
  // get the whole shortcut by name
  const get: ShortcutsService["get"] = (shortcutName) =>
    ({ ...shortcuts[shortcutName] }) as FormattedShortcut;

  // find the name of the matching shortcut
  // currently only the first match is returned, assuming no two shortcuts share the same hotkey
  const findByHotkey: ShortcutsService["findByHotkey"] = ({
    key,
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

      // Ctrl-modifier has to match "Command ⌘" (metaKey) on Mac, and Ctrl-Key on other systems
      const ctrlMatches =
        modifiers.includes("Ctrl") === (isMac() ? metaKey : ctrlKey);
      const shiftMatches = Boolean(shiftKey) === modifiers.includes("Shift");
      const altMatches = Boolean(altKey) === modifiers.includes("Alt");

      const keysMatch =
        // keys are matched case insensitively
        key.toUpperCase() === character.toUpperCase() ||
        // on mac 'backspace' can be used instead of delete
        (isMac() && character === "Delete" && key === "Backspace");

      return ctrlMatches && shiftMatches && altMatches && keysMatch;
    };

    return Object.entries(shortcuts).flatMap(
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
  };

  // find out whether a specific shortcut is currently enabled
  const isEnabled: ShortcutsService["isEnabled"] = (shortcutName) => {
    const shortcut = shortcuts[shortcutName];
    if (!shortcut) {
      throw new Error(`Shortcut ${shortcutName} doesn't exist`);
    }

    if (!shortcut.condition) {
      return true;
    }

    return shortcut.condition({ $store });
  };

  const preventDefault: ShortcutsService["preventDefault"] = (shortcutName) => {
    const shortcut = shortcuts[shortcutName];
    if (!shortcut) {
      throw new Error(`Shortcut ${shortcutName} doesn't exist`);
    }

    return !shortcut.allowEventDefault;
  };

  // execute a shortcut
  const dispatch: ShortcutsService["dispatch"] = (
    shortcutName,
    payload = {},
  ) => {
    const shortcut = shortcuts[shortcutName];
    if (!shortcut) {
      throw new Error(`Shortcut ${shortcutName} doesn't exist`);
    }

    shortcut.execute({
      $store,
      $router,
      $toast,
      payload,
    });
  };

  const $shortcuts: ShortcutsService = {
    isEnabled,
    dispatch,
    preventDefault,
    findByHotkey,
    get,
  };

  return $shortcuts;
};

export const useShortcuts = () => {
  const $store = useStore();
  const $router = useRouter();
  const $toast = useToasts();

  return createShortcutsService({ $store, $router, $toast });
};

// define plugin
const init: PluginInitFunction = ({ app, $store, $router, $toast }) => {
  const $shortcuts = createShortcutsService({ $store, $router, $toast });

  // define global $shortcuts property
  app.config.globalProperties.$shortcuts = $shortcuts;
};

export default init;
