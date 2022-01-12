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
            if (!hotkey) { continue; }

            let modifiers = [...hotkey];
            let character = modifiers.pop();

            if (
                ((isMac && Boolean(metaKey)) || (!isMac && Boolean(ctrlKey))) === modifiers.includes('Ctrl') &&
                Boolean(shiftKey) === modifiers.includes('Shift') &&
                Boolean(altKey) === modifiers.includes('Alt') &&
                (
                    key.toUpperCase() === character.toUpperCase() ||
                    character === 'Delete' && key === 'Backspace'
                )
            ) {
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
    const dispatch = (commandName, $args) => {
        let command = commands[commandName];
        if (!command) {
            throw new Error(`Command ${commandName} doesn't exist`);
        }

        command.execute({ $store: context.store, $args });
    };

    // inject $commands into components
    inject('commands', {
        isEnabled,
        dispatch,
        findByHotkey,
        get
    });
};
