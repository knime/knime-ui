import { LinkVariant } from "@/api/gateway-api/generated-api";

export const toLinkVariant = (
  variant: LinkVariant.VariantEnum,
): LinkVariant => ({
  variant,
});
