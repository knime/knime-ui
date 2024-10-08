import { computed } from "vue";

import type { AvailablePortTypes, NodePortGroups } from "@/api/custom-types";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import {
  type Direction,
  checkCompatibleConnectionAndPort,
  generateValidPortGroupsForPlaceholderPort,
} from "@/util/compatibleConnections";

type PlaceholderPort = {
  isPlaceHolderPort: boolean;
};

export type PortSnapCallback = (params: {
  snapPosition: [number, number];
  targetPort: NodePort | PlaceholderPort;
  targetPortGroups: NodePortGroups;
}) => {
  didSnap: boolean;
  createPortFromPlaceholder?: { validPortGroups: NodePortGroups } | null;
};

const isPlaceholderPort = (
  port: NodePort | PlaceholderPort,
): port is PlaceholderPort => (port as PlaceholderPort).isPlaceHolderPort;

export const usePortSnapping = () => {
  const store = useStore();
  const connections = computed(
    () => store.state.workflow.activeWorkflow!.connections,
  );
  const availablePortTypes = computed<AvailablePortTypes>(
    () => store.state.application.availablePortTypes,
  );

  const shouldPortSnap = ({
    sourcePort,
    targetPort,
    targetPortDirection,
    targetPortGroups,
  }: {
    sourcePort: NodePort;
    targetPort: NodePort | PlaceholderPort;
    targetPortDirection: Direction;
    targetPortGroups: NodePortGroups;
  }) => {
    let isCompatible: boolean = false;
    let validPortGroups: NodePortGroups | null = null;

    if (isPlaceholderPort(targetPort)) {
      validPortGroups = generateValidPortGroupsForPlaceholderPort({
        fromPort: sourcePort,
        availablePortTypes: availablePortTypes.value,
        targetPortDirection,
        targetPortGroups,
      });
      isCompatible = validPortGroups !== null;
    } else {
      isCompatible = checkCompatibleConnectionAndPort({
        fromPort: sourcePort,
        toPort: targetPort,
        availablePortTypes: availablePortTypes.value,
        targetPortDirection,
        connections: connections.value,
      });
    }

    return { isCompatible, validPortGroups };
  };

  return { shouldPortSnap };
};
