<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapGetters, mapState } from "vuex";

import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import MenuItems from "webapps-common/ui/components/MenuItems.vue";

import type { PortViews, XY } from "@/api/gateway-api/generated-api";
import type {
  FormattedShortcut,
  ShortcutName,
  ShortcutsService,
} from "@/shortcuts";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import { AvailablePortTypes } from "@/api/custom-types";
import { toPortObject } from "@/util/portDataMapper";
import { mapPortViewDescriptorsToItems } from "@/util/mapPortViewDescriptorsToItems";
import { getNodeStateForPortIndex } from "@/util/nodeUtil";

type Base = { isVisible: boolean };
type ItemWithName = Base & { name: ShortcutName; text?: string };

type ContextMenuActionsGroupItem =
  | ItemWithName
  | (Base & { children: ContextMenuActionsGroupItem[]; text: string });

type MenuItemWithName = Pick<FormattedShortcut, "name"> & {
  type?: "shortcut" | "openPortView";
} & MenuItem;

type ContextMenuActionsGroup = Array<
  ContextMenuActionsGroupItem & { separator?: boolean }
>;

type ComponentData = {
  visibleItems: ContextMenuActionsGroup;
  activeDescendant: string | null;
};

const isItemWithName = (
  item: ContextMenuActionsGroupItem,
): item is ItemWithName => "name" in item;

/**
 * Helper fn that enables easily creating separators between the different context menu action groups
 */
const menuGroups = function (shortcuts: ShortcutsService) {
  let currItems: ContextMenuActionsGroup = [];

  const onlyVisible = ({ isVisible }: ContextMenuActionsGroupItem) => isVisible;
  const onlyEnabled = (item: ContextMenuActionsGroupItem) =>
    isItemWithName(item) ? shortcuts.isEnabled(item.name) : true;

  const removeInvalidItems = (items: Array<ContextMenuActionsGroupItem>) => {
    return items
      .filter(onlyVisible)
      .filter(onlyEnabled)
      .map((item) =>
        isItemWithName(item)
          ? item
          : { ...item, children: removeInvalidItems(item.children) },
      );
  };

  return {
    append(groupItems: Array<ContextMenuActionsGroupItem>) {
      const newItems = removeInvalidItems(groupItems);

      if (currItems.length !== 0 && newItems.length > 0) {
        // add separator to last item of previous group
        currItems[currItems.length - 1].separator = true;
      }

      currItems = currItems.concat(newItems);

      // eslint-disable-next-line no-invalid-this
      return this;
    },

    value: () => currItems,
  };
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
      "singleSelectedNode",
      "isSelectionEmpty",
    ]),
    ...mapState("application", {
      projectId: (state) => state.activeProjectId as string | null,
      availablePortTypes: (state) =>
        state.availablePortTypes as AvailablePortTypes,
    }),

    // map visible items to menu items and add shortcut information
    menuItems(): Array<MenuItemWithName> {
      const contextToMenuItemMapping = (item) => {
        // special handling for sub menus
        if (item.children?.length) {
          return {
            name: null,
            text: item.text,
            separator: item.separator,
            children: item.children.map(contextToMenuItemMapping),
          };
        }

        if (item.type === "openPortView") {
          return item;
        }

        const shortcut = this.$shortcuts.get(item.name);

        const shortcutText =
          typeof shortcut.text === "function"
            ? shortcut.text({ $store: this.$store })
            : shortcut.text;

        return {
          name: item.name,
          text: item.text || shortcutText,
          hotkeyText: shortcut.hotkeyText,
          disabled: !this.$shortcuts.isEnabled(item.name),
          separator: item.separator,
        };
      };

      return this.visibleItems.map(contextToMenuItemMapping);
    },
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
    onItemClick(event: MouseEvent, item: MenuItemWithName) {
      this.$emit("menuClose");

      if (item.type === "openPortView") {
        // TODO: call store action / desktop API
        consola.log("openPortView", item.userData);
        // API.desktop.openPortView(item.userData);
        return;
      }

      // do nothing for submenu items
      if (item.name === null) {
        return;
      }

      this.$shortcuts.dispatch(item.name, {
        event,
        metadata: { position: this.position },
      });
    },
    setActiveDescendant(itemId: string | null) {
      this.activeDescendant = itemId;
    },
    portViews() {
      const node = this.singleSelectedNode;
      if (!node) {
        return [];
      }

      const nodeId = node.id;
      const allOutPortViewData: Array<PortViews> = node.outPorts.map(
        (port) => toPortObject(this.availablePortTypes)(port.typeId).views,
      );

      const mapFullPortToItem = (
        portViewData: PortViews,
        portIndex: number,
      ) => {
        const portViewItems = mapPortViewDescriptorsToItems(
          portViewData,
          getNodeStateForPortIndex(node, portIndex),
        );

        const mappedPortViewItems = portViewItems.map((item) => ({
          name: null,
          type: "openPortView",
          text: `${portIndex}: ${node.outPorts[portIndex].name} – ${item.text}`,
          disabled: item.disabled,
          userData: {
            nodeId,
            portIndex,
            viewIndex: Number(item.id),
          },
        }));

        mappedPortViewItems.at(-1).separator = true;
        return mappedPortViewItems;
      };

      return allOutPortViewData.flatMap(mapFullPortToItem);
    },
    setMenuItems() {
      const areNodesSelected = this.selectedNodes.length > 0;
      const areAnnotationsSelected = this.selectedAnnotations.length > 0;
      const areConnectionsSelected = this.selectedConnections.length > 0;
      const isAnythingSelected =
        areNodesSelected || areAnnotationsSelected || areConnectionsSelected;

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

      const basicOperationsGroup: Array<ContextMenuActionsGroupItem> = [
        { name: "configureNode", isVisible: this.singleSelectedNode },
        {
          name: "configureFlowVariables",
          isVisible: hasLegacyFlowVariableDialog,
        },
        { name: "executeSelected", isVisible: this.selectedNodes.length },
        { name: "executeAndOpenView", isVisible: isView },
        // Loop nodes
        { name: "resumeLoopExecution", isVisible: isLoopEnd },
        { name: "pauseLoopExecution", isVisible: isLoopEnd },
        { name: "stepLoopExecution", isVisible: isLoopEnd },
        { name: "cancelSelected", isVisible: this.selectedNodes.length },
        { name: "resetSelected", isVisible: this.selectedNodes.length },
      ];

      const emptySelectionGroup: Array<ContextMenuActionsGroupItem> = [
        // no nodes selected
        { name: "executeAll", isVisible: this.isSelectionEmpty },
        { name: "cancelAll", isVisible: this.isSelectionEmpty },
        { name: "resetAll", isVisible: this.isSelectionEmpty },
      ];

      const clipboardOperationsGroup: Array<ContextMenuActionsGroupItem> = [
        { name: "cut", isVisible: areNodesSelected || areAnnotationsSelected },
        { name: "copy", isVisible: areNodesSelected || areAnnotationsSelected },
        { name: "paste", isVisible: this.isSelectionEmpty },
        { name: "deleteSelected", isVisible: !this.isSelectionEmpty },
      ];

      const annotationsGroup: Array<ContextMenuActionsGroupItem> = [
        { name: "addWorkflowAnnotation", isVisible: !isAnythingSelected },
        {
          text: "Arrange annotations",
          isVisible: areAnnotationsSelected,
          children: [
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
            { name: "sendAnnotationToBack", isVisible: areAnnotationsSelected },
          ],
        },
      ];

      const metanodeAndComponentGroup: Array<ContextMenuActionsGroupItem> = [
        { name: "createMetanode", isVisible: this.selectedNodes.length },
        { name: "createComponent", isVisible: this.selectedNodes.length },
        {
          text: "Metanode",
          isVisible: isMetanode,
          children: [
            { name: "expandMetanode", isVisible: true },
            { name: "openComponentOrMetanode", isVisible: true },
            { name: "editName", isVisible: true },
          ],
        },
        {
          text: "Component",
          isVisible: isComponent,
          children: [
            { name: "expandComponent", isVisible: true },
            { name: "openComponentOrMetanode", isVisible: true },
            { name: "editName", isVisible: true },
          ],
        },
      ];

      this.visibleItems = menuGroups(this.$shortcuts)
        .append(basicOperationsGroup)
        .append([{ name: "editNodeLabel", isVisible: this.singleSelectedNode }])
        .append(emptySelectionGroup)
        .append(clipboardOperationsGroup)
        .append(annotationsGroup)
        .append(metanodeAndComponentGroup)
        .value();

      // skip the magic for the special non-shortcut case
      const openDetachedPortViews = this.portViews();
      if (openDetachedPortViews.length > 0) {
        this.visibleItems.push({
          text: "Open port view",
          children: openDetachedPortViews,
          isVisible: true,
        });
      }
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
      :items="menuItems"
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
}
</style>
