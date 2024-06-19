<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { placeholderPosition, portPositions } from "@/util/portShift";
import { getPortContext } from "@/util/portSelection";
import { isInputElement } from "@/util/isInputElement";

import AddPortPlaceholder from "./AddPortPlaceholder.vue";
import NodePort from "./NodePort/NodePort.vue";

/**
 * This component renders and handles interactions with a Node's Ports
 */
export default {
  components: {
    NodePort,
    AddPortPlaceholder,
  },
  props: {
    nodeId: {
      type: String,
      required: true,
    },

    nodeKind: {
      type: String,
      required: true,
      validator: (kind) => ["node", "metanode", "component"].includes(kind),
    },
    /**
     * Input ports. List of configuration objects passed-through to the `Port` component
     */
    inPorts: {
      type: Array,
      required: true,
    },

    /**
     * Output ports. List of configuration objects passed-through to the `Port` component
     */
    outPorts: {
      type: Array,
      required: true,
    },

    portGroups: {
      type: Object,
      default: null,
    },

    /** object that contains information which port to highlight */
    targetPort: {
      type: Object,
      default: null,
    },

    isEditable: {
      type: Boolean,
      default: false,
    },

    /** Interaction state of Node.vue that is passed through */
    hover: {
      type: Boolean,
      default: false,
    },
    connectorHover: {
      type: Boolean,
      default: false,
    },
    isSingleSelected: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["updatePortPositions"],
  data: () => ({}),
  computed: {
    ...mapState("canvas", ["getScrollContainerElement"]),
    ...mapState("selection", {
      isModificationInProgress: (state) =>
        state.activeNodePorts.isModificationInProgress,
    }),
    ...mapState("workflow", ["isDragging", "quickAddNodeMenu"]),
    ...mapGetters("workflow", ["isWritable", "getNodeById"]),
    node() {
      return this.getNodeById(this.nodeId);
    },
    selectedPort() {
      if (this.isActiveNodePortsInstance) {
        return this.$store.state.selection.activeNodePorts.selectedPort;
      }

      return null;
    },
    isActiveNodePortsInstance() {
      return this.$store.state.selection.activeNodePorts.nodeId === this.nodeId;
    },

    isMetanode() {
      return this.nodeKind === "metanode";
    },
    isComponent() {
      return this.nodeKind === "component";
    },
    /**
     * @returns {object} the position of all inPorts and outPorts.
     * The position for each port is an array with two coordinates [x, y].
     */
    portPositions() {
      const positions = {
        in: portPositions({
          portCount: this.inPorts.length,
          isMetanode: this.isMetanode,
        }),
        out: portPositions({
          portCount: this.outPorts.length,
          isMetanode: this.isMetanode,
          isOutports: true,
        }),
      };

      // add placeholder positions to enable the drop to a placeholder
      if (this.canAddPort.input) {
        positions.in.push(
          placeholderPosition({
            portCount: this.inPorts.length,
            isMetanode: this.isMetanode,
          }),
        );
      }

      if (this.canAddPort.output) {
        positions.out.push(
          placeholderPosition({
            portCount: this.outPorts.length,
            isMetanode: this.isMetanode,
            isOutport: true,
          }),
        );
      }
      return positions;
    },
    addPortPlaceholderPositions() {
      // the last position is the one of the placeholder
      return {
        input: this.portPositions.in[this.portPositions.in.length - 1],
        output: this.portPositions.out[this.portPositions.out.length - 1],
      };
    },
    /* eslint-disable brace-style, curly */
    canAddPort() {
      if (!this.isEditable) return { input: false, output: false };

      if (this.isComponent || this.isMetanode)
        return { input: true, output: true };

      if (this.portGroups) {
        let portGroups = Object.values(this.portGroups);
        return {
          input: portGroups.some((portGroup) => portGroup.canAddInPort),
          output: portGroups.some((portGroup) => portGroup.canAddOutPort),
        };
      }

      // Native node without port groups
      return { input: false, output: false };
    },
  },
  watch: {
    isDragging(isDragging, wasDragging) {
      if (isDragging && !wasDragging) {
        this.clearSelection();
      }
    },
    portPositions() {
      this.$emit("updatePortPositions", this.portPositions);
    },
    isActiveNodePortsInstance(isActivated) {
      this.getScrollContainerElement().removeEventListener(
        "keydown",
        this.onKeydown,
      );

      if (isActivated) {
        this.getScrollContainerElement().addEventListener(
          "keydown",
          this.onKeydown,
        );
      }
    },
  },
  mounted() {
    this.$emit("updatePortPositions", this.portPositions);
  },
  unmount() {
    // cleanup potentially registered listeners
    this.getScrollContainerElement().removeEventListener(
      "keydown",
      this.onKeydown,
    );
  },
  methods: {
    ...mapActions("workflow", ["addNodePort", "removeNodePort"]),
    isShowingQuickAddNodeMenu(portIndex, direction) {
      return (
        this.quickAddNodeMenu.isOpen &&
        direction === "out" &&
        this.quickAddNodeMenu.props.nodeId === this.nodeId &&
        this.quickAddNodeMenu.props.port.index === portIndex
      );
    },
    onPortClick({ index, portGroupId }, side) {
      if (!this.isEditable) {
        return;
      }

      let selectPort = () => {
        this.updateSelection(`${side}-${index}`);
      };

      if (this.nodeKind === "component" && index !== 0)
        // all but hidden ports on components (mickey mouse) can be selected
        selectPort();
      else if (this.nodeKind === "metanode") selectPort();
      else if (portGroupId) {
        // native node and port is part of a port group
        let portGroup = this.portGroups[portGroupId];
        let [, upperBound] = portGroup[`${side}Range`];

        // select last port of group
        this.updateSelection(`${side}-${upperBound}`);
      }
    },
    onDeselectPort() {
      // TODO: This currently conflicts with the selection of the last port of a PortGroup
      // (it is immediately de-selected again because the initial click was "outside" the element)
      this.clearSelection();
    },
    isMickeyMousePort(port) {
      return !this.isMetanode && port.index === 0;
    },
    // default flow variable ports (Mickey Mouse ears) are only shown if connected, selected, or on hover
    portAnimationClasses(port, direction) {
      if (!this.isMickeyMousePort(port)) {
        return {};
      }

      const isShowingQuickAddNodeMenu = this.isShowingQuickAddNodeMenu(
        port.index,
        direction,
      );

      return {
        "mickey-mouse": true,
        "connector-hover": this.connectorHover,
        connected: isShowingQuickAddNodeMenu || port.connectedVia.length, // eslint-disable-line quote-props
        "read-only": !this.isWritable,
        "node-hover": this.hover,
      };
    },
    isPortTargeted({ index }, side) {
      return this.targetPort?.side === side && this.targetPort.index === index;
    },
    isPlaceholderPortTargeted(side) {
      return side === "input"
        ? this.isPortTargeted({ index: this.inPorts.length }, "in")
        : this.isPortTargeted({ index: this.outPorts.length }, "out");
    },
    clamp(val, min, max) {
      return Math.max(min, Math.min(val, max));
    },
    triggerAddPortMenu(side) {
      this.$refs[`${side}-AddPortPlaceholder`]?.at(0)?.onClick();
    },
    updateSelection(selectedPort) {
      this.$store.commit("selection/updateActiveNodePorts", {
        nodeId: this.nodeId,
        selectedPort,
      });
    },
    clearSelection() {
      this.$store.commit("selection/updateActiveNodePorts", {
        nodeId: null,
        selectedPort: null,
      });
    },
    addPort({ side, typeId, portGroup }) {
      if (this.isModificationInProgress) {
        return;
      }

      this.$store.commit("selection/updateActiveNodePorts", {
        isModificationInProgress: true,
      });
      this.addNodePort({
        nodeId: this.nodeId,
        side,
        typeId,
        portGroup,
      })
        .then(() => {
          // AddPortPlaceholder may be removed after adding a port
          if (!this.canAddPort[side]) {
            const sidePorts = side === "input" ? this.inPorts : this.outPorts;
            this.updateSelection(`${side}-${sidePorts.length - 1}`);
          }
        })
        .finally(() => {
          this.$store.commit("selection/updateActiveNodePorts", {
            isModificationInProgress: false,
          });
        });
    },
    removePort({ portGroupId, index }, side) {
      this.removeNodePort({
        nodeId: this.nodeId,
        side,
        index,
        portGroup: portGroupId,
      });
      this.clearSelection();
    },
    onKeydown(event) {
      if (isInputElement(event.target)) {
        return;
      }

      const direction = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      }[event.key];

      if (direction) {
        event.preventDefault();
        this.navigateSelection(direction);
        return;
      }

      if (event.key === "Enter" && this.selectedPort.endsWith("AddPort")) {
        this.triggerAddPortMenu(
          getPortContext(this.node, this.selectedPort).side,
        );
      }
    },
    navigateSelection(direction) {
      const current = getPortContext(this.node, this.selectedPort);
      switch (direction) {
        case "up":
          this.navigateUp(current);
          break;
        case "down":
          this.navigateDown(current);
          break;
        case "left":
        case "right":
          this.navigateLeftRight(current, direction);
          break;
        default:
          break;
      }
    },
    navigateUp(current) {
      const minIndex = this.isMetanode ? 0 : 1;
      const candidateIndex = current.isAddPort
        ? current.sidePorts.length - 1
        : current.index - 1;
      if (candidateIndex >= minIndex && current.sidePorts[candidateIndex]) {
        this.updateSelection(`${current.side}-${candidateIndex}`);
      }
    },
    navigateDown(current) {
      if (current.sidePorts[current.index + 1]) {
        this.updateSelection(`${current.side}-${current.index + 1}`);
        return;
      }

      if (this.canAddPort[current.side]) {
        if (current.isAddPort) {
          this.triggerAddPortMenu(current.side);
        } else {
          this.updateSelection(`${current.side}-AddPort`);
        }
      }
    },
    navigateLeftRight(current, direction) {
      const isSwap =
        (current.side === "input" && direction === "right") ||
        (current.side === "output" && direction === "left");
      const otherSide = current.side === "input" ? "output" : "input";
      const otherPorts =
        current.side === "input" ? this.outPorts : this.inPorts;

      if (!isSwap) {
        if (current.isAddPort) {
          this.triggerAddPortMenu(current.side);
        }
        return;
      }

      const minIndex = this.isMetanode ? 0 : 1;
      const equivIndex = this.clamp(
        current.isAddPort ? current.sidePorts.length : current.index,
        minIndex,
        otherPorts.length - 1,
      );

      if (otherPorts[equivIndex]) {
        this.updateSelection(`${otherSide}-${equivIndex}`);
        return;
      }

      if (this.canAddPort[otherSide]) {
        this.updateSelection(`${otherSide}-AddPort`);
      }
    },
  },
};
</script>

<template>
  <g>
    <NodePort
      v-for="port of inPorts"
      :key="`input-${port.index}`"
      :class="['port', portAnimationClasses(port, 'in')]"
      direction="in"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.in[port.index]"
      :selected="selectedPort === `input-${port.index}`"
      :targeted="isPortTargeted(port, 'in')"
      :data-hide-in-workflow-preview="
        (isMickeyMousePort(port) && !port.connectedVia.length) || null
      "
      @click="onPortClick(port, 'input')"
      @remove="removePort(port, 'input')"
      @deselect="onDeselectPort"
    />

    <NodePort
      v-for="port of outPorts"
      :key="`output-${port.index}`"
      :class="['port', portAnimationClasses(port, 'out')]"
      direction="out"
      :node-id="nodeId"
      :node-kind="nodeKind"
      :port="port"
      :relative-position="portPositions.out[port.index]"
      :selected="selectedPort === `output-${port.index}`"
      :targeted="isPortTargeted(port, 'out')"
      :data-hide-in-workflow-preview="
        (isMickeyMousePort(port) && !port.connectedVia.length) || null
      "
      @click="onPortClick(port, 'output')"
      @remove="removePort(port, 'output')"
      @deselect="onDeselectPort"
    />

    <template v-for="side in ['input', 'output']">
      <AddPortPlaceholder
        v-if="canAddPort[side]"
        :ref="`${side}-AddPortPlaceholder`"
        :key="side"
        :side="side"
        :targeted="isPlaceholderPortTargeted(side)"
        :target-port="targetPort"
        :selected="selectedPort === `${side}-AddPort`"
        :node-id="nodeId"
        :position="addPortPlaceholderPositions[side]"
        :port-groups="portGroups"
        :class="[
          'add-port',
          {
            'node-hover': hover,
            'connector-hover': connectorHover,
            'node-selected': isSingleSelected,
            selected: selectedPort === `${side}-AddPort`,
          },
        ]"
        data-hide-in-workflow-preview
        @add-port="
          addPort({ side, typeId: $event.typeId, portGroup: $event.portGroup })
        "
      />
    </template>
  </g>
</template>

<style lang="postcss" scoped>
.port {
  transition: transform 120ms ease;

  &.mickey-mouse {
    opacity: 0;
    transition: opacity 0.5s 0.25s;

    &.node-hover {
      /* fade-in port with delay when node is hovered */
      transition: opacity 0.5s 0.5s;
      opacity: 1;
    }

    &:hover {
      /* immediately show port on direct hover */
      transition: none;
      opacity: 1;
    }

    &.connector-hover {
      /* fade-in port without delay on connectorHover */
      transition: opacity 0.25s;
      opacity: 1;
    }

    &.read-only {
      /* Hide if workflow is read-only */
      transition: none;
      opacity: 0;
    }

    &.connected {
      /* fade in port when a connection has been created */
      transition: opacity 0.25s;
      opacity: 1;
    }
  }
}

.add-port {
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 120ms ease-out;

  &.node-selected,
  &.node-hover,
  &.selected {
    opacity: 1;
  }

  &.connector-hover {
    opacity: 1;
    transition: opacity 0s;
  }
}
</style>
