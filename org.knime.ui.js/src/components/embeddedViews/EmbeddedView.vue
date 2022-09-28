<script>
import Vue from 'vue';
import { mapGetters, mapState } from 'vuex';
import { getNodeView, getNodeDialog } from '@api';

import singleViewPage from './singleViewPage.json';
import { loadPageBuilder } from './pagebuilderLoader';

export default {
    props: {
        kind: {
            type: String,
            default: 'node-view',
            validator: (value) => ['node-view', 'node-dialog'].includes(value)
        }
    },

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
            handler(newNode, oldNode) {
                if (!this.showDialog && newNode === null && oldNode.hasView) {
                    // TODO remove selection event listener if
                    // * node views are shown (instead of dialogs)
                    // * no other node is selected
                    // * the previous node had a view
                }

                const shouldShowDialog = this.kind === 'node-dialog' && newNode?.hasDialog;
                const shouldShowView = this.kind === 'node-view' && newNode?.hasView;

                if (shouldShowDialog || shouldShowView) {
                    this.loadContent(newNode.id);
                }
            }
        }
    },

    async created() {
        try {
            this.$emit('state-change', { state: 'loading', message: 'Loading view' });
        
            this.pageBuilderComponent = await loadPageBuilder(this.$store, Vue);
            await this.loadContent();
        
            this.isReady = true;
            this.$emit('state-change', { state: 'ready' });
        } catch (error) {
            this.$emit('state-change', { state: 'error', message: error });
        }
    },
    
    methods: {
        async loadContent() {
            const nodeId = this.selectedNode.id;

            const nodeDialogOrView = this.kind === 'node-dialog'
                ? await getNodeDialog(this.projectId, this.workflowId, nodeId)
                : await getNodeView(this.projectId, this.workflowId, nodeId);
        
            const page = JSON.parse(JSON.stringify(singleViewPage));
            
            page.wizardPageContent.nodeViews.SINGLE = nodeDialogOrView;
            return this.$store.dispatch('pagebuilder/setPage', { page });
        }
    }
    
};
</script>

<template>
  <Component
    :is="pageBuilderComponent"
    v-if="isReady"
  />
</template>

