<script>
import LoadingIcon from './LoadingIcon.vue';
import FileTree from './FileTree.vue';

import { getSpaceDataByPath } from './mock-data';

const DISPLAY_LOADING_DELAY = 500;

export default {
    components: {
        FileTree,
        LoadingIcon
    },

    data() {
        return {
            path: ['root'],
            directoryData: null,
            isLoading: false
        };
    },

    async created() {
        await this.fetchDirectoryData(this.path);
    },

    methods: {
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

        async fetchDirectoryData(path) {
            this.setLoading(true);
            this.directoryData = await getSpaceDataByPath(path);
            this.setLoading(false);
            this.path = path;
        },

        getTypeIcon(child) {
            return child.isLeaf ? this.typeIcons.Workflow : this.typeIcons.WorkflowGroup;
        }
    }
};
</script>

<template>
  <div class="content">
    <FileTree
      v-if="directoryData && !isLoading"
      :tree="directoryData"
      :path="path"
      @change-directory="fetchDirectoryData"
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
/* TODO: maybe reuse later in other parts of the app */
@define-mixin svg-icon $size {
  width: calc($size * 1px);
  height: calc($size * 1px);
  stroke-width: calc(32px / $size);
  @mixin-content;
}

.content {
  padding: 20px 15px;
  height: 100%;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  & svg {
    @mixin svg-icon 30;
    stroke: var(--knime-masala);
  }
}

</style>
