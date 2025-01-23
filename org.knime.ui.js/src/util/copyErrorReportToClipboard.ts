import { version } from "vue";

const toEnumeratedObject = (obj: object) => {
  return Object.getOwnPropertyNames(obj).reduce(
    (acc, cur) => {
      acc[cur] = obj[cur as keyof object];
      return acc;
    },
    {} as Record<any, any>,
  );
};

export const copyErrorReportToClipboard = (data: object = {}) => {
  const general = {
    app: "KnimeUI",
    vueVersion: version,
    timestamp: new Date().toISOString(),
  };

  return navigator.clipboard.writeText(
    JSON.stringify(
      { ...general, ...data },
      // Error object's properties are non-enumerable, and would by default be omitted in the serialization
      (_, value) =>
        value instanceof Error ? toEnumeratedObject(value) : value,
      2,
    ),
  );
};
