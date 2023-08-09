import type {
  PortViewDescriptor,
  PortViewDescriptorMapping,
} from "@/api/gateway-api/generated-api";
import type { ValueSwitchItem } from "webapps-common/ui/components/forms/ValueSwitch.vue";

export const mapPortViewDescriptorsToItems = (
  data: {
    descriptors: Array<PortViewDescriptor>;
    descriptorMapping: PortViewDescriptorMapping;
  },
  currentNodeState: "configured" | "executed",
): Array<ValueSwitchItem> => {
  const descriptorIndexes = data.descriptorMapping[currentNodeState];

  // non-spec views are disabled at the configured state
  const isDisabled = (item: PortViewDescriptor) =>
    !item.isSpecView && currentNodeState === "configured";

  return descriptorIndexes.map((index) => {
    const descriptor = data.descriptors.at(index);

    return {
      // tab id will be the descriptor index
      id: index.toString(),
      text: descriptor.label,
      disabled: isDisabled(descriptor),
    };
  });
};
