<script setup lang="ts">
import { h, markRaw, nextTick, ref, toRef, watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { MenuItems } from "@knime/components";
import { type MenuItem } from "@knime/components";
import FlowVariableIcon from "@knime/styles/img/icons/expose-flow-variables.svg";

import type { ExtendedPortType, KnimeNode } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import portIcon from "@/components/common/PortIconRenderer";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import * as $shapes from "@/style/shapes";
import { getPortViewByViewDescriptors } from "@/util/getPortViewByViewDescriptors";
import {
  getNodeState,
  isNativeNode,
  isNodeComponent,
  isNodeMetaNode,
} from "@/util/nodeUtil";
import { toExtendedPortObject } from "@/util/portDataMapper";
import { getFloatingMenuComponent } from "../getFloatingMenuComponent";

type ShortcutItem = { name: ShortcutName; isVisible: boolean };

const { FloatingMenu } = getFloatingMenuComponent();

/**
 * Helper fn that enables easily creating separators between the different context menu action groups
 */
const menuGroups = function () {
  let currItems: Array<MenuItem> = [];

  const isEnabled = (item: MenuItem) => !item.disabled;

  const removeInvalidItems = (items: Array<MenuItem>): Array<MenuItem> => {
    return (
      items
        .filter(isEnabled)
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
        currItems.at(-1)!.separator = true;
      }

      currItems = currItems.concat(newItems);

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
 * ContextMenu offers actions for the Kanvas based on the selected objects.
 */

type Props = {
  position: XY;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  menuClose: [];
}>();

const visibleItems = ref<MenuItem[]>([]);
const activeDescendant = ref<string | null>(null);

const $shortcuts = useShortcuts();
const { activeProjectId: projectId, availablePortTypes } = storeToRefs(
  useApplicationStore(),
);
const { isSubnodeLockingEnabled: isLockingEnabled } = storeToRefs(
  useApplicationSettingsStore(),
);
const uiControls = useUIControlsStore();
const {
  getSelectedNodes: selectedNodes,
  getSelectedAnnotations: selectedAnnotations,
  singleSelectedNode,
  singleSelectedAnnotation,
  isSelectionEmpty,
} = storeToRefs(useSelectionStore());

const portViews = (): MenuItem[] => {
  const node = singleSelectedNode.value;

  if (!node) {
    return [];
  }

  const nodeId = node.id;
  const allOutPorts = node.outPorts.map((port: NodePort) =>
    toExtendedPortObject(availablePortTypes.value)(port),
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
          icon: markRaw(portIcon(port, $shapes.portSize)),
          sectionHeadline: true,
          separator: true,
        },
        {
          text: "Open port view",
          metadata: {
            handler: () => {
              useExecutionStore().openLegacyPortView({
                nodeId,
                portIndex,
              });
            },
          },
        },
      ] as MenuItem[];
    }

    const portViewItems = getPortViewByViewDescriptors(
      port.views,
      node,
      portIndex,
    );

    const mappedPortViewItems = portViewItems.map<MenuItem>((item) => ({
      text: item.text,
      disabled: item.disabled,
      metadata: {
        handler: () => {
          API.desktop.openPortView({
            projectId: projectId.value!,
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
};

const mapToShortcut = (
  shortcutItem: ShortcutItem | Array<ShortcutItem>,
): Array<MenuItem> => {
  const mapSingleItem = (shortcutItem: ShortcutItem): MenuItem[] => {
    if (!shortcutItem.isVisible) {
      return []; // end early
    }

    const shortcut = $shortcuts.get(shortcutItem.name);

    const shortcutText =
      typeof shortcut.text === "function" ? shortcut.text() : shortcut.text;

    return [
      {
        text: shortcutText ?? "",
        hotkeyText: shortcut.hotkeyText,
        disabled: !$shortcuts.isEnabled(shortcutItem.name),
        metadata: { shortcutName: shortcutItem.name },
      },
    ];
  };

  return Array.isArray(shortcutItem)
    ? shortcutItem.flatMap(mapSingleItem)
    : mapSingleItem(shortcutItem);
};

const setMenuItems = () => {
  const areNodesSelected = selectedNodes.value.length > 0;
  const areAnnotationsSelected = selectedAnnotations.value.length > 0;

  const isLoopEnd = Boolean(
    singleSelectedNode.value &&
      isNativeNode(singleSelectedNode.value) &&
      Boolean(singleSelectedNode.value.loopInfo?.allowedActions),
  );

  const isView = Boolean(
    singleSelectedNode.value &&
      "canOpenView" in singleSelectedNode.value.allowedActions!,
  );

  const hasLegacyFlowVariableDialog = Boolean(
    singleSelectedNode.value &&
      "canOpenLegacyFlowVariableDialog" in
        singleSelectedNode.value.allowedActions!,
  );

  const isMetanode = Boolean(
    singleSelectedNode.value && isNodeMetaNode(singleSelectedNode.value),
  );

  const isComponent = Boolean(
    singleSelectedNode.value && isNodeComponent(singleSelectedNode.value),
  );

  const portViewItems = portViews();

  const basicOperationsGroup: Array<MenuItem> = [
    ...mapToShortcut([
      {
        name: "configureNode",
        isVisible: Boolean(singleSelectedNode.value),
      },
      {
        name: "configureFlowVariables",
        isVisible: hasLegacyFlowVariableDialog,
      },
      { name: "executeSelected", isVisible: selectedNodes.value.length > 0 },
      { name: "executeAndOpenView", isVisible: isView },
    ]),
    ...filterItemVisibility(
      {
        text: "Open output port",
        children: portViewItems,
      },
      portViewItems.length > 0 && uiControls.canDetachPortViews,
    ),
    // Loop nodes
    ...mapToShortcut([
      { name: "resumeLoopExecution", isVisible: isLoopEnd },
      { name: "pauseLoopExecution", isVisible: isLoopEnd },
      { name: "stepLoopExecution", isVisible: isLoopEnd },
      { name: "cancelSelected", isVisible: selectedNodes.value.length > 0 },
      { name: "resetSelected", isVisible: selectedNodes.value.length > 0 },
    ]),
  ];

  const emptySelectionGroup: Array<MenuItem> = [
    ...mapToShortcut([
      // no nodes selected
      { name: "executeAll", isVisible: isSelectionEmpty.value },
      { name: "cancelAll", isVisible: isSelectionEmpty.value },
      { name: "resetAll", isVisible: isSelectionEmpty.value },
      {
        name: "checkForComponentUpdates",
        isVisible: isSelectionEmpty.value,
      },
    ]),
  ];

  const quickNodeAnnotationGroup: Array<MenuItem> = [
    ...mapToShortcut([
      { name: "quickActionMenu", isVisible: isSelectionEmpty.value },
    ]),
  ];

  const clipboardOperationsGroup: Array<MenuItem> = [
    ...mapToShortcut([
      {
        name: "cut",
        isVisible: areNodesSelected || areAnnotationsSelected,
      },
      {
        name: "copy",
        isVisible: areNodesSelected || areAnnotationsSelected,
      },
      { name: "paste", isVisible: isSelectionEmpty.value },
      { name: "deleteSelected", isVisible: !isSelectionEmpty.value },
    ]),
  ];

  const nodeAlignmentGroup: Array<MenuItem> = [
    ...mapToShortcut([
      { name: "alignHorizontally", isVisible: !isSelectionEmpty.value },
      { name: "alignVertically", isVisible: !isSelectionEmpty.value },
    ]),
  ];

  const annotationsGroup: Array<MenuItem> = [
    ...mapToShortcut({
      name: "addWorkflowAnnotation",
      isVisible: isSelectionEmpty.value,
    }),
    ...filterItemVisibility(
      {
        text: "Arrange annotations",
        children: mapToShortcut([
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

  const nodeConnectionsGroup: Array<MenuItem> = [
    ...filterItemVisibility(
      {
        text: "Node connections",
        children: mapToShortcut([
          { name: "autoConnectNodesDefault", isVisible: true },
          { name: "autoConnectNodesFlowVar", isVisible: true },
          { name: "autoDisconnectNodesDefault", isVisible: true },
          { name: "autoDisconnectNodesFlowVar", isVisible: true },
        ]),
      },
      selectedNodes.value.length > 1,
    ),
  ];

  const metanodeAndComponentGroup: Array<MenuItem> = [
    ...mapToShortcut([
      { name: "createMetanode", isVisible: selectedNodes.value.length > 0 },
      { name: "createComponent", isVisible: selectedNodes.value.length > 0 },
    ]),
    ...filterItemVisibility(
      {
        text: "Metanode",
        children: mapToShortcut([
          { name: "openComponentOrMetanode", isVisible: true },
          { name: "editName", isVisible: true },
          { name: "expandMetanode", isVisible: true },
          { name: "lockSubnode", isVisible: isLockingEnabled.value },
        ]),
      },
      isMetanode,
    ),
    ...filterItemVisibility(
      // TODO: Add separators by adding nested groups
      {
        text: "Component",
        children: mapToShortcut([
          { name: "openComponentOrMetanode", isVisible: true },
          { name: "editName", isVisible: true },
          { name: "expandComponent", isVisible: true },
          { name: "openLayoutEditorByNodeId", isVisible: true },
          { name: "linkComponent", isVisible: true },
          { name: "updateComponent", isVisible: true },
          { name: "changeComponentLinkType", isVisible: true },
          { name: "changeHubItemVersion", isVisible: true },
          { name: "unlinkComponent", isVisible: true },
          { name: "lockSubnode", isVisible: isLockingEnabled.value },
        ]),
      },
      isComponent,
    ),
  ];

  visibleItems.value = menuGroups()
    .append(basicOperationsGroup)
    .append(
      mapToShortcut({
        name: "editNodeComment",
        isVisible: Boolean(singleSelectedNode.value),
      }),
    )
    .append(
      mapToShortcut({
        name: "editAnnotation",
        isVisible: Boolean(singleSelectedAnnotation.value),
      }),
    )
    .append(emptySelectionGroup)
    .append(clipboardOperationsGroup)
    .append(quickNodeAnnotationGroup)
    .append(annotationsGroup.concat(nodeConnectionsGroup))
    .append(nodeAlignmentGroup)
    .append(metanodeAndComponentGroup)
    .value();
};

const menuItems = ref<InstanceType<typeof MenuItems>>();

watch(
  toRef(props, "position"),
  async () => {
    setMenuItems();
    await nextTick();
    menuItems.value!.$el.focus();
  },
  { immediate: true },
);

const onItemClick = (event: MouseEvent, item: MenuItem) => {
  emit("menuClose");

  if (typeof item.metadata.handler === "function") {
    item.metadata.handler();
    return;
  }

  const shortcutName = item.metadata?.shortcutName;

  // do nothing if we don't have a shortcut name
  if (!shortcutName) {
    return;
  }

  $shortcuts.dispatch(shortcutName, {
    event,
    metadata: { position: props.position },
  });
};

const setActiveDescendant = (itemId: string | null) => {
  activeDescendant.value = itemId;
};
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
      @contextmenu.prevent
      @item-click="onItemClick"
      @item-focused="setActiveDescendant"
      @close="$emit('menuClose')"
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
