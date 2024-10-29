import { computed } from "vue";

import type { NodePort } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import { useNodeInfo } from "./useNodeInfo";

type UsePortAnimationClassesOptions = {
  nodeId: string;
  connectorHover: boolean;
  hover: boolean;
};

export const usePortAnimationClasses = (
  options: UsePortAnimationClassesOptions,
) => {
  const store = useStore();

  const { isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  const isWritable = computed<boolean>(
    () => store.getters["workflow/isWritable"],
  );

  const quickActionMenu = computed(() => store.state.workflow.quickActionMenu);

  const isQuickAddNodeMenuOpenInTheSameSide = (side: "in" | "out") => {
    return (
      (quickActionMenu.value.props?.nodeRelation === "SUCCESSORS" &&
        side === "out") ||
      (quickActionMenu.value.props?.nodeRelation === "PREDECESSORS" &&
        side === "in")
    );
  };

  const isShowingQuickAddNodeMenu = (portIndex: number, side: "in" | "out") => {
    return (
      quickActionMenu.value.isOpen &&
      isQuickAddNodeMenuOpenInTheSameSide(side) &&
      quickActionMenu.value.props?.nodeId === options.nodeId &&
      quickActionMenu.value.props?.port?.index === portIndex
    );
  };

  const isMickeyMousePort = (port: NodePort) => {
    return !isMetanode.value && port.index === 0;
  };

  // default flow variable ports (Mickey Mouse ears) are only shown if connected, selected, or on hover
  const portAnimationClasses = (port: NodePort, side: "in" | "out") => {
    if (!isMickeyMousePort(port)) {
      return {};
    }

    const isConnected =
      isShowingQuickAddNodeMenu(port.index, side) || port.connectedVia.length;

    return {
      "mickey-mouse": true,
      "connector-hover": options.connectorHover,
      connected: isConnected,
      "read-only": !isWritable.value,
      "node-hover": options.hover,
    };
  };

  return { portAnimationClasses, isMickeyMousePort };
};
