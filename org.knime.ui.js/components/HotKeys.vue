<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { throttle } from 'lodash';

const throttledZoomThrottle = 30; // throttle keyboard zoom by 30ms

export default {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        workflowHotKeysEnabled() {
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
            if (!this.activeWorkflow) {
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
            // eslint-disable-next-line no-invalid-this
            this.zoomCentered(delta);
        }, throttledZoomThrottle)
    },
    render() {
        return null;
    }
};
</script>
