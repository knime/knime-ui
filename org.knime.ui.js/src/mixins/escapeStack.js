// Stack of tuple<VueComponent, { onEscape }>
let stack = [];

/* Defines the EscapeStack-Mixin for a Vue Component.
   Example usage of mixin:
   
    export default {
        mixins: [
            escapeStack({
                onEscape() {
                    this.doSomething();
                }
            })
        ]
    };
*/
export const escapeStack = ({ onEscape, group = null, alwaysActive = false }) => ({
    beforeMount() {
        // Rendering the component automatically pushes it onto the stack
        stack.push([this, { onEscape, group, alwaysActive }]);
    },
    beforeDestroy() {
        // Destroying the component removes it from the stack
        stack = stack.filter(([component]) => component !== this);
    }
});

const getLastEntry = (_stack) => stack[stack.length - 1];

const handleGroupStackEntries = (_stack) => {
    // eslint-disable-next-line no-unused-vars
    const [_, lastEntryData] = getLastEntry(_stack);

    const pendingGroupCalls = stack
        .filter(([_, { group }]) => group === lastEntryData.group)
        .map(([context, { onEscape }]) => [context, onEscape]);
            
    // using the component as "this"-argument for onEscape
    pendingGroupCalls.forEach(([context, handler]) => handler.call(context));

    return _stack.filter(([_, stackData]) => stackData.group !== lastEntryData.group);
};

const handleSingleStackEntry = (_stack) => {
    const [component, { onEscape }] = getLastEntry(_stack);

    // using the component as "this"-argument for onEscape
    onEscape.call(component);

    return _stack.slice(0, -1);
};

// This method is to be called from the hotkey handler.
// It calls "onEscape" on the topmost component, or calls all "onEscape" handlers
// for a group of components
export const escapePressed = () => {
    if (stack.length) {
        const hasAlwaysActiveEntries = stack.some(([, { alwaysActive }]) => alwaysActive);

        // Entries that do not remove their handler after call are considered as "always active"
        // so we call all stored entries regardless of which is the last entry in the stack
        if (hasAlwaysActiveEntries) {
            stack
                .filter(([_, { alwaysActive }]) => alwaysActive)
                .map(([context, { onEscape }]) => [context, onEscape])
                .forEach(([context, handler]) => handler.call(context));
        }

        // eslint-disable-next-line no-unused-vars
        const [_, lastEntryData] = getLastEntry(stack);

        // if it's a type of entry that has an "always active" handler then end here
        // because that was already take care of
        if (lastEntryData.alwaysActive) {
            return;
        }

        stack = lastEntryData.group
            ? handleGroupStackEntries(stack)
            : handleSingleStackEntry(stack);
    }
};
