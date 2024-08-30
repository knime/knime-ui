import { getToastsProvider } from "@/plugins/toasts";
import { merge } from "lodash-es";

const $toast = getToastsProvider();

export const copyErrorInformation = (data: object = {}) => {
  merge(data, {
    _general: {
      date: new Date().toUTCString(),
    },
  });
  return navigator.clipboard.writeText(JSON.stringify(data, null, 2));
};

export const showErrorToast = ({
  id = "__UNKNOWN_ERROR_ID",
  headline,
  message,
  reportData,
}: {
  id?: string;
  headline?: string;
  message: string;
  reportData?: object;
}) => {
  return $toast.show({
    id,
    headline,
    message,
    type: "error",
    autoRemove: false,
    ...(reportData
      ? {
          buttons: [
            {
              callback: () => copyErrorInformation(reportData),
              text: "Copy error",
            },
          ],
        }
      : {}),
  });
};
