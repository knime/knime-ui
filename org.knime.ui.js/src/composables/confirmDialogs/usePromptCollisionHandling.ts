import { useKdsDynamicModal } from "@knime/kds-components";

import type { NameCollisionHandling } from "@/api/custom-types";

export const usePromptCollisionStrategies = () => {
  const { askConfirmation } = useKdsDynamicModal();

  const promptCollisionStrategies =
    async (): Promise<NameCollisionHandling> => {
      let strategy: NameCollisionHandling = "CANCEL";

      const prompt = () =>
        askConfirmation({
          title: "Name conflict",
          message:
            "An item of this name already exists in this location. Overwrite the existing item(s) or keep all by renaming automatically?",
          buttons: [
            {
              type: "cancel",
              label: "Cancel",
              flushLeft: true,
            },
            {
              type: "confirm",
              label: "Overwrite",
              variant: "outlined",
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
