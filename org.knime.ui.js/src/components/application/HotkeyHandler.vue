<script>
import { escapePressed } from '@/mixins/escapeStack';

const blacklistTagNames = /^(input|textarea|select)$/i;

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching the corresponding shortcut handler.
 */
export default {
    mounted() {
        // Start Key Listener
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        // Stop Key listener
        document.removeEventListener('keydown', this.onKeydown);
    },
    methods: {
        onKeydown(e) {
            // Pressed key is just a modifier
            if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta') {
                return;
            }

            // Close one item on the escape stack
            if (e.key === 'Escape') {
                escapePressed();
            }

            // getAttribute?.() is conditionally called, because the jest-dom doesn't provide this function while testing.
            if (blacklistTagNames.test(e.target.tagName) || e.target.getAttribute?.('contenteditable') === 'true') {
                return;
            }

            // This currently only looks for the first shortcut that matches the hotkey
            let shortcut = this.$shortcuts.findByHotkey(e);

            if (!shortcut) {
                return;
            }

            const isEnabled = this.$shortcuts.isEnabled(shortcut);
            if (isEnabled) {
                this.$shortcuts.dispatch(shortcut);
            }

            // prevent default if shortcut did not allow it (like copy text via CTRL+C)
            if (isEnabled || this.$shortcuts.preventDefault(shortcut)) {
                e.preventDefault();
            }

            // this is the only place where the registered hotkeys should be handled
            e.stopPropagation();
        }
    },
    render() {
        return null;
    }
};
</script>
