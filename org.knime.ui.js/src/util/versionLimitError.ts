import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { getToastPresets } from "@/toastPresets";

const { PRICING_URL } = knimeExternalUrls;
const { toastPresets } = getToastPresets();

type VersionLimitError = {
  name: string;
  status: number;
  data: {
    title: string;
  };
};

const isError = (error: any): error is VersionLimitError => {
  return (
    typeof error === "object" &&
    Object.hasOwn(error, "name") &&
    typeof error.name === "string" &&
    error.name === "FetchError" &&
    Object.hasOwn(error, "status") &&
    typeof error.status === "number" &&
    error.status === 403 &&
    Object.hasOwn(error, "data") &&
    typeof error.data === "object" &&
    Object.hasOwn(error.data, "title") &&
    error.data.title !== null &&
    typeof error.data.title === "string" &&
    error.data.title.includes("version")
  );
};

const showInfo = (error: VersionLimitError): void => {
  toastPresets.api.hubLimitInfo({
    headline: "You have reached the maximum number of versions",
    message: error.data.title,
    button: {
      text: "Upgrade to use unlimited versions",
      href: PRICING_URL,
    },
  });
};

export const useVersionLimitError = () => ({
  isError,
  showInfo,
});
