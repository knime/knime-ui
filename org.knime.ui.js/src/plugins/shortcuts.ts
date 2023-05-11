/* eslint-disable @typescript-eslint/no-extra-parens */
import shortcuts from '@/shortcuts';
import type { ShortcutsService, FormattedShortcut } from '@/shortcuts/types';
import type { PluginInitFunction } from '.';
import { formatHotkeys } from '@/util/formatHotkeys';

// Shortcut setup:
// - add string representation of hotkeys
// - add shortcut name
Object.entries(shortcuts).forEach(([name, shortcut]) => {
    shortcut.name = name;

    if (shortcut.hotkey) {
        shortcut.hotkeyText = formatHotkeys(shortcut.hotkey);
    }
});
Object.freeze(shortcuts);

// define plugin
const init: PluginInitFunction = ({ app, $store, $router }) => {
    // get the whole shortcut by name
    const get: ShortcutsService['get'] = shortcutName => ({ ...shortcuts[shortcutName] } as FormattedShortcut);

    // find the name of the matching shortcut
    // currently only the first match is returned, assuming no two shortcuts share the same hotkey
    const findByHotkey: ShortcutsService['findByHotkey'] = ({ key, metaKey, ctrlKey, shiftKey, altKey }) => {
        for (const [shortcutName, { hotkey }] of Object.entries(shortcuts)) {
            if (!hotkey) {
                continue;
            }

            const modifiers = [...hotkey];
            const character = modifiers.pop();

            // Ctrl-modifier has to match "Command ⌘" (metaKey) on Mac, and Ctrl-Key on other systems
            const ctrlMatches = modifiers.includes('Ctrl') === (isMac() ? metaKey : ctrlKey);
            const shiftMatches = Boolean(shiftKey) === modifiers.includes('Shift');
            const altMatches = Boolean(altKey) === modifiers.includes('Alt');

            const keysMatch =
                // keys are matched case insensitively
                (key.toUpperCase() === character.toUpperCase()) ||
                // on mac 'backspace' can be used instead of delete
                (isMac() && character === 'Delete' && key === 'Backspace');

            if (ctrlMatches && shiftMatches && altMatches && keysMatch) {
                consola.trace('Shortcut', hotkey, shortcutName);
                return shortcutName;
            }
        }
        return null;
    };

    // find out whether a specific shortcut is currently enabled
    const isEnabled: ShortcutsService['isEnabled'] = (shortcutName) => {
        const shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        if (!shortcut.condition) {
            return true;
        }

        return shortcut.condition({ $store });
    };

    const preventDefault: ShortcutsService['preventDefault'] = (shortcutName) => {
        const shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        return !shortcut.allowEventDefault;
    };

    // execute a shortcut
    const dispatch: ShortcutsService['dispatch'] = (shortcutName, payload = {}) => {
        const shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        shortcut.execute({
            $store,
            $router,
            payload
        });
    };

    const $shortcuts: ShortcutsService = {
        isEnabled,
        dispatch,
        preventDefault,
        findByHotkey,
        get
    };

    // define global $shortcuts property
    app.config.globalProperties.$shortcuts = $shortcuts;
};

export default init;
