import { useConfirmDialog } from ".";

type CollisionHandlingStrategy = "OVERWRITE" | "NOOP" | "AUTORENAME" | "CANCEL";

export const usePromptCollisionStrategies = () => {
  const { show: showConfirmDialog } = useConfirmDialog();

  const promptCollisionStrategies =
    async (): Promise<CollisionHandlingStrategy> => {
      let strategy: CollisionHandlingStrategy = "CANCEL";

      const prompt = () =>
        showConfirmDialog({
          title: "Name collision handling",
          message:
            "An item of this name already exists. Do you want to continue the operation?",

          buttons: [
            {
              type: "cancel",
              label: "Cancel",
            },
            {
              type: "confirm",
              label: "Rename",
              flushRight: true,
              customHandler: ({ confirm }) => {
                strategy = "AUTORENAME";
                confirm();
              },
            },
            {
              type: "confirm",
              label: "Overwrite",
              customHandler: ({ confirm }) => {
                strategy = "OVERWRITE";
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
