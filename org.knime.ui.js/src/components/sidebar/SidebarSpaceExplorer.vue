<script>
import SpaceExplorer from '@/components/spaces/SpaceExplorer.vue';
import { mapState } from 'vuex';
import { isArray } from 'lodash';

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
        activeProjectId(newId, oldId) {
            if (oldId !== newId) {
                console.log('activeProjectId changed call loadSpaceState', newId);
                this.loadSpaceState();
            }
        }
    },
    beforeMount() {
        this.loadSpaceState();
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
                // Workaround until we have the full path in origin - we just assume this was opened via the start page
                this.$store.commit('spaces/loadSpaceBrowserState');
                this.$store.dispatch('spaces/saveCurrentItemForProject', this.activeProjectId);
                // TODO: this needs to be implemented by the backend in https://knime-com.atlassian.net/browse/NXT-1432
                // this.$store.commit('spaces/setStartItemId', this.activeProjectOrigin.parentItems[1]);
            }
        },
        onItemChanged(itemId) {
            this.$store.dispatch('spaces/saveCurrentItemForProject', {
                projectId: this.activeProjectId
            });
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
