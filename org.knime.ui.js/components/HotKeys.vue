<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { throttle } from 'lodash';

const keyboardZoomThrottle = 30;

export default {
    computed: {
        ...mapState('workflow', ['activeWorkflow']),
        workflowHotKeysEnabled() {
            return Boolean(this.activeWorkflow);
        }
    },
    mounted() {
        // Start Key Listener
        this.keyDownEventListener = document.addEventListener('keydown', this.keydown);
        this.keyUpEventListener = document.addEventListener('keyup', this.keyup);
    },
    beforeDestroy() {
        // Stop Key listener
        document.removeEventListener('keydown', this.keyDownEventListener);
        document.removeEventListener('keyup', this.keyUpEventListener);
    },
    methods: {
        ...mapMutations('workflow', ['selectAllNodes', 'deselectAllNodes']),
        ...mapMutations('canvas', ['setSuggestPanning', 'resetZoom']),
        ...mapActions('canvas', ['setZoomToFit', 'zoomCentered']),
        keydown(e) {
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
                    this.keyboardZoom(1);
                } else if (e.key === '-') {
                    this.keyboardZoom(-1);
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
        keyup(e) {
            if (e.key === 'Alt') {
                this.setSuggestPanning(false);
            }
        },
        /**
         * zoom in by keyboard is throttled
         * after zoomCentered it takes time for the scroller-container
         * to update its scoll position according to the store state
         * and to save that position in the store again
         */
        keyboardZoom: throttle(function (delta) {
            this.zoomCentered(delta);
        }, keyboardZoomThrottle)
    },
    render() {
        return null;
    }
};
</script>
