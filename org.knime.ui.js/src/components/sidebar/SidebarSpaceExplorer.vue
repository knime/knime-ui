<script>
import SpaceExplorer from '@/components/spaces/SpaceExplorer.vue';
import { mapGetters, mapState } from 'vuex';

export default {
    components: {
        SpaceExplorer
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId']),
        ...mapState('spaces', ['lastItemForProject']),
        ...mapGetters('spaces', ['currentWorkflowGroupId']),

        activeProjectOrigin() {
            return this.openProjects.find(p => p.projectId === this.activeProjectId)?.origin;
        }
    },
    watch: {
        activeProjectId: {
            handler(newId, oldId) {
                if (newId && oldId !== newId) {
                    console.log('activeProjectId changed call loadSpaceState', newId);
                    this.loadSpaceState();
                }
            },
            immediate: true
        }
    },
    methods: {
        loadSpaceState() {
            if (!this.activeProjectOrigin) {
                return;
            }
            // load spaces state state
            if (this.activeProjectOrigin.providerId) {
                this.$store.commit('spaces/setActiveSpaceProviderById', this.activeProjectOrigin.providerId);
            }
            this.$store.commit('spaces/setActiveSpaceId', this.activeProjectOrigin.spaceId);

            const lastItemId = this.lastItemForProject[this.activeProjectId];
            if (lastItemId) {
                this.$store.commit('spaces/setStartItemId', lastItemId);
            } else {
                // we need to set something otherwise the old item will stay (and might be of a different space)
                this.$store.commit('spaces/setStartItemId', this.currentWorkflowGroupId);
                // TODO: this needs to be implemented by the backend in https://knime-com.atlassian.net/browse/NXT-1432
                // this.$store.commit('spaces/setStartItemId', this.activeProjectOrigin.parentItems[1]);
            }
        },
        async onItemChanged(itemId) {
            console.log('SidebarSpaceExplorer onItemChanged', itemId);
            await this.$store.dispatch('spaces/saveCurrentItemForProject', { itemId });
        }
    }
};
</script>

<template>
  <SpaceExplorer
    mode="mini"
    @item-changed="onItemChanged"
  />
</template>
