import shortcuts from '@/shortcuts';

// The user agent tells whether this code is currently run on a mac
const isMac = navigator?.userAgent?.toLowerCase()?.includes('mac');

// Returns a string representation of a hotkey
// Replaces some special key names with symbols on macs
const formatHotkeys = hotkeys => {
    if (isMac) {
        const MacOSkeyMap = {
            Shift: '⇧',
            Delete: '⌫',
            Ctrl: '⌘',
            Alt: '⌥'
        };
        return hotkeys.map(key => MacOSkeyMap[key] || key).join(' ');
    } else {
        return hotkeys.join(' ');
    }
};

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
export default (context, inject) => {
    // get the whole shortcut by name
    const get = shortcutName => ({ ...shortcuts[shortcutName] });

    // find the name of the matching shortcut
    // currently only the first match is returned, assuming no two shortcuts share the same hotkey
    const findByHotkey = ({ key, metaKey, ctrlKey, shiftKey, altKey }) => {
        for (let [shortcutName, { hotkey }] of Object.entries(shortcuts)) {
            if (!hotkey) {
                continue;
            }

            let modifiers = [...hotkey];
            let character = modifiers.pop();

            // Ctrl-modifier has to match "Command ⌘" (metaKey) on Mac, and Ctrl-Key on other systems
            let ctrlMatches = modifiers.includes('Ctrl') === (isMac ? metaKey : ctrlKey);
            let shiftMatches = Boolean(shiftKey) === modifiers.includes('Shift');
            let altMatches = Boolean(altKey) === modifiers.includes('Alt');

            // keys are matched case insensitively
            let keysMatch = key.toUpperCase() === character.toUpperCase() ||
                // on mac 'backspace' can be used instead of delete
                (isMac && character === 'Delete' && key === 'Backspace');

            if (ctrlMatches && shiftMatches && altMatches && keysMatch) {
                consola.trace('Shortcut', hotkey, shortcutName);
                return shortcutName;
            }
        }
        return null;
    };

    // find out whether a specific shortcut is currently enabled
    const isEnabled = (shortcutName) => {
        let shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        if (!shortcut.condition) {
            return true;
        }

        return shortcut.condition({ $store: context.store });
    };

    const preventDefault = (shortcutName) => {
        let shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        return !shortcut.allowDefault;
    };

    // execute a shortcut
    const dispatch = (shortcutName, eventDetail = null) => {
        let shortcut = shortcuts[shortcutName];
        if (!shortcut) {
            throw new Error(`Shortcut ${shortcutName} doesn't exist`);
        }

        shortcut.execute({ $store: context.store, eventDetail });
    };

    // inject $shortcuts into components
    inject('shortcuts', {
        isEnabled,
        dispatch,
        preventDefault,
        findByHotkey,
        get
    });
};
