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
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('userActions', ['hotKeyItems']),
        isWorkflowPresent() {
            // workflow hotkeys are enabled only if a workflow is present
            return Boolean(this.activeWorkflow);
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
        ...mapMutations('workflow', ['selectAllNodes', 'deselectAllNodes']),
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes', 'deleteSelectedNodes']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        setupShortcuts() {
            this.hotKeys = {
                canvas: {
                    condition: () => this.isWorkflowPresent,
                    hotKeys: [
                        [...this.hotKeyItems.zoomToFit, this.setZoomToFit],
                        ['Ctrl', '0', this.resetZoom],
                        ['Ctrl', '+', () => this.throttledZoom(1)],
                        ['Ctrl', '-', () => this.throttledZoom(-1)]
                    ]
                },
                workflow: {
                    condition: () => this.isWorkflowPresent,
                    hotKeys: [
                        [...this.hotKeyItems.selectAllNodes, this.selectAllNodes],
                        [...this.hotKeyItems.executeSelectedNodes, () => this.executeNodes('selected')],
                        [...this.hotKeyItems.cancelSelectedNodes, () => this.cancelNodeExecution('selected')],
                        [...this.hotKeyItems.resetSelectedNodes, () => this.resetNodes('selected')],
                        [...this.hotKeyItems.executeAllNodes, () => this.executeNodes('all')],
                        [...this.hotKeyItems.cancelAllNodes, () => this.cancelNodeExecution('all')],
                        [...this.hotKeyItems.resetAllNodes, () => this.resetNodes('all')]
                    ]
                },
                writableWorkflow: {
                    condition: () => this.isWorkflowPresent && this.isWritable,
                    hotKeys: [
                        [...this.hotKeyItems.deleteDel, this.deleteSelectedNodes],
                        [...this.hotKeyItems.deleteBackspace, this.deleteSelectedNodes]
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
        throttledZoom: throttle(function myf(delta) {
            this.zoomCentered(delta); // eslint-disable-line no-invalid-this
        }, throttledZoomThrottle)
    },
    render() {
        return null;
    }
};
</script>
