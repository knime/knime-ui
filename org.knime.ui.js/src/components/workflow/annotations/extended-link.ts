import type { Editor } from "@tiptap/vue-3";

interface CustomLinkOptions {
  isEditing: boolean;
  url: string;
  urlText: string;
  text: string;
}

export const addCustomLink = (
  editor: Editor,
  { isEditing, url, urlText, text }: CustomLinkOptions,
) => {
  if (isEditing) {
    editor
      .chain()
      .focus()
      .setLink({ href: url })
      .command(({ tr }) => {
        tr.insertText(text || urlText);
        return true;
      })
      .run();
  } else {
    // TODO replace this rather complicated way to add a link once the tiptap bug is fixed
    const { view } = editor;
    const { from: startIndex } = view.state.selection;

    // escape link with space when creating a new link
    editor
      .chain()
      .focus()
      .insertContent([{ type: "text", text: " " }])
      .run();
    editor
      .chain()
      .focus()
      .insertContentAt(startIndex, [{ type: "text", text: text || urlText }])
      .run();

    const { from: endIndex } = view.state.selection;

    editor.commands.setTextSelection({
      from: startIndex,
      to: endIndex,
    });

    editor.chain().focus().setLink({ href: url }).run();
  }
};
