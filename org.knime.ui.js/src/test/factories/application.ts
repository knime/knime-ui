import merge from "lodash/merge";
import type { Project } from "@/api/gateway-api/generated-api";
import type { DeepPartial } from "../utils";

export const createProject = (data: DeepPartial<Project>): Project => {
  const base: Project = {
    projectId: "project1",
    name: "GeneratedMockProject",
  };

  return merge(base, data);
};
