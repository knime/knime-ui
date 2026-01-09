import { connection } from "./connection";
import { node } from "./node";
import { project } from "./project";

export const workflowDomain = { node, project, connection };
export type * from "./connection";
