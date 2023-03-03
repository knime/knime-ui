<script>
import { mapActions, mapGetters, mapState } from 'vuex';
import { getNodeRecommendations, openWorkflowCoachPreferencePage, searchNodes } from '@api';

import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import { toNodeWithFullPorts } from '@/util/portDataMapper';
import { checkPortCompatibility } from '@/util/compatibleConnections';
import { portPositions } from '@/util/portShift';
import SearchBar from '@/components/common/SearchBar.vue';

const MAX_NODES = 12;
const NODES_PER_ROW = 3;
const NODE_SEARCH_LIMIT = 100;

const calculatePortOffset = ({ targetPorts, sourcePort, availablePortTypes }) => {
    const targetPortIndex = targetPorts.findIndex(toPort => checkPortCompatibility({
        fromPort: sourcePort,
        toPort,
        availablePortTypes
    }));

    const portCount = targetPorts.length + 1; // +1 for the mickey mouse port
    const positions = portPositions({ portCount });

    if (targetPortIndex === -1 && sourcePort.index === 0) {
        // will be a mickey mouse to mickey mouse flow port connection
        // NOTE: the index 0 is always the red mickey mouse port for nodes that
        // are on the workflow, NOT for them in the repo! They lack those ports completely.
        // TODO: fix the inconsistency with NXT-1489
        return positions[0];
    } else {
        return positions[targetPortIndex + 1];
    }
};

/*
 * Quick Add Node Menu: Shows a menu with recommended nodes that are provided by the api (based on usage statistics).
 * This component fetches, displays and adds them to the workflow.
 */
export default {
    components: {
        SearchBar,
        NodePreview,
        Button,
        FloatingMenu
    },
    props: {
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
    emits: ['menuClose'],
    data() {
        return {
            recommendedNodes: [],
            searchResult: [],
            searchQuery: ''
        };
    },
    mounted() {
        this.$refs.search?.focus();
    },
    computed: {
        ...mapState('application', ['availablePortTypes', 'hasNodeRecommendationsEnabled']),
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('canvas', ['zoomFactor']),
        ...mapGetters('workflow', ['isWritable']),
        canvasPosition() {
            let pos = { ...this.position };
            const halfPort = this.$shapes.portSize / 2;

            // x: align with the port arrow (position is the center of the port)
            // assume direction == out
            pos.x += halfPort;

            return pos;
        },
        ghostSizeZoomed() {
            return this.$shapes.addNodeGhostSize * this.zoomFactor;
        },
        hasResults() {
            return this.searchResult.length > 0 || this.recommendedNodes.length > 0;
        },
        nodes() {
            if (this.searchResult.length > 0) {
                return this.searchResult;
            }
            if (this.recommendedNodes.length > 0) {
                return this.recommendedNodes;
            }
            return [];
        }
    },
    watch: {
        hasNodeRecommendationsEnabled: {
            immediate: true,
            handler() {
                if (this.hasNodeRecommendationsEnabled) {
                    this.fetchRecommendedNodes();
                }
            }
        },
        searchQuery() {
            // TODO: delay/thorttle this, look into NodeRepo
            this.fetchSearchResults();
        }
    },
    methods: {
        ...mapActions('workflow', { addNodeToWorkflow: 'addNode' }),
        openWorkflowCoachPreferencePage,
        async fetchRecommendedNodes() {
            const workflowId = this.workflow.info.containerId;
            const projectId = this.workflow.projectId;

            // call api
            const recommendedNodesResult = await getNodeRecommendations({
                workflowId,
                projectId,
                nodeId: this.nodeId,
                portIdx: this.port.index,
                nodesLimit: MAX_NODES,
                fullTemplateInfo: true
            });

            this.recommendedNodes = recommendedNodesResult.map(toNodeWithFullPorts(this.availablePortTypes));
        },
        async fetchSearchResults() {
            if (this.searchQuery === '') {
                this.searchResult = [];
                // TODO: do we need to refetch recommended ones? What if we searched before enabling the wf coach
                return;
            }
            const results = await searchNodes({
                query: this.searchQuery,
                tags: null,
                allTagsMatch: true,
                nodeOffset: 0,
                nodeLimit: NODE_SEARCH_LIMIT,
                fullTemplateInfo: true,
                portTypeId: this.port.typeId, // TODO: update when available
            });
            this.searchResult = results.nodes.map(toNodeWithFullPorts(this.availablePortTypes));
        },
        async addNode({ nodeFactory, inPorts }) {
            if (!this.isWritable) {
                return; // end here
            }

            const [offsetX, offsetY] = calculatePortOffset({
                targetPorts: inPorts,
                sourcePort: this.port,
                availablePortTypes: this.availablePortTypes
            });

            // add node
            const { canvasPosition: { x, y } } = this;
            await this.addNodeToWorkflow({
                position: {
                    x: x - offsetX,
                    y: y - offsetY
                },
                nodeFactory,
                sourceNodeId: this.nodeId,
                sourcePortIdx: this.port.index
            });

            this.$emit('menuClose');
        },
        onKeyDown(key) {
            const getIndex = (element) => parseInt(element.getAttribute('data-index'), 10);
            const activeNodeItem = this.$refs.nodes?.find(x => x === document.activeElement);
            const itemsHaveFocus = Boolean(activeNodeItem);
            // we need to sort the nodes because refs are NOT guaranteed to be in the correct display order!
            // TODO: we also might use DOM methods to fetch them in the correct order?!
            const nodes = [...this.$refs.nodes].sort((a, b) => getIndex(a) - getIndex(b));
            const activeItemIndex = activeNodeItem ? getIndex(activeNodeItem) : -1;

            // switch from search to items
            if (!itemsHaveFocus) {
                if (key === 'down') {
                    nodes[0].focus();
                }
                if (key === 'enter') {
                    if (this.nodes.length > 0) {
                        this.addNode(this.nodes[0]);
                    }
                }
                return;
            }

            // switch from items to search on the first row
            if (activeItemIndex < NODES_PER_ROW && key === 'up') {
                this.$refs.search.focus();
                return;
            }

            // items navigation
            if (key === 'up') {
                const nextIndex = activeItemIndex - NODES_PER_ROW;
                nodes[nextIndex]?.focus();
                return;
            }

            if (key === 'down') {
                const nextIndex = activeItemIndex + NODES_PER_ROW;
                nodes[nextIndex]?.focus();
                return;
            }

            if (key === 'left') {
                const nextIndex = activeItemIndex - 1;
                nodes[nextIndex]?.focus();
                return;
            }

            if (key === 'right') {
                const nextIndex = activeItemIndex + 1;
                nodes[nextIndex]?.focus();
            }
        }
    }
};
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    :style="`--ghost-size: ${ghostSizeZoomed}; --extra-margin: ${Math.log(ghostSizeZoomed) / 1.1}`"
    aria-label="Quick add node"
    prevent-overflow
    tabindex="0"
    @menu-close="$emit('menuClose')"
    @keydown.left.stop="onKeyDown('left')"
    @keydown.up.stop.prevent="onKeyDown('up')"
    @keydown.down.stop.prevent="onKeyDown('down')"
    @keydown.right.stop="onKeyDown('right')"
    @keydown.enter.stop.prevent="onKeyDown('enter')"
  >
    <div class="wrapper">
      <div class="header">
        <SearchBar
          ref="search"
          v-model="searchQuery"
          placeholder="Search all compatible nodes"
          class="search-bar"
        />
        <hr>
      </div>
      <div
        v-if="!hasNodeRecommendationsEnabled && !hasResults"
        class="disabled-workflow-coach"
      >
        <h2>Workflow coach</h2>
        <span>
          The workflow coach will help you build workflows more efficiently by suggesting the next node for your
          workflow.
        </span>
        <span>
          To activate this function you need to change the settings inside the preference page.
        </span>
        <Button
          primary
          class="button"
          @click="openWorkflowCoachPreferencePage"
        >
          Open Preferences
        </Button>
      </div>
      <div
        v-else-if="hasResults"
        class="results"
      >
        <div class="content">
          <ul class="nodes">
            <li
              v-for="(node, index) in nodes"
              :key="node.id"
            >
              <div
                ref="nodes"
                class="node"
                :class="[ index === 0 ? 'first' : '']"
                tabindex="-1"
                :data-index="index"
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
      <span
        v-else
        class="placeholder"
      >
        The Workflow Coach cannot recommend any nodes to you yet.
      </span>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.quick-add-node {
  width: 350px;
  margin-top: calc(var(--ghost-size) / 2 * 1px + var(--extra-margin) * 1px + 3px);

  & .disabled-workflow-coach {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-content: center;
    justify-content: center;
    width: 100%;
    flex: 1;
    padding: 20px;
    background: var(--knime-black-semi);
    color: var(--knime-white);
    font-family: "Roboto Condensed", sans-serif;

    & h2 {
      font-size: 18px;
      line-height: 21px;
      font-weight: 400;
    }

    & span {
      font-size: 13px;
      line-height: 15px;
      padding: 5px 0 10px;
    }

    & .button {
      padding: 6px 15px;
      height: 30px;
      font-size: 13px;
      font-family: "Roboto Condensed", sans-serif;
      margin-top: 20px;
    }
  }

  & .wrapper {
    height: 410px;
    box-shadow: 0 1px 6px 0 var(--knime-gray-dark-semi);
    background: var(--knime-gray-ultra-light);
    display: flex;
    flex-direction: column;
  }

  &:focus {
    outline: none;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & .header {
    padding: 15px 15px 5px 15px;

    & hr {
      margin: 10px 0;
    }
  }


  & .results {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-gutter: stable both-edges;
    max-height: 352px;
    padding-bottom: 10px;
    padding-top: 3px;

    & .content {
      padding-bottom: 10px;
    }
  }

  & .placeholder {
    flex: 1;
    font-family: "Roboto Condensed", sans-serif;
    font-style: italic;
    font-size: 16px;
    line-height: 19px;
    display: flex;
    align-items: center;
    text-align: center;
    padding: 10px 30px;
  }

  & .nodes {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    margin: auto;
    list-style-type: none;

    /* do fake focus for first item if other items have focus */
    &:focus-within .node.first:not(:focus) {
      outline: 0;
      box-shadow: none;
      border: none;
      background-color: transparent;
    }

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
        /* stylelint-disable-next-line value-no-vendor-prefix */
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
          filter: url("#node-torso-shadow");
        }
      }
      &.first {
        outline: 0;

        /* outline with border-radius is not working properly in Safari and CEF */
        box-shadow: 0 0 0 calc(var(--selected-node-stroke-width-shape) * 1px) var(--knime-dove-gray);
        border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
        background-color: var(--knime-porcelain);
      }

      &:focus,
      &.first:focus {
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
