<script>
import { mapGetters, mapState } from 'vuex';
import { openWorkflowCoachPreferencePage } from '@api';

import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import SearchBar from '@/components/common/SearchBar.vue';

import { checkPortCompatibility } from '@/util/compatibleConnections';
import { portPositions } from '@/util/portShift';

import { debounce } from 'lodash';
import NodeList from '@/components/nodeRepository/NodeList.vue';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';

const SEARCH_COOLDOWN = 150; // ms

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
        NodeTemplate,
        NodeList,
        SearchBar,
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
            selectedNode: null
        };
    },
    computed: {
        ...mapState('application', ['hasNodeRecommendationsEnabled']),
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('quickAddNodes', { searchResult: 'topNodes', recommendedNodes: 'recommendedNodes' }),
        ...mapGetters('workflow', ['isWritable']),
        ...mapGetters('quickAddNodes', ['searchIsActive']),

        searchQuery: {
            get() {
                return this.$store.state.quickAddNodes.query;
            },
            set: debounce(function (value) {
                this.$store.dispatch('quickAddNodes/updateQuery', value); // eslint-disable-line no-invalid-this
            },
            SEARCH_COOLDOWN, { leading: true, trailing: true })
        },
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
            return this.searchResult?.length > 0 || this.recommendedNodes?.length > 0;
        },
        nodes() {
            if (this.searchIsActive) {
                return this.searchResult;
            }
            return this.recommendedNodes;
        }
    },
    watch: {
        hasNodeRecommendationsEnabled: {
            immediate: true,
            handler() {
                if (this.hasNodeRecommendationsEnabled) {
                    this.fetchNodeRecommendations();
                }
            }
        }
    },
    mounted() {
        this.$refs.search?.focus();
    },
    beforeUnmount() {
        // reset query on close (in any case!)
        this.searchQuery = '';
    },
    methods: {
        openWorkflowCoachPreferencePage,

        async fetchNodeRecommendations() {
            await this.$store.dispatch('quickAddNodes/getNodeRecommendations', {
                nodeId: this.nodeId,
                portIdx: this.port.index
            });
        },
        async addNode({ nodeFactory, inPorts }) {
            if (!this.isWritable) {
                return; // end here
            }

            const { availablePortTypes } = this.$store.state.application;
            const [offsetX, offsetY] = calculatePortOffset({
                targetPorts: inPorts,
                sourcePort: this.port,
                availablePortTypes
            });

            // add node
            const { canvasPosition: { x, y } } = this;
            await this.$store.dispatch('workflow/addNode', {
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
        searchEnterKey() {
            if (this.nodes.length > 0) {
                this.addNode(this.nodes[0]);
            }
        },
        searchDownKey() {
            this.$refs.list.focusFirst();
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
    @menu-close="$emit('menuClose')"
  >
    <div class="wrapper">
      <div class="header">
        <SearchBar
          ref="search"
          v-model="searchQuery"
          placeholder="Search all compatible nodes"
          class="search-bar"
          tabindex="-1"
          @focusin="selectedNode = null"
          @keydown.enter.prevent.stop="searchEnterKey"
          @keydown.down.prevent.stop="searchDownKey"
        />
        <hr>
      </div>
      <div
        v-if="!hasNodeRecommendationsEnabled && !searchIsActive"
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
          <NodeList
            ref="list"
            v-model:selected-node="selectedNode"
            :nodes="nodes"
            @nav-reached-top="$refs.search.focus()"
            @enter-key="addNode($event)"
          >
            <template #item="itemProps">
              <NodeTemplate
                v-bind="itemProps"
                @click="addNode(itemProps.nodeTemplate)"
              />
            </template>
          </NodeList>
        </div>
      </div>
      <span
        v-if="searchIsActive && (!searchResult || searchResult.length === 0)"
        class="placeholder"
      >
        No compatible node matching for:<br>{{ searchQuery }}
      </span>
      <span
        v-if="!searchIsActive && (!recommendedNodes || recommendedNodes.length === 0)"
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
    flex-direction: column;
    justify-content: center;
    font-family: "Roboto Condensed", sans-serif;
    font-style: italic;
    font-size: 16px;
    line-height: 19px;
    display: flex;
    align-items: center;
    text-align: center;
    padding: 10px 30px;
  }

  /* marks the default item (first one); gets inserted on enter while still in the search box */
  & :deep(li.no-selection[data-index="0"] > div) {
    outline: calc(var(--selected-node-stroke-width-shape) * 1px) solid var(--knime-dove-gray);
    border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
    background-color: var(--knime-porcelain);
  }

}
</style>
