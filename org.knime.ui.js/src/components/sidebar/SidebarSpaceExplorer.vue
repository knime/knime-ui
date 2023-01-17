<script>
import SpaceExplorer from '@/components/spaces/SpaceExplorer.vue';
import { mapState } from 'vuex';

export default {
    components: {
        SpaceExplorer
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId']),
        ...mapState('spaces', ['lastItemForProject']),

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
        async loadSpaceState() {
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
                console.log('workaround', this.lastItemForProject[this.activeProjectId], JSON.stringify(this.lastItemForProject));
                // Workaround until we have the full path in origin - we just assume this was opened via the start page
                await this.$store.dispatch('spaces/loadSpaceBrowserState');
                await this.$store.dispatch('spaces/saveCurrentItemForProject');
                console.log('item after workaround: ', this.lastItemForProject[this.activeProjectId]);
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
