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

            // current space is the same as the space of the open project
            const sameSpace = this.activeProjectOrigin.spaceId === this.activeSpace?.spaceId &&
                    this.activeProjectOrigin.providerId === this.activeSpaceProvider?.id;

            // load spaces state
            if (!sameSpace) {
                this.$store.commit('spaces/setActiveSpaceProviderById', this.activeProjectOrigin.providerId);
                this.$store.commit('spaces/setActiveSpaceId', this.activeProjectOrigin.spaceId);
            }

            const lastItemId = this.lastItemForProject[this.activeProjectId];
            if (lastItemId) {
                this.$store.commit('spaces/setStartItemId', lastItemId);
            } else {
                // we need to set something otherwise the old item will stay (and might be of a different space)
                // same space, so we can use the current itemId
                let startItemId = sameSpace ? this.currentWorkflowGroupId : 'root';

                this.$store.commit('spaces/setStartItemId', startItemId);
                this.$store.dispatch('spaces/saveLastItemForProject', { itemId: startItemId });
                // TODO: this needs to be implemented by the backend in https://knime-com.atlassian.net/browse/NXT-1432
                //       and can then replace the workaround above
                // this.$store.commit('spaces/setStartItemId', this.activeProjectOrigin.parentItems[1]);
            }
            // clear data which triggers refetch (do this after the new space/provider/item id is set)
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
