import type { NameCollisionHandling } from "@/api/custom-types";

import { useConfirmDialog } from ".";

export const usePromptCollisionStrategies = () => {
  const { show: showConfirmDialog } = useConfirmDialog();

  const promptCollisionStrategies =
    async (): Promise<NameCollisionHandling> => {
      let strategy: NameCollisionHandling = "CANCEL";

      const prompt = () =>
        showConfirmDialog({
          title: "Name conflict",
          message:
            "An item of this name already exists in this location. Overwrite the existing item(s) or keep all by renaming automatically?",
          buttons: [
            {
              type: "cancel",
              label: "Cancel",
            },
            {
              type: "confirm",
              label: "Overwrite",
              flushRight: true,
              customHandler: ({ confirm }) => {
                strategy = "OVERWRITE";
                confirm();
              },
            },
            {
              type: "confirm",
              label: "Rename",
              customHandler: ({ confirm }) => {
                strategy = "AUTORENAME";
                confirm();
              },
            },
          ],
        });

      await prompt();
      return strategy;
    };

  return {
    promptCollisionStrategies,
  };
};
