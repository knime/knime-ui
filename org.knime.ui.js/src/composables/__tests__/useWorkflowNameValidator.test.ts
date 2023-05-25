import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { useWorkflowNameValidator } from "../useWorkflowNameValidator";

describe("useWorkflowNameValidator", () => {
  const blacklistedNames = ["foo", "bar"];

  it("should check for invalid characters", () => {
    const name = ref("");
    const { isValid, errorMessage } = useWorkflowNameValidator({
      blacklistedNames: ref(blacklistedNames),
      name,
    });

    expect(errorMessage.value).toBe("");
    expect(isValid.value).toBe(true);

    name.value = "&*9a?/\\sdasd";

    expect(isValid.value).toBe(false);
    expect(errorMessage.value).toMatch("Name contains invalid characters");
  });

  it("should check for name collision", () => {
    const name = ref("foo");
    const { isValid, errorMessage } = useWorkflowNameValidator({
      blacklistedNames: ref(blacklistedNames),
      name,
    });

    expect(isValid.value).toBe(false);
    expect(errorMessage.value).toMatch(
      "Name is already taken by another workflow"
    );
  });

  it("should check for name character limit", () => {
    const newName = new Array(256)
      .fill(0)
      .map((_) => "a")
      .join("");
    const name = ref(newName);

    const { isValid, errorMessage } = useWorkflowNameValidator({
      blacklistedNames: ref(blacklistedNames),
      name,
    });

    expect(isValid.value).toBe(false);
    expect(errorMessage.value).toMatch("exceeds 255 characters");
  });

  it.each([".", "\\", "/"])(
    "should return a function to clean invalid prefixes and suffixes",
    (invalidChar) => {
      const name = ref(`${invalidChar}some text${invalidChar}`);

      const { isValid, cleanName } = useWorkflowNameValidator({
        blacklistedNames: ref(blacklistedNames),
        name,
      });

      expect(isValid.value).toBe(true);
      expect(cleanName(name.value)).toMatch("some text");
    }
  );
});
