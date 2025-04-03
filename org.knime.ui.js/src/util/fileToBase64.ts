/**
 * Returns the base64 encoded contents of the file that will be fetched from the given
 * filepath
 *
 * @param filepath
 * @returns
 */
export const fileToBase64 = async (filepath: string): Promise<string> => {
  const dataUrlDeclarationHeaderRegex = /data:.+\/.+;base64,/g;

  const blobContent = await fetch(filepath).then((response) => response.blob());

  return new Promise((resolve) => {
    const reader = new FileReader();

    // Read file content on file loaded event
    reader.onload = function (event) {
      resolve(
        // remove data url preceding headers to be left only with the base64 encoded string
        (event.target!.result as string).replace(
          dataUrlDeclarationHeaderRegex,
          "",
        ),
      );
    };

    // Convert data to base64
    reader.readAsDataURL(blobContent);
  });
};
