/**
 * The purpose of these helpers is to map information that
 * is not directly provided by the API, particularly around ports. Normally, port objects
 * have limited information and only list their typeId which uniquely identifies that port.
 * Any other information on ports, such as color, kind, and other properties declared in
 * PortType are only available by accessing the global dictionary of
 * installed ports via the global application state property `availablePortTypes` and then
 * indexing in using the unique port typeId.
 *
 * These mapping utilities are tailored to different features that in one way or another
 * need port information. Thus, new mappers should be created accordingly based on this principle
 */

export * from "./ports";
export * from "./nodeTemplate";
export * from "./nodeDescription";
export * from "./componentDescription";
export * from "./componentSearch";
