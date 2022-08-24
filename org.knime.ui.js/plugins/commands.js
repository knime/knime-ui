import commands from '~/commands';

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

// Command setup:
// - add string representation of hotkeys
// - add command name
Object.entries(commands).forEach(([name, command]) => {
    command.name = name;

    if (command.hotkey) {
        command.hotkeyText = formatHotkeys(command.hotkey);
    }
});
Object.freeze(commands);

// define nuxt plugin
export default (context, inject) => {
    // get the whole command by name
    const get = commandName => ({ ...commands[commandName] });

    // find the name of the matching command
    // currently only the first match is returned, assuming no two commands share the same hotkey
    const findByHotkey = ({ key, metaKey, ctrlKey, shiftKey, altKey }) => {
        for (let [commandName, { hotkey }] of Object.entries(commands)) {
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
                consola.trace('Shortcut', hotkey, commandName);
                return commandName;
            }
        }
        return null;
    };

    // find out whether a specific command is currently enabled
    const isEnabled = (commandName) => {
        let command = commands[commandName];
        if (!command) {
            throw new Error(`Command ${commandName} doesn't exist`);
        }

        if (!command.condition) {
            return true;
        }

        return command.condition({ $store: context.store });
    };

    // execute a command
    const dispatch = (commandName, eventDetail = null) => {
        let command = commands[commandName];
        if (!command) {
            throw new Error(`Command ${commandName} doesn't exist`);
        }

        command.execute({ $store: context.store, eventDetail });
    };

    // inject $commands into components
    inject('commands', {
        isEnabled,
        dispatch,
        findByHotkey,
        get
    });
};
