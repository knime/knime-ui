<script>
import { mapState, mapGetters } from 'vuex';
import { debounce } from 'lodash';
import NodeTorso from '~/components/workflow/NodeTorso';

export default {
    components: {
        NodeTorso
    },
    data: () => ({
        workflow: null,
        x: 0,
        y: 0
    }),
    computed: {
        ...mapState('workflow', ['activeWorkflow', 'activeWorkflowId']),
        ...mapGetters('workflow', ['workflowBounds']),
        viewBox() {
            let { left, top, right, bottom } = this.workflowBounds;
            left -= 20;
            top -= 20;
            right += 20;
            bottom += 20;
            return `${left} ${top} ${right - left} ${bottom - top}`;
        }
    },
    watch: {
        activeWorkflow: {
            handler(newWorkflow) {
                // eslint-disable-next-line no-negated-condition
                if (!newWorkflow) {
                    this.workflow = null;
                } else {
                    this.updateWorkflow(newWorkflow);
                }
            },
            immediate: true
        }
    },
    methods: {
        updateWorkflow: debounce(function (newWorkflow) {
            let { nodes, nodeTemplates, workflowAnnotations, connections } = newWorkflow;
            this.workflow = JSON.parse(JSON.stringify({
                nodes,
                nodeTemplates,
                workflowAnnotations
                // connections
            }));
        }, 1000, { leading: true }),
        getNodeType(node) {
            let { templateId, type } = node;
            if (templateId) {
                return this.workflow.nodeTemplates[templateId].type;
            } else {
                return type;
            }
        },
        onPointerDown(e) {
            // this.dragOrigin = e.
        },
        onPointerMove(e) {
            // debugger;
            // if (e.)
        }
    }
};
</script>

<template>
  <div
    class="mini-map"
  >
    <div
      class="title-bar"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointermove="onPointerMove"
    />
    <svg
      v-if="workflow"
      :key="activeWorkflowId"
      :viewBox="viewBox"
    >
      <!-- Annotations -->
      <rect
        v-for="(
          {id, bounds: {x, y, width, height}, backgroundColor, borderColor, borderWidth}
        ) of workflow.workflowAnnotations"
        :key="id"
        :x="x"
        :y="y"
        :width="width"
        :height="height"
        :fill="backgroundColor"
        :stroke="borderColor"
        :stroke-width="borderWidth"
      />
      <!-- Nodes -->
      <NodeTorso
        v-for="(node, id) of workflow.nodes"
        :key="id"
        :type="getNodeType(node)"
        :transform="`translate(${node.position.x}, ${node.position.y})`"
        :kind="node.kind"
      />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
.mini-map {
  width: 300px;
  height: 200px;
  border-radius: 10px;

  & .title-bar {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    background-color: white;
    height: 30px;
    opacity: 0.3;
    cursor: move;
    transition: opacity 150ms ease-in;
  }

  & svg {
    transition: opacity 150ms ease-in;
    opacity: 0.5;
    border-radius: 10px;

    /* background: white; */
    height: calc(100% - 30px);
    width: 100%;
    border: none;
  }

  &:hover {
    & .title-bar {
      opacity: 0.8;
    }

    & svg {
      opacity: 0.8;
    }
  }
}
</style>
