<script>
import { mapActions, mapMutations, mapState, mapGetters } from 'vuex';
import { throttle } from 'lodash';

const throttledZoomThrottle = 30; // throttle keyboard zoom by 30ms

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching actions to the corresponding store.
 */
export default {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapState('canvas', ['suggestPanning']),
        ...mapGetters('workflow', ['isWritable']),
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
        this.setupShortcuts();
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', this.onKeydown);
        document.removeEventListener('keyup', this.onKeyup);
    },
    methods: {
        ...mapActions('selection', ['selectAllNodes']),
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes', 'deleteSelectedObjects',
            'undo', 'redo']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        setupShortcuts() {
            this.hotKeys = {
                canvas: {
                    condition: () => this.isWorkflowPresent,
                    hotKeys: [
                        ['Ctrl', '1', this.setZoomToFit],
                        ['Ctrl', '0', this.resetZoom],
                        ['Ctrl', '+', () => this.throttledZoom(1)],
                        ['Ctrl', '-', () => this.throttledZoom(-1)]
                    ]
                },
                workflow: {
                    condition: () => this.isWorkflowPresent,
                    hotKeys: [
                        ['Ctrl', 'A', this.selectAllNodes],
                        ['F7', () => this.executeNodes('selected')],
                        ['F9', () => this.cancelNodeExecution('selected')],
                        ['F8', () => this.resetNodes('selected')],
                        ['Shift', 'F7', () => this.executeNodes('all')],
                        ['Shift', 'F9', () => this.cancelNodeExecution('all')],
                        ['Shift', 'F8', () => this.resetNodes('all')],
                        ['Ctrl', 'Z', () => this.undo()],
                        ['Ctrl', 'Shift', 'Z', () => this.redo()]
                    ]
                },
                writableWorkflow: {
                    condition: () => this.isWorkflowPresent && this.isWritable,
                    hotKeys: [
                        ['DELETE', this.deleteSelectedObjects],
                        ['BACKSPACE', this.deleteSelectedObjects]
                    ]
                }

            };
        },
        onKeydown(e) {
            // Pressed key is just a modifier
            if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta') {
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

            // stops after the first matching and enabled hotkey
            if (Object.values(this.hotKeys).some(
                ({ condition, hotKeys }) => condition() && this.findAndExecute(hotKeys, e)
            )) {
                e.stopPropagation();
                e.preventDefault();
            }
        },
        /**
         * @param {Array} hotKeys Array<[...modifiers, key, function]>
         * @param {KeyboardEvent} e KeyDown event
         * @returns {Boolean} has found and executed function
         * has side effect
         */
        findAndExecute(hotKeys, e) {
            for (let shortcut of hotKeys) {
                let modifiers = [...shortcut];
                let fn = modifiers.pop();
                let key = modifiers.pop();

                if (
                    (e.ctrlKey || e.metaKey) === modifiers.includes('Ctrl') &&
                    e.shiftKey === modifiers.includes('Shift') &&
                    e.altKey === modifiers.includes('Alt') &&
                    e.key.toUpperCase() === key
                ) {
                    consola.trace('Shortcut', shortcut);
                    fn();
                    return true;
                }
            }
            return false;
        },
        onKeyup(e) {
            if (e.key === 'Alt') {
                this.setSuggestPanning(false);
            }
        },
        throttledZoom: throttle(function (delta) {
            this.zoomCentered(delta); // eslint-disable-line no-invalid-this
        }, throttledZoomThrottle)
    },
    render() {
        return null;
    }
};
</script>
