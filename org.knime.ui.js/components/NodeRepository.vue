<script>
import { searchNodes, getNodeTemplates, selectNodes } from '~/api';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';

const nodeSearchPageSize = 50;
const nodeSearchTagsLimit = 10;
const nodeSelectionTagsLimit = 4;
const nodeSelectionNumNodesPerTag = 6;

export default {
    components: {
        NodePreview
    },
    data() {
        return {
            nodes: [],
            nodeSelections: [],
            nodeTemplatesCache: {},
            numNodes: 0,
            numSelections: 0,
            selectedTags: [],
            tags: [],
            query: '',
            timer: null,
            nodeSearchPage: 0,
            nodeSelectionPage: 0
        };
    },
    mounted() {
        this.selectNodes(false);
    },
    methods: {
        searchDelayed() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            this.timer = setTimeout(() => {
                this.searchNodes(false);
            }, 200);
        },
        searchNodes(append) {
            if (this.selectedTags.length === 0 && this.query === '') {
                this.selectNodes(false);
                return;
            } else {
                this.nodeSelections = [];
            }
            if (!append) {
                this.nodeSearchPage = 0;
            }
            searchNodes(
                this.query,
                this.selectedTags,
                true,
                this.nodeSearchPage * nodeSearchPageSize,
                nodeSearchPageSize,
                nodeSearchTagsLimit,
                false
            ).then(res => {
                this.numNodes = res.totalNumNodes;
                if (append) {
                    res.nodes.forEach(e => this.nodes.push(e));
                } else {
                    this.nodes = res.nodes;
                }
                this.tags = res.tags;
                this.updateNodeTemplatesCache();
            });
        },
        updateNodeTemplatesCache() {
            let missingTemplates;
            if (this.nodes.length !== 0) {
                missingTemplates = this.nodes.map(n => n.id).filter(id => !this.nodeTemplatesCache.hasOwnProperty(id));
            } else if (this.nodeSelections.length !== 0) {
                missingTemplates = this.nodeSelections
                    .flatMap(s => s.nodes)
                    .map(n => n.id)
                    .filter(id => !this.nodeTemplatesCache.hasOwnProperty(id));
            }
            getNodeTemplates(missingTemplates).then(res => {
                this.nodeTemplatesCache = { ...this.nodeTemplatesCache, ...res };
            });
        },
        selectNodes(append) {
            if (!append) {
                this.nodeSelectionPage = 0;
            }
            selectNodes(
                nodeSelectionNumNodesPerTag,
                this.nodeSelectionPage * nodeSelectionTagsLimit,
                nodeSelectionTagsLimit,
                false
            ).then(res => {
                if (append) {
                    res.selections.forEach(s => this.nodeSelections.push(s));
                } else {
                    this.nodeSelections = res.selections;
                }
                this.numSelections = res.totalNumSelections;
                this.updateNodeTemplatesCache();
            });
        },
        nextNodeSearchPage() {
            this.nodeSearchPage++;
            this.searchNodes(true);
        },
        nextNodeSelectionPage() {
            this.nodeSelectionPage++;
            this.selectNodes(true);
        },
        selectTag(tag) {
            this.selectedTags.push(tag);
            this.searchNodes(false);
        },
        deselectTag(tag) {
            this.$delete(this.selectedTags, this.selectedTags.indexOf(tag));
            this.searchNodes(false);
        },
        clearSearchQuery() {
            this.query = '';
            this.searchNodes(false);
        }
    }
};
</script>
<template>
  <div>
    <input
      v-model="query"
      type="text"
      @keyup="searchDelayed"
    >
    <button @click="clearSearchQuery">clear</button>
    <div v-if="nodeSelections.length !== 0">
      Node Selection
      <div
        v-for="selection in nodeSelections"
        :key="selection.tag"
      >
        <b>{{ selection.tag }}</b>
        <div class="grid">
          <div
            v-for="n in selection.nodes"
            :key="n.id"
          >
            <div class="title">
              {{ n.name }}
            </div>
            <div
              v-if="n.id in nodeTemplatesCache"
              class="node-preview"
            >
              <NodePreview v-bind="nodeTemplatesCache[n.id]" />
            </div>
          </div>
        </div>
        <button @click="selectTag(selection.tag)">more ...</button>
      </div>
      <button
        v-if="nodeSelections.length < numSelections"
        @click="nextNodeSelectionPage"
      >
        Load more selections ...
      </button>
    </div>
    <div v-else>
      <div>total num nodes: {{ numNodes }}</div>
      <div>
        <div>
          #cached templates: {{ Object.keys(nodeTemplatesCache).length }}
          <div>
            selected tags:
            <button
              v-for="t in selectedTags"
              :key="t"
              @click="deselectTag(t)"
            >
              {{ t }}
            </button>
          </div>
          <div>
            tags:
            <button
              v-for="t in tags"
              :key="t"
              @click="selectTag(t)"
            >
              {{ t }}
            </button>
          </div>
          <div>nodes:</div>
          <div class="grid">
            <div
              v-for="n in nodes"
              :key="n.id"
            >
              <div class="title">
                {{ n.name }}
              </div>
              <div
                v-if="n.id in nodeTemplatesCache"
                class="node-preview"
              >
                <NodePreview v-bind="nodeTemplatesCache[n.id]" />
              </div>
            </div>
          </div>
          <button
            v-if="nodes.length < numNodes"
            @click="nextNodeSearchPage"
          >
            Load more ...
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="postcss" scoped>
.node-preview {
    height: 70px;
    width: 70px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
}
.grid {
    display: grid;
    grid-template-columns: 100px 100px 100px;
}
.title {
    font-size: 12px;
}
</style>
