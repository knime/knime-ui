import { connection } from "./connection";
import { node } from "./node";
import { port } from "./port";
import { project } from "./project";

export const workflowDomain = { node, project, port, connection };
export type * from "./connection";
