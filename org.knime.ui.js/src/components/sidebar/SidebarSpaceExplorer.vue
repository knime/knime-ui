<script>
import SpaceExplorer from '@/components/spaces/SpaceExplorer.vue';
import { mapGetters, mapState } from 'vuex';

export default {
    components: {
        SpaceExplorer
    },
    computed: {
        ...mapState('application', ['openProjects', 'activeProjectId']),
        ...mapState('spaces', ['lastItemForProject', 'activeSpace', 'activeSpaceProvider']),
        ...mapGetters('spaces', ['currentWorkflowGroupId']),

        activeProjectOrigin() {
            return this.openProjects.find(p => p.projectId === this.activeProjectId)?.origin;
        }
    },
    watch: {
        activeProjectId: {
            handler(newId, oldId) {
                if (newId && oldId !== newId) {
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

            this.$store.commit('spaces/setActiveSpaceProviderById', this.activeProjectOrigin.providerId);
            this.$store.commit('spaces/setActiveSpaceId', this.activeProjectOrigin.spaceId);

            const lastItemId = this.lastItemForProject[this.activeProjectId];
            const [parentItemId = 'root'] = this.activeProjectOrigin.ancestorItemIds;

            this.$store.commit('spaces/setStartItemId', lastItemId || parentItemId);

            // clear data which triggers re-fetch (do this after the new space/provider/item id is set)
            this.$store.commit('spaces/setActiveWorkflowGroupData', null);
        },
        async onItemChanged(itemId) {
            await this.$store.dispatch('spaces/saveLastItemForProject', { itemId });
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
