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
export const escapeStack = ({ onEscape }) => ({
    beforeMount() {
        // Rendering the component automatically pushes it onto the stack
        stack.push([this, { onEscape }]);
    },
    beforeUnmount() {
        // Destroying the component removes it from the stack
        stack = stack.filter(([component]) => component !== this);
    }
});


// This method is to be called from the hotkey handler.
// It calls "onEscape" on the topmost component
export const escapePressed = () => {
    if (stack.length) {
        let [component, { onEscape }] = stack.pop();

        // using the component as "this"-argument for onEscape
        onEscape.call(component);
    }
};
