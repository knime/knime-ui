<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { throttle } from 'lodash';

const throttledZoomThrottle = 30; // throttle keyboard zoom by 30ms

/**
 * This Component handles keyboard shortcuts by listening to keydown/up-Events
 * on document and dispatching actions to the corresponding store.
 *
 * Shortcuts
 *      Ctrl-A: Select all nodes
 *      Ctrl-0: Reset zoom (100%)
 *      Ctrl-1: Zoom to fit
 *      Ctrl +: Zoom in
 *      Ctrl -: Zoom out
 * pressed Alt: Suggest panning to the user by changing cursor
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
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', this.onKeydown);
        document.removeEventListener('keyup', this.onKeyup);
    },
    methods: {
        ...mapMutations('workflow', ['selectAllNodes', 'deselectAllNodes']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        onKeydown(e) {
            // currently, there are only workflow hotkeys
            if (!this.workflowHotKeysEnabled) {
                return;
            }

            let handled = true;
            if (e.ctrlKey || e.metaKey) {
                // Ctrl- and Meta- Combinations
                if (e.key === 'a') {
                    this.selectAllNodes();
                } else if (e.key === '0') {
                    this.resetZoom();
                } else if (e.key === '1') {
                    this.setZoomToFit();
                } else if (e.key === '+') {
                    this.throttledZoom(1);
                } else if (e.key === '-') {
                    this.throttledZoom(-1);
                } else {
                    handled = false;
                }
            } else if (e.key === 'Alt') {
                this.setSuggestPanning(true);
            } else {
                handled = false;
            }
            
            if (handled) {
                e.stopPropagation();
                e.preventDefault();
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
