import { mockStores } from "@/test/utils/mockStores";

export const loadStore = () => {
  const mockedStores = mockStores();

  return {
    ...mockedStores,
  };
};
