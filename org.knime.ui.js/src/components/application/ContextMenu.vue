<script lang="ts">
import { defineComponent, h, markRaw, type PropType } from "vue";
import { mapGetters, mapState } from "vuex";

import MenuItems from "webapps-common/ui/components/MenuItems.vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import FlowVariableIcon from "webapps-common/ui/assets/img/icons/expose-flow-variables.svg";

import { API } from "@api";
import type { XY } from "@/api/gateway-api/generated-api";
import type {
  AvailablePortTypes,
  ExtendedPortType,
  KnimeNode,
} from "@/api/custom-types";
import type { ShortcutName } from "@/shortcuts";
import { toExtendedPortObject } from "@/util/portDataMapper";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";
import { getNodeState, isNodeMetaNode } from "@/util/nodeUtil";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import portIcon from "@/components/common/PortIconRenderer";
import * as $shapes from "@/style/shapes.mjs";
import { compatibility } from "@/environment";

type ShortcutItem = { name: ShortcutName; isVisible: boolean };

type ComponentData = {
  visibleItems: Array<MenuItem>;
  activeDescendant: string | null;
};

/**
 * Helper fn that enables easily creating separators between the different context menu action groups
 */
const menuGroups = function () {
  let currItems: Array<MenuItem> = [];

  const onlyEnabled = (item: MenuItem) => !item.disabled;

  const removeInvalidItems = (items: Array<MenuItem>) => {
    return (
      items
        .filter(onlyEnabled)
        .map((item) =>
          item.children
            ? { ...item, children: removeInvalidItems(item.children) }
            : item,
        )
        // also remove items whose children were all filtered out
        .filter((item) => (item.children ? item.children.length > 0 : true))
    );
  };

  return {
    append(groupItems: Array<MenuItem>) {
      const newItems = removeInvalidItems(groupItems);

      if (currItems.length !== 0 && newItems.length > 0) {
        // add separator to last item of previous group
        currItems.at(-1).separator = true;
      }

      currItems = currItems.concat(newItems);

      // eslint-disable-next-line no-invalid-this
      return this;
    },

    value: () => currItems,
  };
};

const filterItemVisibility = <T,>(item: T, isVisible: boolean) => {
  if (!isVisible) {
    return [];
  }
  return [item];
};

const buildPortNameAndIndex = (portName: string, portIndex: number) => {
  return portIndex > 0 ? `${portIndex}: ${portName}` : portName;
};

const defaultFlowVariableIcon = () =>
  h(FlowVariableIcon, {
    style: {
      width: "14px",
      marginTop: "-1px",
      marginRight: " 4px",
      marginLeft: "-2px",
    },
  });

const buildPortViewIcon = (
  node: KnimeNode,
  port: ExtendedPortType,
  portIndex: number,
) => {
  if (isNodeMetaNode(node)) {
    return markRaw(portIcon(port, $shapes.portSize));
  }

  return portIndex === 0
    ? markRaw(defaultFlowVariableIcon())
    : markRaw(portIcon(port, $shapes.portSize));
};

/**
 * ContextMenu offers actions for the Kanvas based on the selected nodes.
 */
export default defineComponent({
  components: {
    FloatingMenu,
    MenuItems,
  },
  props: {
    /**
     * Position of the menu in canvas coordinates.
     */
    position: {
      type: Object as PropType<XY>,
      required: true,
      validator: (position: Partial<XY>) =>
        typeof position.x === "number" && typeof position.y === "number",
    },
  },
  emits: ["menuClose"],
  data: (): ComponentData => ({
    visibleItems: [],
    activeDescendant: null,
  }),
  computed: {
    ...mapGetters("selection", [
      "selectedNodes",
      "selectedAnnotations",
      "selectedConnections",
      "selectedBendpointIds",
      "singleSelectedNode",
      "isSelectionEmpty",
    ]),
    ...mapState("application", {
      projectId: (state) => state.activeProjectId as string | null,
      availablePortTypes: (state) =>
        state.availablePortTypes as AvailablePortTypes,
    }),
  },
  watch: {
    // set menu items on mounted,
    // update menu items when another target has been clicked, which is indicated by a change in position
    position: {
      immediate: true,
      handler() {
        this.setMenuItems();
        this.$nextTick(() => {
          (this.$refs.menuItems as { $el: HTMLElement }).$el.focus();
        });
      },
    },
  },
  beforeMount() {
    // deselect any selected text to make copy and paste of non text possible
    window?.getSelection().removeAllRanges();
  },
  methods: {
    mapToShortcut(
      shortcutItem: ShortcutItem | Array<ShortcutItem>,
    ): Array<MenuItem> {
      const mapSingleItem = (shortcutItem: ShortcutItem) => {
        if (!shortcutItem.isVisible) {
          return []; // end early
        }

        const shortcut = this.$shortcuts.get(shortcutItem.name);

        const shortcutText =
          typeof shortcut.text === "function"
            ? shortcut.text({ $store: this.$store })
            : shortcut.text;

        return [
          {
            text: shortcutText,
            hotkeyText: shortcut.hotkeyText,
            disabled: !this.$shortcuts.isEnabled(shortcutItem.name),
            metadata: { shortcutName: shortcutItem.name },
          },
        ];
      };
      return Array.isArray(shortcutItem)
        ? shortcutItem.flatMap(mapSingleItem)
        : mapSingleItem(shortcutItem);
    },
    onItemClick(event: MouseEvent, item: MenuItem) {
      this.$emit("menuClose");

      if (typeof item.metadata.handler === "function") {
        item.metadata.handler();
        return;
      }

      const shortcutName = item.metadata?.shortcutName;

      // do nothing if we don't have a shortcut name
      if (!shortcutName) {
        return;
      }

      this.$shortcuts.dispatch(shortcutName, {
        event,
        metadata: { position: this.position },
      });
    },
    setActiveDescendant(itemId: string | null) {
      this.activeDescendant = itemId;
    },
    portViews() {
      const node = this.singleSelectedNode as KnimeNode;
      if (!node) {
        return [];
      }

      const nodeId = node.id;
      const allOutPorts = node.outPorts.map((port) =>
        toExtendedPortObject(this.availablePortTypes)(port),
      );

      return allOutPorts.flatMap((port, portIndex) => {
        // TODO: NXT-2024 show port views at configure time
        if (getNodeState(node, portIndex) !== "EXECUTED") {
          return [];
        }

        if (!port.views) {
          return [
            {
              text: buildPortNameAndIndex(port.name, portIndex),
              icon: markRaw(portIcon(port, this.$shapes.portSize)),
              sectionHeadline: true,
              separator: true,
            },
            {
              text: "Open legacy port view",
              metadata: {
                handler: () => {
                  this.$store.dispatch("workflow/openLegacyPortView", {
                    nodeId,
                    portIndex,
                  });
                },
              },
            },
          ];
        }

        const portViewItems = getPortViewByViewDescriptors(
          port.views,
          node,
          portIndex,
        );

        let mappedPortViewItems = portViewItems.map<MenuItem>((item) => ({
          text: item.text,
          disabled: item.disabled,
          metadata: {
            handler: () => {
              API.desktop.openPortView({
                projectId: this.projectId,
                nodeId,
                portIndex,
                viewIndex: Number(item.id),
              });
            },
          },
        }));

        const headline: MenuItem = {
          text: buildPortNameAndIndex(port.name, portIndex),
          icon: buildPortViewIcon(node, port, portIndex),
          sectionHeadline: true,
          separator: true,
        };

        return [headline, ...mappedPortViewItems];
      });
    },
    setMenuItems() {
      const areNodesSelected = this.selectedNodes.length > 0;
      const areAnnotationsSelected = this.selectedAnnotations.length > 0;

      const isLoopEnd = Boolean(
        this.singleSelectedNode?.loopInfo?.allowedActions,
      );
      const isView =
        this.singleSelectedNode &&
        "canOpenView" in this.singleSelectedNode.allowedActions;
      const hasLegacyFlowVariableDialog =
        this.singleSelectedNode &&
        "canOpenLegacyFlowVariableDialog" in
          this.singleSelectedNode.allowedActions;
      const isMetanode = this.singleSelectedNode?.kind === "metanode";
      const isComponent = this.singleSelectedNode?.kind === "component";
      const isLinked = this.singleSelectedNode?.link;

      const portViewItems = this.portViews();

      const basicOperationsGroup: Array<MenuItem> = [
        ...this.mapToShortcut([
          {
            name: "configureNode",
            isVisible: this.singleSelectedNode,
          },
          {
            name: "configureFlowVariables",
            isVisible: hasLegacyFlowVariableDialog,
          },
          { name: "executeSelected", isVisible: this.selectedNodes.length },
          { name: "executeAndOpenView", isVisible: isView },
        ]),
        ...filterItemVisibility(
          {
            text: "Open output port",
            children: portViewItems,
          },
          portViewItems.length > 0 && compatibility.canDetachPortViews(),
        ),
        // Loop nodes
        ...this.mapToShortcut([
          { name: "resumeLoopExecution", isVisible: isLoopEnd },
          { name: "pauseLoopExecution", isVisible: isLoopEnd },
          { name: "stepLoopExecution", isVisible: isLoopEnd },
          { name: "cancelSelected", isVisible: this.selectedNodes.length },
          { name: "resetSelected", isVisible: this.selectedNodes.length },
        ]),
      ];

      const emptySelectionGroup: Array<MenuItem> = [
        ...this.mapToShortcut([
          // no nodes selected
          { name: "executeAll", isVisible: this.isSelectionEmpty },
          { name: "cancelAll", isVisible: this.isSelectionEmpty },
          { name: "resetAll", isVisible: this.isSelectionEmpty },
          {
            name: "checkForComponentUpdates",
            isVisible: this.isSelectionEmpty,
          },
        ]),
      ];

      const clipboardOperationsGroup: Array<MenuItem> = [
        ...this.mapToShortcut([
          {
            name: "cut",
            isVisible: areNodesSelected || areAnnotationsSelected,
          },
          {
            name: "copy",
            isVisible: areNodesSelected || areAnnotationsSelected,
          },
          { name: "paste", isVisible: this.isSelectionEmpty },
          { name: "deleteSelected", isVisible: !this.isSelectionEmpty },
        ]),
      ];

      const annotationsGroup: Array<MenuItem> = [
        ...this.mapToShortcut({
          name: "addWorkflowAnnotation",
          isVisible: this.isSelectionEmpty,
        }),
        ...filterItemVisibility(
          {
            text: "Arrange annotations",
            children: this.mapToShortcut([
              {
                name: "bringAnnotationToFront",
                isVisible: areAnnotationsSelected,
              },
              {
                name: "bringAnnotationForward",
                isVisible: areAnnotationsSelected,
              },
              {
                name: "sendAnnotationBackward",
                isVisible: areAnnotationsSelected,
              },
              {
                name: "sendAnnotationToBack",
                isVisible: areAnnotationsSelected,
              },
            ]),
          },
          areAnnotationsSelected,
        ),
      ];

      const metanodeAndComponentGroup: Array<MenuItem> = [
        ...this.mapToShortcut([
          { name: "createMetanode", isVisible: this.selectedNodes.length },
          {
            name: "createComponent",
            isVisible:
              this.selectedNodes.length &&
              compatibility.canDoComponentOperations(),
          },
        ]),
        ...filterItemVisibility(
          {
            text: "Metanode",
            children: this.mapToShortcut([
              { name: "openComponentOrMetanode", isVisible: true },
              { name: "editName", isVisible: true },
              { name: "expandMetanode", isVisible: true },
            ]),
          },
          isMetanode,
        ),
        ...filterItemVisibility(
          // TODO: Add separators by adding nested groups
          {
            text: "Component",
            children: this.mapToShortcut([
              { name: "openComponentOrMetanode", isVisible: true },
              { name: "editName", isVisible: true },
              { name: "expandComponent", isVisible: true },
              {
                name: "openLayoutEditorByNodeId",
                isVisible: !isLinked,
              },
              {
                name: "linkComponent",
                isVisible: !isLinked,
              },
              {
                name: "updateComponent",
                isVisible: isLinked,
              },
              {
                name: "changeComponentLinkType",
                isVisible: isLinked,
              },
              {
                name: "changeHubItemVersion",
                isVisible: isLinked,
              },
              {
                name: "unlinkComponent",
                isVisible: isLinked,
              },
            ]),
          },
          isComponent && compatibility.canDoComponentOperations(),
        ),
      ];

      this.visibleItems = menuGroups()
        .append(basicOperationsGroup)
        .append(
          this.mapToShortcut({
            name: "editNodeComment",
            isVisible: this.singleSelectedNode,
          }),
        )
        .append(emptySelectionGroup)
        .append(clipboardOperationsGroup)
        .append(annotationsGroup)
        .append(metanodeAndComponentGroup)
        .value();
    },
  },
});
</script>

<template>
  <FloatingMenu
    :canvas-position="position"
    :disable-interactions="true"
    class="context-menu"
    aria-label="Context Menu"
    :aria-activedescendant="activeDescendant"
    prevent-overflow
    @menu-close="$emit('menuClose')"
  >
    <MenuItems
      id="context-menu-items"
      ref="menuItems"
      class="menu-items"
      register-keydown
      :items="visibleItems"
      menu-aria-label="Context Menu"
      @item-click="onItemClick"
      @item-focused="setActiveDescendant"
    />
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.context-menu {
  min-width: 200px;
  max-width: 320px;

  & :deep(.list-item.section-headline) {
    color: var(--knime-masala);
  }

  /* select every item is a separator and contains a headline. */
  & :deep(.menu-items-sub-level .separator:has(.section-headline)) {
    /* then style all of its siblings, except other headlines */
    & ~ li:not(:has(.section-headline)) {
      & button {
        padding-left: 28px;
      }
    }
  }
}
</style>
