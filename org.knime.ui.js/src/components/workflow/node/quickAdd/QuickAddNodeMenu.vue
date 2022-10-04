<script>
import SearchBar from '@/components/common/SearchBar.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';

import PlusIcon from 'webapps-common/ui/assets/img/icons/circle-plus.svg';

import { mapActions, mapGetters, mapState } from 'vuex';
import { flatten } from 'lodash';

const MAX_NODES = 12;

export default {
    components: {
        SearchBar,
        PlusIcon,
        NodePreview,
        FloatingMenu
    },
    props: {
        /** direction of the port and the connector coming out of it: in-coming or out-going */
        direction: {
            type: String,
            required: true,
            validator: (t) => ['in', 'out'].includes(t)
        },
        nodeId: {
            type: String,
            required: true
        },
        position: {
            type: Object,
            required: true,
            validator: ({ x, y }) => typeof x === 'number' && typeof y === 'number'
        },
        port: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            searchQuery: ''
        };
    },
    computed: {
        ...mapState('nodeRepository', ['nodesPerCategory']),
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapGetters('workflow', ['isWritable']),
        nodes() {
            let result = flatten(this.nodesPerCategory.map(category => category.nodes));
            // filter nodes by in/out ports; ignore flow vars
            if (this.port.side === 'in') {
                result = result.filter(n => this.filterPorts(n.outPorts).length > 0);
            } else {
                result = result.filter(n => this.filterPorts(n.inPorts).length > 0);
            }
            if (this.searchQuery && this.searchQuery !== '') {
                result = result.filter(x => this.search(x.name, this.searchQuery));
            }
            return result.slice(0, MAX_NODES);
        },
        canvasPosition() {
            let pos = { ...this.position };
            const halfPort = this.$shapes.portSize / 2;

            // make -> arrow fully visible
            if (this.direction === 'out') {
                pos.x += halfPort;
            } else {
                pos.x -= halfPort;
            }
            // move down to the plus
            pos.y -= 36;

            return pos;
        }
    },
    mounted() {
        this.$refs.innerDiv?.focus();
        // we currently just get some nodes, this should be done via a new endpoint
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', { append: false });
        }
    },
    methods: {
        ...mapActions('workflow', {
            addNodeToWorkflow: 'addNode',
            connectNodes: 'connectNodes'
        }),
        async addNode(nodeTemplate) {
            if (!this.isWritable) {
                return; // end here
            }
            let position = this.position;
            const nodeFactory = nodeTemplate.nodeFactory;
            // TODO: NXT-1205 use backend to provide nodeId of just added node
            let nodeIdsBefore = Object.keys(this.workflow.nodes);
            await this.addNodeToWorkflow({
                position,
                nodeFactory
            });
            setTimeout(() => {
                let nodeIdsAfter = Object.keys(this.workflow.nodes);
                let newNodeId = nodeIdsAfter.filter(x => !nodeIdsBefore.includes(x))[0];
                this.autoConnectNodes(newNodeId);
                this.$emit('menu-close');
            }, 200);
        },
        filterPorts(ports) {
            let flowVarType = 'org.knime.core.node.port.flowvariable.FlowVariablePortObject';
            return ports.filter(p => p.typeId !== flowVarType);
        },
        autoConnectNodes(newNodeId) {
            let node = this.workflow.nodes[newNodeId];
            // TODO: improve this; find out compatible ports?
            let flowVarType = 'org.knime.core.node.port.flowvariable.FlowVariablePortObject';
            let inPort = this.filterPorts(node.inPorts)[0];
            let outPort = this.filterPorts(node.outPorts)[0];
            // we moved from an in port (so [new node]>--->[present node])
            if (this.port.side === 'in') {
                if (!outPort) {
                    return;
                }
                this.connectNodes({
                    sourceNode: newNodeId,
                    sourcePort: outPort.index,
                    destNode: this.nodeId,
                    destPort: this.port.index
                });
            } else {
                // we moved from an out port (so [present node]>---->[new node])
                if (!inPort) {
                    return;
                }
                this.connectNodes({
                    sourceNode: this.nodeId,
                    sourcePort: this.port.index,
                    destNode: newNodeId,
                    destPort: inPort.index
                });
            }
        },
        search(haystack, needle) {
            // TODO: use Fuse search (see fuzzyPortTypeSearch)
            let hay = haystack.toLowerCase();
            let i = 0;
            let n = -1;
            let l;
            needle = needle.toLowerCase();
            // eslint-disable-next-line no-cond-assign
            for (; l = needle[i++];) {
                // eslint-disable-next-line no-bitwise
                if (!~(n = hay.indexOf(l, n + 1))) {
                    return false;
                }
            }
            return true;
        }
    }
};
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    :anchor="direction === 'in' ? 'top-right' : 'top-left'"
    aria-label="Quick add node"
    prevent-overflow
    @menu-close="$emit('menu-close')"
  >
    <div
      ref="innerDiv"
      tabindex="0"
    >
      <SearchBar
        v-model="searchQuery"
        placeholder="Filter Nodes"
        class="search-bar"
      >
        <template #lens-icon>
          <PlusIcon />
        </template>
      </SearchBar>
      <div
        class="results"
      >
        <div class="content">
          <h3>Recommended</h3>
          <ul class="nodes">
            <li
              v-for="node in nodes"
              :key="node.id"
            >
              <div
                class="node"
                tabindex="0"
                @keydown.enter.stop.prevent="addNode(node, $event)"
                @click="addNode(node, $event)"
              >
                <label :title="node.name">{{ node.name }}</label>
                <NodePreview
                  class="node-preview"
                  :type="node.type"
                  :in-ports="node.inPorts"
                  :out-ports="node.outPorts"
                  :icon="node.icon"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.quick-add-node {
  width: 360px;
  box-shadow: 0 1px 6px 0 var(--knime-gray-dark-semi);
  background: var(--knime-gray-ultra-light);
  padding: 0.5em;

  &:focus {
    outline: none;
  }

  & .results {
    overflow-y: auto;
    max-height: calc(100% - 50px);

    & .content {
      padding: 0 10px 15px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;

      & h3 {
        font-family: "Roboto Condensed", sans-serif;
        font-weight: normal;
        font-size: 16px;
        margin: 0 10px;
      }
    }
  }

  & .search-bar {
    margin: 10px 10px 25px;

    & >>> .lens-icon {
      background: #e6f5e7;
      border: 1px dashed var(--knime-stone-gray);
      margin: -1px 3px -1px -1px;

      & svg {
        fill: white;
      }
    }
  }

  & .nodes {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    margin: 0 -5px;
    list-style-type: none;

    & .node {
      width: 100px;
      height: 78px;
      margin: 0 2px;
      padding-bottom: 47px;
      position: relative;
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      text-align: center;

      & label {
        max-height: 26px;
        max-width: 90px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        pointer-events: none;
      }

      & .node-preview {
        padding-bottom: 6px;
      }

      & svg {
        width: 70px;
        position: absolute;
        bottom: -15px;
        right: 15px;
      }

      &:hover {
        cursor: pointer;

        & .node-preview {
          filter: url(#node-torso-shadow);
        }
      }

      &:focus {
        outline: 0;
        /* outline with border-radius is not working properly in Safari and CEF */
        box-shadow: 0 0 0 calc(var(--selected-node-stroke-width-shape) * 1px) var(--selection-active-border-color);
        border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
        background-color: var(--selection-active-background-color);
      }
    }
  }
}
</style>
