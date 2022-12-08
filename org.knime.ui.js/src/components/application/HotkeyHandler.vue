<script>
import { mapMutations, mapState } from 'vuex';
import { escapePressed } from '@/mixins/escapeStack';

const blacklistTagNames = /^(input|textarea|select)$/i;

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching the corresponding shortcut handler.
 */
export default {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapState('canvas', ['suggestPanning']),
        isWorkflowPresent() {
            // workflow hotkeys are enabled only if a workflow is present
            return Boolean(this.activeWorkflow);
        }
    },
    watch: {
        suggestPanning(newValue) {
            if (newValue) {
                // listen to blur events while waiting for space bar to be released
                this.windowBlurListener = () => {
                    this.setSuggestPanning(false);
                };
                window.addEventListener('blur', this.windowBlurListener, { once: true });
            } else {
                // remove manually when space bar has been released
                window.removeEventListener('blur', this.windowBlurListener);
                this.windowBlurListener = null;
            }
        }
    },
    mounted() {
        // Start Key Listener
        document.addEventListener('keydown', this.onKeydown);
        document.addEventListener('keypress', this.onKeypress);
        document.addEventListener('keyup', this.onKeyup);
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', this.onKeydown);
        document.removeEventListener('keypress', this.onKeypress);
        document.removeEventListener('keyup', this.onKeyup);
        window.removeEventListener('blur', this.windowBlurListener);
    },
    methods: {
        ...mapMutations('canvas', ['setSuggestPanning']),
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

            if (shortcut) {
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
        onKeypress(e) {
            if (blacklistTagNames.test(e.target.tagName)) {
                return;
            }

            if (e.code === 'Space') {
                if (this.isWorkflowPresent) {
                    this.setSuggestPanning(true);
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
        },
        onKeyup(e) {
            if (blacklistTagNames.test(e.target.tagName)) {
                return;
            }

            if (e.code === 'Space') {
                this.setSuggestPanning(false);
            }
        }
    },
    render() {
        return null;
    }
};
</script>
