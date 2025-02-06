import { onMounted, onUnmounted } from "vue";

import { $bus, type BusEvents } from "@/plugins/event-bus";

export const useGlobalBusListener = <T extends keyof BusEvents>(options: {
  eventName: T;
  handler: (param: BusEvents[T]) => void;
}) => {
  const { eventName, handler } = options;

  onMounted(() => {
    $bus.on(eventName, handler);
  });

  onUnmounted(() => {
    $bus.off(eventName, handler);
  });
};
