import Portal from "@/components/common/Portal.vue";
import PortalTarget from "@/components/common/PortalTarget.vue";

declare module "vue" {
  export interface GlobalComponents {
    Portal: typeof Portal;
    PortalTarget: typeof PortalTarget;
  }
}
