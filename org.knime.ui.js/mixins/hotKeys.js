import { mapActions, mapMutations, mapState, mapGetters } from 'vuex';
import { throttle } from 'lodash';

const throttledZoomThrottle = 30; // throttle keyboard zoom by 30ms

const blacklistTagNames = /^(input|textarea|select)$/i;

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching actions to the corresponding store.
 */
export const hotKeys = {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        ...mapState('canvas', ['suggestPanning']),
        ...mapGetters('selection', ['selectedNodes']),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('userActions', ['hotKeyItems']),
        isWorkflowPresent() {
            // workflow hotkeys are enabled only if a workflow is present
            return Boolean(this.activeWorkflow);
        },
        selectedNode() {
            const selectedNodes = this.selectedNodes;
            if (selectedNodes.length === 1) {
                return selectedNodes[0];
            }
            return null;
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
        window.removeEventListener('blur', this.windowBlurListener);
    },
    methods: {
        ...mapActions('selection', ['selectAllNodes']),
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes', 'deleteSelectedObjects',
            'undo', 'redo', 'openView', 'openDialog', 'stepLoopExecution', 'resumeLoopExecution',
            'pauseLoopExecution']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        setupShortcuts() {
            this.hotKeys = {
                canvas: {
                    condition: () => this.isWorkflowPresent,
                    hotKeys: [
                        [...this.hotKeyItems.zoomToFit, this.setZoomToFit],
                        [...this.hotKeyItems.resetZoom, this.resetZoom],
                        [...this.hotKeyItems.zoomIn, () => this.throttledZoom(1)],
                        [...this.hotKeyItems.zoomOut, () => this.throttledZoom(-1)]
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
                        [...this.hotKeyItems.resetAllNodes, () => this.resetNodes('all')],
                        [...this.hotKeyItems.undo, () => this.undo()],
                        [...this.hotKeyItems.redo, () => this.redo()]
                    ]
                },
                singleSelectedNode: {
                    condition: () => this.selectedNode,
                    hotKeys: [
                        [...this.hotKeyItems.openDialog, () => this.openDialog(this.selectedNode.id)],
                        [...this.hotKeyItems.openView, () => this.openView(this.selectedNode.id)],
                        [...this.hotKeyItems.stepLoopExecution, () => this.stepLoopExecution(this.selectedNode.id)],
                        [...this.hotKeyItems.resumeLoopExecution,
                            () => this.resumeLoopExecution(this.selectedNode.id)],
                        [...this.hotKeyItems.pauseLoopExecution,
                            () => this.pauseLoopExecution(this.selectedNode.id)]
                    ]
                },
                writableWorkflow: {
                    condition: () => this.isWorkflowPresent && this.isWritable,
                    hotKeys: [
                        [...this.hotKeyItems.deleteDel, this.deleteSelectedObjects],
                        [...this.hotKeyItems.deleteBackspace, this.deleteSelectedObjects]
                    ]
                }

            };
        },
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
            if (blacklistTagNames.test(e.target.tagName)) {
                return;
            }

            if (e.key === 'Alt') {
                this.setSuggestPanning(false);
            }
        },
        throttledZoom: throttle(function (delta) {
            this.zoomCentered(delta); // eslint-disable-line no-invalid-this
        }, throttledZoomThrottle)
    }
};
