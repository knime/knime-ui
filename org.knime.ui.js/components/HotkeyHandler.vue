<script>
import { mapMutations, mapState } from 'vuex';

const blacklistTagNames = /^(input|textarea|select)$/i;

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching commands and store actions.
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
                // listen to blur events while waiting for alt key to be released
                this.windowBlurListener = () => {
                    this.setSuggestPanning(false);
                };
                window.addEventListener('blur', this.windowBlurListener, { once: true });
            } else {
                // remove manually when alt key has been released
                window.removeEventListener('blur', this.windowBlurListener);
                this.windowBlurListener = null;
            }
        }
    },
    mounted() {
        // Start Key Listener
        document.addEventListener('keydown', this.onKeydown);
        document.addEventListener('keyup', this.onKeyup);
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', this.onKeydown);
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

            // getAttribute?.() is conditionally called, because the jest-dom doesn't provide this function while testing.
            if (blacklistTagNames.test(e.target.tagName) || e.target.getAttribute?.('contenteditable') === 'true') {
                return;
            }

            if (e.key === 'Alt') {
                if (this.isWorkflowPresent) {
                    this.setSuggestPanning(true);
                    e.stopPropagation();
                    e.preventDefault();
                }
                return;
            }

            // Used in the NodeDescriptionPanel. If further use cases arise, think about a more general solution
            if (e.key === 'Escape') {
                this.$root.$emit('escape-pressed');
            }

            // This currently only looks for the first command that matches the hotkey
            let command = this.$commands.findByHotkey(e);
            
            if (command) {
                if (this.$commands.isEnabled(command)) {
                    this.$commands.dispatch(command);
                }
            
                // prevent default actions for shortcuts of enabled and disabled commands
                e.stopPropagation();
                e.preventDefault();
            }
        },
        onKeyup(e) {
            if (blacklistTagNames.test(e.target.tagName)) {
                return;
            }

            if (e.key === 'Alt') {
                this.setSuggestPanning(false);
            }
        }
    },
    render() {
        return null;
    }
};
</script>
