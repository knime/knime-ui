export type KaiPromptedEvents = {
  "kai_prompted::kaiqa_button_prompt": never;
  "kai_prompted::kaibuild_button_prompt": never;
  "kai_prompted::qam_button_prompt":
    | {
        nodeFactoryId: string;
        nodeType: string;
      }
    | undefined;
};
