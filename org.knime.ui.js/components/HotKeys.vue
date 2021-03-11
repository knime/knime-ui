<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { throttle } from 'lodash';

const throttledZoomThrottle = 30; // throttle keyboard zoom by 30ms

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching actions to the corresponding store.
 */
export default {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        workflowHotKeysEnabled() {
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
        ...mapActions('workflow', ['executeNodes', 'cancelNodeExecution', 'resetNodes']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        setupShortcuts() {
            this.workflowHotKeys = [
                ['Ctrl', 'A', this.selectAllNodes],
                ['Ctrl', '1', this.setZoomToFit],
                ['Ctrl', '0', this.resetZoom],
                ['Ctrl', '+', () => this.throttledZoom(1)],
                ['Ctrl', '-', () => this.throttledZoom(-1)],
                ['F7', () => this.executeNodes('selected')],
                ['F9', () => this.cancelNodeExecution('selected')],
                ['F8', () => this.resetNodes('selected')],
                ['Shift', 'F7', () => this.executeNodes('all')],
                ['Shift', 'F9', () => this.cancelNodeExecution('all')],
                ['Shift', 'F8', () => this.resetNodes('all')]
            ];
        },
        onKeydown(e) {
            // Pressed key is just a modifier
            if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta') {
                return;
            }

            if (e.key === 'Alt') {
                if (this.workflowHotKeysEnabled) {
                    this.setSuggestPanning(true);
                    e.stopPropagation();
                    e.preventDefault();
                }
                return;
            }

            if (this.workflowHotKeysEnabled) {
                this.findAndExecute(e);
            }
        },
        findAndExecute(e) {
            for (let shortcut of this.workflowHotKeys) {
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
                    e.stopPropagation();
                    e.preventDefault();
                    fn();
                    break;
                }
            }
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
