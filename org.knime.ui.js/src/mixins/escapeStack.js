// Stack of tuple<VueComponent, { onEscape }>
let stack = [];

/* Defines the EscapeStack-Mixin for a Vue Component.
   Example usage of mixin:
   
    export default {
        mixins: [
            escapeStack({
                // Handler that will get called when the escape key is called
                onEscape() {
                    this.doSomething();
                },

                // Optional. If a stack entry that has a group set is being handled, then all the stack entries that
                // belong to the same group will execute all their handlers as well
                // (with their corresponding component instance) when the escape key is pressed
                group: 'GROUP_NAME',
                
                // Will keep the stack entry in the stack even after the handler has executed. This is useful for
                // components that do not destroy after escape is pressed and want to keep the escape handling behavior
                // for as long as they're mounted. Destroying the component will still remove the entry, even if this
                // property is set.
                alwaysActive: true,
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

const runAllEntries = (_stack, predicateFn) => {
    stack
        .filter(predicateFn)
        .map(([context, { onEscape }]) => [context, onEscape])
        // run the calls backwards (from most recent to oldest)
        .reverse()
        // call handler with the correct context applied
        .forEach(([context, handler]) => handler.call(context));
};

const handleGroupStackEntries = (_stack) => {
    // eslint-disable-next-line no-unused-vars
    const [_, lastEntryData] = getLastEntry(_stack);

    // run all handlers for the group, except `alwaysActive` ones, which were already executed
    runAllEntries(_stack, ([_, entryData]) => entryData.group === lastEntryData.group && !entryData.alwaysActive);

    // remove all handlers on the group, except `alwaysActive` ones
    return _stack.filter(([_, entryData]) => entryData.group !== lastEntryData.group || entryData.alwaysActive);
};

const handleSingleStackEntry = (_stack) => {
    const [component, { onEscape }] = getLastEntry(_stack);

    // using the component as "this"-argument for onEscape
    onEscape.call(component);

    return _stack.slice(0, -1);
};

// This method is to be called from the hotkey handler.
// It calls "onEscape" on the topmost component, or calls all "onEscape" handlers
// for a component or group of components
export const escapePressed = () => {
    if (stack.length) {
        const hasAlwaysActiveEntries = stack.some(([, { alwaysActive }]) => alwaysActive);

        // Entries that do not remove their handler after call are considered as "always active"
        // so we call all stored entries regardless of which is the last entry in the stack
        if (hasAlwaysActiveEntries) {
            runAllEntries(stack, ([_, entryData]) => entryData.alwaysActive);
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
