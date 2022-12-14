<script>
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';

import { getSpaceItems } from '@api';
import LoadingIcon from './LoadingIcon.vue';
import FileExplorer from './FileExplorer.vue';

const DISPLAY_LOADING_DELAY = 500;

const encodeId = (id) => `#${encodeURIComponent(id)}`;

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
            spaceDirectoryData: null,
            isLoading: false
        };
    },

    computed: {
        breadcrumbItems() {
            if (!this.spaceDirectoryData) {
                return [];
            }

            const { pathIds, pathNames } = this.spaceDirectoryData;
            const rootBreadcrumb = { text: 'Home', id: 'root', href: encodeId('root') };
            const lastPathIndex = pathIds.length - 1;

            return [rootBreadcrumb].concat(
                pathIds.map((pathId, index) => ({
                    text: pathNames[index],
                    id: pathId,
                    href: index === lastPathIndex ? null : encodeId(pathId)
                }))
            );
        },

        fullPath() {
            if (!this.spaceDirectoryData) {
                return '';
            }
            const { pathNames } = this.spaceDirectoryData;
            return ['home'].concat(pathNames).join('/');
        }
    },

    async created() {
        await this.fetchSpaceItems('root');
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

        async fetchSpaceItems(spaceDirectoryId) {
            this.setLoading(true);

            this.spaceDirectoryData = await getSpaceItems({ spaceId: 'local', itemId: spaceDirectoryId });
            
            this.setLoading(false);
        },

        onChangeDirectory(pathId) {
            const isGoingBack = pathId === '..';

            // when we're down to 1 item it means we're 1 level away from the root
            const getParentDirectoryId = (pathIds) => pathIds.length === 1 ? 'root' : pathIds[pathIds.length - 2];

            const nextSpaceDirectoryId = isGoingBack
                ? getParentDirectoryId(this.spaceDirectoryData.pathIds)
                : pathId;

            this.fetchSpaceItems(nextSpaceDirectoryId);
        },

        onBreadcrumbClick({ target }) {
            if (!target || !target.href) {
                return;
            }
            
            const { hash } = new URL(target.href);
            const directoryId = decodeURIComponent(hash.replace(/^#/, ''));
            this.fetchSpaceItems(directoryId);
        }
    }
};
</script>

<template>
  <div :class="mode">
    <div class="breadcrumb-wrapper">
      <Breadcrumb
        class="breacrumb"
        :items="breadcrumbItems"
        @click.capture.prevent.stop.native="onBreadcrumbClick"
      />
    </div>

    <FileExplorer
      v-if="spaceDirectoryData && !isLoading"
      :mode="mode"
      :full-path="fullPath"
      :items="spaceDirectoryData.items"
      :is-root-folder="spaceDirectoryData.pathIds.length === 0"
      @change-directory="onChangeDirectory"
    />

    <div
      v-else
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

  & .breadcrumb {
    padding-bottom: 0px;
  }
}

.mini {
  padding: 20px 15px;
  height: 100%;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  & svg {
    @mixin svg-icon-size 30;

    stroke: var(--knime-masala);
  }
}

</style>
