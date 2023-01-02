<script>
import { mapState } from 'vuex';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';

import LoadingIcon from './LoadingIcon.vue';
import FileExplorer from './FileExplorer.vue';

const DISPLAY_LOADING_DELAY = 500;

export default {
    components: {
        FileExplorer,
        LoadingIcon,
        Breadcrumb
    },

    props: {
        mode: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'mini'].includes(value)
        }
    },

    data() {
        return {
            isLoading: false
        };
    },

    computed: {
        ...mapState('spaces', {
            activeWorkflowGroup: state => state.activeSpace?.activeWorkflowGroup,
            spaceId: state => state.activeSpace?.spaceId
        }),

        breadcrumbItems() {
            if (!this.activeWorkflowGroup) {
                return [];
            }

            const { path } = this.activeWorkflowGroup;
            const rootBreadcrumb = {
                text: 'Home',
                id: 'root',
                clickable: path.length > 0
            };
            const lastPathIndex = path.length - 1;

            return [rootBreadcrumb].concat(
                path.map((pathItem, index) => ({
                    text: pathItem.name,
                    id: pathItem.id,
                    clickable: index !== lastPathIndex
                }))
            );
        },

        fullPath() {
            if (!this.activeWorkflowGroup) {
                return '';
            }
            const { path } = this.activeWorkflowGroup;
            return ['home'].concat(path.map(({ name }) => name)).join('/');
        }
    },

    async created() {
        await this.fetchWorkflowGroupContent('root');
    },

    methods: {
        // Only display loader after a set waiting time, to avoid making the operations seem longer
        setLoading(value) {
            if (!value) {
                this.isLoading = false;
                clearTimeout(this.loadingTimer);
                return;
            }

            this.loadingTimer = setTimeout(() => {
                this.isLoading = true;
            }, DISPLAY_LOADING_DELAY);
        },

        async fetchWorkflowGroupContent(itemId) {
            this.setLoading(true);

            await this.$store.dispatch('spaces/fetchWorkflowGroupContent', { itemId });

            this.setLoading(false);
        },

        async onChangeDirectory(pathId) {
            this.setLoading(true);

            await this.$store.dispatch('spaces/changeDirectory', { pathId });

            this.setLoading(false);
        },

        onBreadcrumbClick({ id }) {
            this.fetchWorkflowGroupContent(id);
        }
    }
};
</script>

<template>
  <div :class="mode">
    <div class="breadcrumb-wrapper">
      <Breadcrumb
        :items="breadcrumbItems"
        @click-item="onBreadcrumbClick"
      />
    </div>

    <FileExplorer
      v-if="activeWorkflowGroup && !isLoading"
      :mode="mode"
      :items="activeWorkflowGroup.items"
      :is-root-folder="activeWorkflowGroup.path.length === 0"
      @change-directory="onChangeDirectory"
    />

    <div
      v-if="isLoading"
      class="loading"
    >
      <LoadingIcon />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

.breadcrumb-wrapper {
  position: relative;
  display: flex;
  margin-bottom: 12px;
  width: 100%;
  border-bottom: 1px solid var(--knime-silver-sand);
  overflow-x: auto;

  & .breadcrumb {
    padding-bottom: 0;
    overflow-x: auto;
    white-space: pre;
    -ms-overflow-style: none; /* needed to hide scroll bar in edge */
    scrollbar-width: none; /* for firefox */
    user-select: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

.mini {
  padding: 20px 15px;
  height: 100%;
  overflow-y: auto;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;

  & svg {
    @mixin svg-icon-size 30;

    stroke: var(--knime-masala);
  }
}

</style>
