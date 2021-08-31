<script>
import { mapState } from 'vuex';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import Button from '~/webapps-common/ui/components/Button';


export default {
    components: {
        NodePreview,
        Button
    },
    filters: {
        shorterLabel(value) {
            if (value.length > 26) {
                return `${value.substring(0, 25)}...`;
            }
            return value;
        }
    },
    props: {
        category: {
            type: Object,
            default() {
                return {};
            },
            required: true
        },
        nodeAmount: {
            type: Number,
            default() {
                return 0;
            }
        }
    },
    computed: {
        ...mapState('nodeRepo', [
            'nodeTemplates',
            'selectedTags'
        ]),
        nodeRows() {
            let rows = [];
            const N_PER_ROW = 3;
            const N_ROWS = this.category.nodes.length / N_PER_ROW;
            for (let i = 0; i < N_ROWS; i++) {
                let row = [];
                let rowInd = i * N_PER_ROW;
                if (rowInd < this.category.nodes.length) {
                    for (let n = 0; n < N_PER_ROW; n++) {
                        let nodeInd = rowInd + n;
                        if (nodeInd < this.category.nodes.length) {
                            row.push(this.category.nodes[nodeInd]);
                        }
                    }
                    rows.push(row);
                }
            }
            return rows;
        }
    },
    methods: {
        selectMoreNodes() {
            this.$store.dispatch('nodeRepo/selectTag', this.category.tag);
        }
    }
};
</script>

<template>
  <div class="category">
    <span
      v-if="category.tag"
      class="category-title"
    >
      {{ category.tag }}
    </span>
    <div class="nodes-container">
      <div
        v-for="(row, ind) in nodeRows"
        :key="ind"
        class="row"
      >
        <span
          v-for="nodeId in row"
          :key="nodeId.id"
          class="node"
        >
          <label
            :title="nodeTemplates[nodeId.id].name"
            class="label"
          >
            {{ nodeTemplates[nodeId.id].name | shorterLabel }}
          </label>
          <NodePreview v-bind="nodeTemplates[nodeId.id]" />
        </span>
      </div>
    </div>
    <template v-if="category.nodes.length === 6">
      <Button
        compact
        with-border
        class="show-more"
        @click="selectMoreNodes"
      >
        More "{{ category.tag }}" nodes
      </Button>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.category {
  margin: 0;
  font-family: "Roboto Condensed", sans-serif;
  user-select: none;

  & .category-title {
    border: 1px solid var(--knime-dove-gray);
    margin-right: 5px;
    margin-bottom: 13px;
    margin-top: 13px;
    padding: 4px 6px;
    line-height: 15px;
    display: inline-block;
    font-weight: 500;
    font-size: 18px;
    color: var(--knime-dove-gray);
  }

  & .nodes-container {
    margin-bottom: 13px;

    & .row {
      display: flex;
      flex-wrap: wrap;
      margin-right: -5px;
      margin-left: -5px;

      & .node {
        width: 100px;
        height: 75px;
        margin: 0 5px;
        padding-bottom: 42px;
        position: relative;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        font-size: 12px;
        font-weight: 700;
        text-align: center;

        & label {
          max-height: 26px;
          max-width: 100px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        & svg {
          width: 70px;
          position: absolute;
          bottom: -15px;
        }
      }
    }
  }
  & .show-more {
    color: var(--knime-masala);
    font-weight: 400;
    margin: 0px auto 10px;
    display: block;
  }
}
/* .category-title {
  border: 1px solid var(--knime-dove-gray);
  margin-right: 5px;
  margin-bottom: 13px;
  margin-top: 13px;
  padding: 4px 6px;
  line-height: 17px;
  display: inline-block;
  font-weight: 500;
  font-size: 18px;
  color: var(--knime-dove-gray);
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -5px;
  margin-left: -5px;
}
.node {
  height: 70px;
  margin: 0 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  width: 100px;
}

.label {
  justify-self: flex-end;
  word-wrap: break-word;
}

.preview {
  height: 60px;
} */
</style>
