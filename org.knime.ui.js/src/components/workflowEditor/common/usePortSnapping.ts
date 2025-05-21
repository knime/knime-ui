import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { NodePortGroups } from "@/api/custom-types";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";
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
  const { activeWorkflow } = storeToRefs(useWorkflowStore());
  const { availablePortTypes } = storeToRefs(useApplicationStore());
  const connections = computed(() => activeWorkflow.value!.connections);

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
