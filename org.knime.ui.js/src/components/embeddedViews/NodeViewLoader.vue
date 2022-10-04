<script>
import { mapGetters, mapState } from 'vuex';
import { getNodeView } from '@api';

import singleViewPage from './singleViewPage.json';
import { loadPageBuilder } from './pagebuilderLoader';

/**
 * Renders a node view via the PageBuilder component
 */
export default {
    data() {
        return {
            pageBuilderComponent: null,
            isReady: false
        };
    },

    computed: {
        ...mapState('application', { projectId: 'activeProjectId' }),
        ...mapState('workflow', { workflowId: state => state.activeWorkflow.info.containerId }),
        ...mapGetters('selection', { selectedNode: 'singleSelectedNode' }),
        
        hasView() {
            return Boolean(this.selectedNode?.hasView);
        }
    },

    watch: {
        selectedNode: {
            handler(newNode) {
                // if (!this.showDialog && newNode === null && oldNode.hasView) {
                //     // TODO remove selection event listener if
                //     // * node views are shown (instead of dialogs)
                //     // * no other node is selected
                //     // * the previous node had a view
                // }

                if (newNode?.hasView) {
                    this.loadContent(newNode.id);
                }
            }
        }
    },

    async created() {
        try {
            this.$emit('state-change', { state: 'loading', message: 'Loading view' });

            this.pageBuilderComponent = await loadPageBuilder({ window, store: this.$store });
            await this.loadContent();
        
            this.isReady = true;
            this.$emit('state-change', { state: 'ready' });
        } catch (error) {
            this.$emit('state-change', { state: 'error', message: error });
        }
    },
    
    methods: {
        async loadContent() {
            try {
                if (!this.selectedNode) {
                    return;
                }

                const nodeView = await getNodeView(this.projectId, this.workflowId, this.selectedNode.id);

                const page = JSON.parse(JSON.stringify(singleViewPage));
                page.wizardPageContent.nodeViews.ROOT = nodeView;
                
                // eslint-disable-next-line consistent-return
                return this.$store.dispatch('pagebuilder/setPage', { page });
            } catch (error) {
                consola.log('Error loading view content', error);
                throw error;
            }
        }
    }
    
};
</script>

<template>
  <Component
    :is="pageBuilderComponent"
    v-if="isReady"
    class="page-builder"
  />
</template>

<style lang="postcss" scoped>
.page-builder {
  & >>> .node-view {
    & .view-container {
        height: unset;
    }
  }
}
</style>

