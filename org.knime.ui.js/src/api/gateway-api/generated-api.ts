import type { Configuration } from './configuration';
import { createRPCClient, type RPCClient } from './rpc-client';

/**
 *
 * @export
 * @interface AddAnnotationResult
 */
export interface AddAnnotationResult extends CommandResult {

    /**
     * The ID of the annotation to manipulate
     * @type {string}
     * @memberof AddAnnotationResult
     */
    newAnnotationId: string;

}


/**
 * @export
 * @namespace AddAnnotationResult
 */
export namespace AddAnnotationResult {
}
/**
 * Adds a new node to the workflow.
 * @export
 * @interface AddNodeCommand
 */
export interface AddNodeCommand extends WorkflowCommand {

    /**
     *
     * @type {XY}
     * @memberof AddNodeCommand
     */
    position: XY;
    /**
     *
     * @type {NodeFactoryKey}
     * @memberof AddNodeCommand
     */
    nodeFactory?: NodeFactoryKey;
    /**
     * a url to a file which then determines what node to add
     * @type {string}
     * @memberof AddNodeCommand
     */
    url?: string;
    /**
     *
     * @type {SpaceItemReference}
     * @memberof AddNodeCommand
     */
    spaceItemReference?: SpaceItemReference;
    /**
     * Optional parameter identifying the existing node to connect to
     * @type {string}
     * @memberof AddNodeCommand
     */
    sourceNodeId?: string;
    /**
     * Optional parameter identifying the port index of the existing node to connect to. This will be determined automatically if only a source node id is provided.
     * @type {number}
     * @memberof AddNodeCommand
     */
    sourcePortIdx?: number;

}


/**
 * @export
 * @namespace AddNodeCommand
 */
export namespace AddNodeCommand {
}
/**
 *
 * @export
 * @interface AddNodeResult
 */
export interface AddNodeResult extends CommandResult {

    /**
     * The id of the new node added.
     * @type {string}
     * @memberof AddNodeResult
     */
    newNodeId: string;

}


/**
 * @export
 * @namespace AddNodeResult
 */
export namespace AddNodeResult {
}
/**
 * Add a port to a node. In case of native nodes, the port will be appended to the given port group. In case of container nodes, port will be added as last port.
 * @export
 * @interface AddPortCommand
 */
export interface AddPortCommand extends PortCommand {

    /**
     * The ID of the port type to be added.
     * @type {string}
     * @memberof AddPortCommand
     */
    portTypeId: string;

}


/**
 * @export
 * @namespace AddPortCommand
 */
export namespace AddPortCommand {
}
/**
 *
 * @export
 * @interface AddPortResult
 */
export interface AddPortResult extends CommandResult {

    /**
     * The index of the newly added port
     * @type {number}
     * @memberof AddPortResult
     */
    newPortIdx: number;

}


/**
 * @export
 * @namespace AddPortResult
 */
export namespace AddPortResult {
}
/**
 * Creates a new workflow annotation at a given position.
 * @export
 * @interface AddWorkflowAnnotationCommand
 */
export interface AddWorkflowAnnotationCommand extends WorkflowCommand {

    /**
     *
     * @type {Bounds}
     * @memberof AddWorkflowAnnotationCommand
     */
    bounds: Bounds;
    /**
     * The new border color as a hex string (rgb)
     * @type {string}
     * @memberof AddWorkflowAnnotationCommand
     */
    borderColor: string;

}


/**
 * @export
 * @namespace AddWorkflowAnnotationCommand
 */
export namespace AddWorkflowAnnotationCommand {
}
/**
 * Mainly provides information on what actions are allowed on a node or an entire workflow.
 * @export
 * @interface AllowedActions
 */
export interface AllowedActions {

    /**
     * Whether the node can be executed which depends on the node state and the states of the node&#39;s predecessors.
     * @type {boolean}
     * @memberof AllowedActions
     */
    canExecute: boolean;
    /**
     * Whether the node can be cancelled.
     * @type {boolean}
     * @memberof AllowedActions
     */
    canCancel: boolean;
    /**
     * Whether the node can be reset which depends on the node state and the states of the node&#39;s successors. Not given in case of the project workflow (action to reset all is not supported there).
     * @type {boolean}
     * @memberof AllowedActions
     */
    canReset: boolean;

}


/**
 * Set of actions allowed on connections. This information is not available if no &#39;interaction info&#39; is supposed to be included in the response.
 * @export
 * @interface AllowedConnectionActions
 */
export interface AllowedConnectionActions {

    /**
     * Indicates whether this connection can be deleted. Circumstances that prevent the removal are, e.g., a destination node that is executing (or has executing successors).
     * @type {boolean}
     * @memberof AllowedConnectionActions
     */
    canDelete?: boolean;

}


/**
 * Determines what loop actions are allowed on a loop end node.
 * @export
 * @interface AllowedLoopActions
 */
export interface AllowedLoopActions {

    /**
     * Can resume loop execution?
     * @type {boolean}
     * @memberof AllowedLoopActions
     */
    canResume: boolean;
    /**
     * Can pause loop execution?
     * @type {boolean}
     * @memberof AllowedLoopActions
     */
    canPause: boolean;
    /**
     * Can step to next loop iteration?
     * @type {boolean}
     * @memberof AllowedLoopActions
     */
    canStep: boolean;

}


/**
 * Set of actions allowed specific to nodes.
 * @export
 * @interface AllowedNodeActions
 */
export interface AllowedNodeActions extends AllowedActions {

    /**
     * Indicates whether the dialog can be opened (extra window) or not. If the property is absent, no dialog is available altogether.
     * @type {boolean}
     * @memberof AllowedNodeActions
     */
    canOpenDialog?: boolean;
    /**
     * Indicates  whether a legacy flow variable dialog can be opened. If the property is absent, there is no legacy flow variable dialog.
     * @type {boolean}
     * @memberof AllowedNodeActions
     */
    canOpenLegacyFlowVariableDialog?: boolean;
    /**
     * Indicates whether the node view can opened (extra window) or not. If the property is absent, no node view is available altogether.
     * @type {boolean}
     * @memberof AllowedNodeActions
     */
    canOpenView?: boolean;
    /**
     * Indicates whether this node can be deleted. Circumstances that would prevent a node from being deleted are, e.g., executing state, executing successors, a deletion-lock set on the node, ...
     * @type {boolean}
     * @memberof AllowedNodeActions
     */
    canDelete?: boolean;
    /**
     * Only present for components or metanodes. Describes whether the node can be expanded. In case of \&quot;resetRequired\&quot;, the contained nodes have to be reset first.
     * @type {string}
     * @memberof AllowedNodeActions
     */
    canExpand?: AllowedNodeActions.CanExpandEnum;
    /**
     * Describes whether the selection can be collapsed if it contains this node. In case of \&quot;resetRequired\&quot;, the node has to be reset first.
     * @type {string}
     * @memberof AllowedNodeActions
     */
    canCollapse?: AllowedNodeActions.CanCollapseEnum;

}


/**
 * @export
 * @namespace AllowedNodeActions
 */
export namespace AllowedNodeActions {
    /**
     * @export
     * @enum {string}
     */
    export enum CanExpandEnum {
        True = 'true',
        ResetRequired = 'resetRequired',
        False = 'false'
    }
    /**
     * @export
     * @enum {string}
     */
    export enum CanCollapseEnum {
        True = 'true',
        ResetRequired = 'resetRequired',
        False = 'false'
    }
}
/**
 * Set of allowed actions specific for a workflow.
 * @export
 * @interface AllowedWorkflowActions
 */
export interface AllowedWorkflowActions extends AllowedActions {

    /**
     * Whether there is an operation that can be undone.
     * @type {boolean}
     * @memberof AllowedWorkflowActions
     */
    canUndo: boolean;
    /**
     * Whether there is an operation that can re-done.
     * @type {boolean}
     * @memberof AllowedWorkflowActions
     */
    canRedo: boolean;

}


/**
 * A text annotation.
 * @export
 * @interface Annotation
 */
export interface Annotation {

    /**
     *
     * @type {string}
     * @memberof Annotation
     */
    text: string;
    /**
     * The background color. If not given, the default background color needs to be used (which is usually opaque).
     * @type {string}
     * @memberof Annotation
     */
    backgroundColor?: string;
    /**
     * The content type of the annotation.
     * @type {string}
     * @memberof Annotation
     */
    contentType: Annotation.ContentTypeEnum;
    /**
     *
     * @type {string}
     * @memberof Annotation
     */
    textAlign?: Annotation.TextAlignEnum;
    /**
     * The default font size (in pt) for parts of the text where no style range is defined.
     * @type {number}
     * @memberof Annotation
     */
    defaultFontSize?: number;
    /**
     * Defines ranges of different styles within the annotation.
     * @type {Array<StyleRange>}
     * @memberof Annotation
     */
    styleRanges?: Array<StyleRange>;

}


/**
 * @export
 * @namespace Annotation
 */
export namespace Annotation {
    /**
     * @export
     * @enum {string}
     */
    export enum ContentTypeEnum {
        Plain = 'text/plain',
        Html = 'text/html'
    }
    /**
     * @export
     * @enum {string}
     */
    export enum TextAlignEnum {
        Left = 'left',
        Center = 'center',
        Right = 'right'
    }
}
/**
 * Represents the global application state.
 * @export
 * @interface AppState
 */
export interface AppState {

    /**
     * List of all opened workflow projects.
     * @type {Array<WorkflowProject>}
     * @memberof AppState
     */
    openProjects?: Array<WorkflowProject>;
    /**
     * List of example projects, e.g., to be shown on and opened from the &#39;get started&#39; page.
     * @type {Array<ExampleProject>}
     * @memberof AppState
     */
    exampleProjects?: Array<ExampleProject>;
    /**
     * All port types available in this installation. Map from port type ID to port type entity.
     * @type {{ [key: string]: PortType; }}
     * @memberof AppState
     */
    availablePortTypes?: { [key: string]: PortType; };
    /**
     * When the user is prompted to select a port type, this subset of types may be used as suggestions.
     * @type {Array<string>}
     * @memberof AppState
     */
    suggestedPortTypeIds?: Array<string>;
    /**
     * If true, node recommendation features can be used, otherwise they have to be disabled.
     * @type {boolean}
     * @memberof AppState
     */
    hasNodeRecommendationsEnabled?: boolean;
    /**
     * Maps a feature-flag key to a feature-flag value (usually, but not necessarily, a boolean). The feature-flags are usually specified/controlled through jvm system properties.
     * @type {{ [key: string]: any; }}
     * @memberof AppState
     */
    featureFlags?: { [key: string]: any; };
    /**
     * If true, scrolling in the workflow canvas will be interpreted as zooming
     * @type {boolean}
     * @memberof AppState
     */
    scrollToZoomEnabled?: boolean;
    /**
     * If true, a node collection is configured on the preference page. The node search will show the nodes of the collection first and the category groups and node recommendations will only show nodes from the collection.
     * @type {boolean}
     * @memberof AppState
     */
    hasNodeCollectionActive?: boolean;
    /**
     * If true, dev mode specific buttons will be shown.
     * @type {boolean}
     * @memberof AppState
     */
    devMode?: boolean;
    /**
     * Mapping from file extension (e.g. \&quot;csv\&quot;) to the template ID of a node that can process such files
     * @type {{ [key: string]: string; }}
     * @memberof AppState
     */
    fileExtensionToNodeTemplateId?: { [key: string]: string; };

}


/**
 * Event for changes to the application state
 * @export
 * @interface AppStateChangedEvent
 */
export interface AppStateChangedEvent extends Event {

    /**
     *
     * @type {AppState}
     * @memberof AppStateChangedEvent
     */
    appState: AppState;

}


/**
 * Event type to register for &#x60;AppStateChangedEvent&#x60;s
 * @export
 * @interface AppStateChangedEventType
 */
export interface AppStateChangedEventType extends EventType {


}


/**
 *
 * @export
 * @interface Bounds
 */
export interface Bounds {

    /**
     *
     * @type {number}
     * @memberof Bounds
     */
    x: number;
    /**
     *
     * @type {number}
     * @memberof Bounds
     */
    y: number;
    /**
     *
     * @type {number}
     * @memberof Bounds
     */
    width: number;
    /**
     *
     * @type {number}
     * @memberof Bounds
     */
    height: number;

}


/**
 * Resets selected nodes and collapses selected nodes and annotations into a metanode or component.
 * @export
 * @interface CollapseCommand
 */
export interface CollapseCommand extends PartBasedCommand {

    /**
     *
     * @type {string}
     * @memberof CollapseCommand
     */
    containerType: CollapseCommand.ContainerTypeEnum;

}


/**
 * @export
 * @namespace CollapseCommand
 */
export namespace CollapseCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum ContainerTypeEnum {
        Metanode = 'metanode',
        Component = 'component'
    }
}
/**
 *
 * @export
 * @interface CollapseResult
 */
export interface CollapseResult extends CommandResult {

    /**
     *
     * @type {string}
     * @memberof CollapseResult
     */
    newNodeId: string;

}


/**
 * @export
 * @namespace CollapseResult
 */
export namespace CollapseResult {
}
/**
 *
 * @export
 * @interface CommandResult
 */
export interface CommandResult {

    /**
     * Workflow changes produced by this command are guaranteed to be contained in a workflow snapshot patch as emitted by &#x60;WorkflowChangedEventSource&#x60; with ID less-or-equal to this ID.
     * @type {string}
     * @memberof CommandResult
     */
    snapshotId?: string;
    /**
     *
     * @type {string}
     * @memberof CommandResult
     */
    kind?: CommandResult.KindEnum;

}


/**
 * @export
 * @namespace CommandResult
 */
export namespace CommandResult {
    /**
     * @export
     * @enum {string}
     */
    export enum KindEnum {
        CollapseResult = 'collapseResult',
        ExpandResult = 'expandResult',
        ConvertContainerResult = 'convertContainerResult',
        CopyResult = 'copyResult',
        PasteResult = 'pasteResult',
        AddNodeResult = 'addNodeResult',
        AddPortResult = 'addPortResult',
        AddAnnotationResult = 'addAnnotationResult'
    }
}
/**
 * A node wrapping (referencing) a workflow (also referred to it as component or subnode) that almost behaves as a ordinary node.
 * @export
 * @interface ComponentNode
 */
export interface ComponentNode extends Node {

    /**
     *
     * @type {NodeState}
     * @memberof ComponentNode
     */
    state?: NodeState;
    /**
     *
     * @type {TemplateLink}
     * @memberof ComponentNode
     */
    link?: TemplateLink;

}


/**
 * @export
 * @namespace ComponentNode
 */
export namespace ComponentNode {
}
/**
 * Properties common to ComponentNode and ComponentNodeDescription. Only purpose is to avoid &#39;code&#39; duplication. Never directly returned or used in another schema.
 * @export
 * @interface ComponentNodeAndDescription
 */
export interface ComponentNodeAndDescription {

    /**
     * The component name.
     * @type {string}
     * @memberof ComponentNodeAndDescription
     */
    name: string;
    /**
     * Can be missing if nothing was selected by the user
     * @type {string}
     * @memberof ComponentNodeAndDescription
     */
    type?: ComponentNodeAndDescription.TypeEnum;
    /**
     * The icon encoded in a data-url. Not available if no icon is set.
     * @type {string}
     * @memberof ComponentNodeAndDescription
     */
    icon?: string;

}


/**
 * @export
 * @namespace ComponentNodeAndDescription
 */
export namespace ComponentNodeAndDescription {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        Source = 'Source',
        Sink = 'Sink',
        Learner = 'Learner',
        Predictor = 'Predictor',
        Manipulator = 'Manipulator',
        Visualizer = 'Visualizer',
        Other = 'Other'
    }
}
/**
 * Description of certain aspects of a component. This is static information for a component which remains the same even if component is not part of a workflow.
 * @export
 * @interface ComponentNodeDescription
 */
export interface ComponentNodeDescription extends ComponentNodeAndDescription {


}


/**
 * @export
 * @namespace ComponentNodeDescription
 */
export namespace ComponentNodeDescription {
}
/**
 * Event that can consist of multiple generic events.
 * @export
 * @interface CompositeEvent
 */
export interface CompositeEvent extends Event {

    /**
     *
     * @type {Array<Event>}
     * @memberof CompositeEvent
     */
    events?: Array<Event>;

}


/**
 * Connects two nodes (and by doing that possibly replacing another connection).
 * @export
 * @interface ConnectCommand
 */
export interface ConnectCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof ConnectCommand
     */
    sourceNodeId: string;
    /**
     *
     * @type {number}
     * @memberof ConnectCommand
     */
    sourcePortIdx: number;
    /**
     *
     * @type {string}
     * @memberof ConnectCommand
     */
    destinationNodeId: string;
    /**
     *
     * @type {number}
     * @memberof ConnectCommand
     */
    destinationPortIdx: number;

}


/**
 * @export
 * @namespace ConnectCommand
 */
export namespace ConnectCommand {
}
/**
 * A single connection between two nodes.
 * @export
 * @interface Connection
 */
export interface Connection {

    /**
     * The connection id.
     * @type {string}
     * @memberof Connection
     */
    id: string;
    /**
     * The destination node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
     * @type {string}
     * @memberof Connection
     */
    destNode: string;
    /**
     * The destination port, starting at 0.
     * @type {number}
     * @memberof Connection
     */
    destPort: number;
    /**
     * The source node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
     * @type {string}
     * @memberof Connection
     */
    sourceNode: string;
    /**
     * The source port, starting at 0.
     * @type {number}
     * @memberof Connection
     */
    sourcePort: number;
    /**
     *
     * @type {boolean}
     * @memberof Connection
     */
    flowVariableConnection?: boolean;
    /**
     * Whether data is streaming through the connection at the moment. Either true or absent.
     * @type {boolean}
     * @memberof Connection
     */
    streaming?: boolean;
    /**
     * A (optional) label for the connection.
     * @type {string}
     * @memberof Connection
     */
    label?: string;
    /**
     *
     * @type {AllowedConnectionActions}
     * @memberof Connection
     */
    allowedActions?: AllowedConnectionActions;

}


/**
 *
 * @export
 * @interface ConvertContainerResult
 */
export interface ConvertContainerResult extends CommandResult {

    /**
     *
     * @type {string}
     * @memberof ConvertContainerResult
     */
    convertedNodeId: string;

}


/**
 * @export
 * @namespace ConvertContainerResult
 */
export namespace ConvertContainerResult {
}
/**
 * Copy selected workflow parts and serialize to workflow definition format.  This command only returns the serialized workflow parts.
 * @export
 * @interface CopyCommand
 */
export interface CopyCommand extends PartBasedCommand {


}


/**
 * @export
 * @namespace CopyCommand
 */
export namespace CopyCommand {
}
/**
 *
 * @export
 * @interface CopyResult
 */
export interface CopyResult extends CommandResult {

    /**
     *
     * @type {string}
     * @memberof CopyResult
     */
    content: string;

}


/**
 * @export
 * @namespace CopyResult
 */
export namespace CopyResult {
}
/**
 * Details about a custom job manager provided by a third party.
 * @export
 * @interface CustomJobManager
 */
export interface CustomJobManager {

    /**
     * The job manager&#39;s name
     * @type {string}
     * @memberof CustomJobManager
     */
    name: string;
    /**
     * An icon for the job manager, encoded as a data-url.
     * @type {string}
     * @memberof CustomJobManager
     */
    icon?: string;
    /**
     * A (larger) icon displayed within the workflow (e.g. of a component). Only necessary for job managers that can be configured on components or metanode. Encoded as a data-url.
     * @type {string}
     * @memberof CustomJobManager
     */
    workflowIcon?: string;

}


/**
 * Cut selected workflow parts and serialize to workflow definition format. This command returns the serialized workflow parts and deletes the selected nodes and annotations.
 * @export
 * @interface CutCommand
 */
export interface CutCommand extends PartBasedCommand {


}


/**
 * @export
 * @namespace CutCommand
 */
export namespace CutCommand {
}
/**
 * Deletes the specified nodes, workflow annotations or connections. Note that there are potentially more connections deleted than specified, i.e. those connected to a node that is to be deleted. If any of the elements can&#39;t be deleted (because it doesn&#39;t exist or the deletion is not allowed) the entire delete operation is aborted (i.e. nothing is deleted).
 * @export
 * @interface DeleteCommand
 */
export interface DeleteCommand extends WorkflowCommand {

    /**
     * The ids of the nodes referenced.
     * @type {Array<string>}
     * @memberof DeleteCommand
     */
    nodeIds: Array<string>;
    /**
     * The ids of the workflow annotations referenced.
     * @type {Array<string>}
     * @memberof DeleteCommand
     */
    annotationIds: Array<string>;
    /**
     * The ids of the connections referenced.
     * @type {Array<string>}
     * @memberof DeleteCommand
     */
    connectionIds: Array<string>;

}


/**
 * @export
 * @namespace DeleteCommand
 */
export namespace DeleteCommand {
}
/**
 * The description of a dynamic port group. A dynamic port group is a collection of dynamic ports, grouped by a common identifier, e.g. \&quot;Input\&quot; or \&quot;Output\&quot;.
 * @export
 * @interface DynamicPortGroupDescription
 */
export interface DynamicPortGroupDescription {

    /**
     * The name of the dynamic port group.
     * @type {string}
     * @memberof DynamicPortGroupDescription
     */
    name: string;
    /**
     * The identifier of the dynamic port group.
     * @type {string}
     * @memberof DynamicPortGroupDescription
     */
    identifier: string;
    /**
     * The description of the dynamic port group. May contain HTML markup tags.
     * @type {string}
     * @memberof DynamicPortGroupDescription
     */
    description?: string;
    /**
     * The port types available in this dynamic port group.
     * @type {Array<NodePortTemplate>}
     * @memberof DynamicPortGroupDescription
     */
    supportedPortTypes?: Array<NodePortTemplate>;

}


/**
 * Parent object for events from the backend to the frontend.
 * @export
 * @interface Event
 */
export interface Event {


}


/**
 * Event type (sub-types) are used to describe the type of events one wants to register for. An event type is parameterized by its properties (defined in sub-types).
 * @export
 * @interface EventType
 */
export interface EventType {

    /**
     * A unique type id. Must be the name of the actual event type object (e.g. &#39;WorkflowChangedEventType&#39;)
     * @type {string}
     * @memberof EventType
     */
    typeId?: string;

}


/**
 * Represents an example project.
 * @export
 * @interface ExampleProject
 */
export interface ExampleProject {

    /**
     * The example project name.
     * @type {string}
     * @memberof ExampleProject
     */
    name?: string;
    /**
     * Base-64 encoded string representing the workflow-svg.
     * @type {string}
     * @memberof ExampleProject
     */
    svg?: string;
    /**
     *
     * @type {SpaceItemReference}
     * @memberof ExampleProject
     */
    origin?: SpaceItemReference;

}


/**
 * Resets nodes contained in the metanode or container and expands it.
 * @export
 * @interface ExpandCommand
 */
export interface ExpandCommand extends WorkflowCommand {

    /**
     * Id of node to be expanded
     * @type {string}
     * @memberof ExpandCommand
     */
    nodeId: string;

}


/**
 * @export
 * @namespace ExpandCommand
 */
export namespace ExpandCommand {
}
/**
 *
 * @export
 * @interface ExpandResult
 */
export interface ExpandResult extends CommandResult {

    /**
     *
     * @type {Array<string>}
     * @memberof ExpandResult
     */
    expandedNodeIds: Array<string>;
    /**
     *
     * @type {Array<string>}
     * @memberof ExpandResult
     */
    expandedAnnotationIds: Array<string>;

}


/**
 * @export
 * @namespace ExpandResult
 */
export namespace ExpandResult {
}
/**
 * Inserts a node on top of an existing connection
 * @export
 * @interface InsertNodeCommand
 */
export interface InsertNodeCommand extends WorkflowCommand {

    /**
     * The connection id.
     * @type {string}
     * @memberof InsertNodeCommand
     */
    connectionId: string;
    /**
     *
     * @type {XY}
     * @memberof InsertNodeCommand
     */
    position: XY;
    /**
     *
     * @type {NodeFactoryKey}
     * @memberof InsertNodeCommand
     */
    nodeFactory?: NodeFactoryKey;
    /**
     * the id of an existing node
     * @type {string}
     * @memberof InsertNodeCommand
     */
    nodeId?: string;

}


/**
 * @export
 * @namespace InsertNodeCommand
 */
export namespace InsertNodeCommand {
}
/**
 * The node/workflow&#39;s job manager, if a special one is defined. Otherwise not given.
 * @export
 * @interface JobManager
 */
export interface JobManager {

    /**
     * The type of job manager being used. Either a build-in job manager type or &#39;other&#39; in case of a third party job manager. Details for custom job managers are provided via the &#39;custom&#39;-field.
     * @type {string}
     * @memberof JobManager
     */
    type: JobManager.TypeEnum;
    /**
     *
     * @type {CustomJobManager}
     * @memberof JobManager
     */
    custom?: CustomJobManager;

}


/**
 * @export
 * @namespace JobManager
 */
export namespace JobManager {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        Streaming = 'streaming',
        Other = 'other'
    }
}
/**
 * Represents a single link including the URL and link text.
 * @export
 * @interface Link
 */
export interface Link {

    /**
     * the uniform resource locator the user has specified
     * @type {string}
     * @memberof Link
     */
    url: string;
    /**
     * the text that the user selected to display for the link
     * @type {string}
     * @memberof Link
     */
    text?: string;

}


/**
 * Loop info. Only present on loop end nodes.
 * @export
 * @interface LoopInfo
 */
export interface LoopInfo {

    /**
     *
     * @type {AllowedLoopActions}
     * @memberof LoopInfo
     */
    allowedActions?: AllowedLoopActions;
    /**
     * The loop status.
     * @type {string}
     * @memberof LoopInfo
     */
    status?: LoopInfo.StatusEnum;

}


/**
 * @export
 * @namespace LoopInfo
 */
export namespace LoopInfo {
    /**
     * @export
     * @enum {string}
     */
    export enum StatusEnum {
        RUNNING = 'RUNNING',
        PAUSED = 'PAUSED',
        FINISHED = 'FINISHED'
    }
}
/**
 * A node containing (referencing) a workflow (also referred to it as metanode)
 * @export
 * @interface MetaNode
 */
export interface MetaNode extends Node {

    /**
     *
     * @type {string}
     * @memberof MetaNode
     */
    name: string;
    /**
     *
     * @type {MetaNodeState}
     * @memberof MetaNode
     */
    state: MetaNodeState;
    /**
     * The list of inputs.
     * @type {Array<MetaNodePort>}
     * @memberof MetaNode
     */
    inPorts: Array<MetaNodePort>;
    /**
     * The list of outputs.
     * @type {Array<MetaNodePort>}
     * @memberof MetaNode
     */
    outPorts: Array<MetaNodePort>;
    /**
     *
     * @type {TemplateLink}
     * @memberof MetaNode
     */
    link?: TemplateLink;

}


/**
 * @export
 * @namespace MetaNode
 */
export namespace MetaNode {
}
/**
 * Extension of a node port with extra properties as required to characterise a metanode port.
 * @export
 * @interface MetaNodePort
 */
export interface MetaNodePort extends NodePort {

    /**
     * The execution state of the node connected to this port if it&#39;s a out port. Otherwise not present.
     * @type {string}
     * @memberof MetaNodePort
     */
    nodeState?: MetaNodePort.NodeStateEnum;

}


/**
 * @export
 * @namespace MetaNodePort
 */
export namespace MetaNodePort {
    /**
     * @export
     * @enum {string}
     */
    export enum NodeStateEnum {
        IDLE = 'IDLE',
        CONFIGURED = 'CONFIGURED',
        EXECUTED = 'EXECUTED',
        EXECUTING = 'EXECUTING',
        QUEUED = 'QUEUED',
        HALTED = 'HALTED'
    }
}
/**
 * The state for a metanode.
 * @export
 * @interface MetaNodeState
 */
export interface MetaNodeState {

    /**
     *
     * @type {string}
     * @memberof MetaNodeState
     */
    executionState?: MetaNodeState.ExecutionStateEnum;

}


/**
 * @export
 * @namespace MetaNodeState
 */
export namespace MetaNodeState {
    /**
     * @export
     * @enum {string}
     */
    export enum ExecutionStateEnum {
        IDLE = 'IDLE',
        EXECUTING = 'EXECUTING',
        EXECUTED = 'EXECUTED'
    }
}
/**
 * Describes the ports(-bar) leading into or leaving a metanode&#39;s workflow. Is not given if there aren&#39;t any metanode inputs/outputs or if it&#39;s not a metanode&#39;s workflow (but a component&#39;s workflow or the root).
 * @export
 * @interface MetaPorts
 */
export interface MetaPorts {

    /**
     * The horizontal position of the ports(-bar).
     * @type {number}
     * @memberof MetaPorts
     */
    xPos?: number;
    /**
     *
     * @type {Array<NodePort>}
     * @memberof MetaPorts
     */
    ports?: Array<NodePort>;

}


/**
 * Native node extension of a node.
 * @export
 * @interface NativeNode
 */
export interface NativeNode extends Node {

    /**
     * The id of the node template this node is an instance of.
     * @type {string}
     * @memberof NativeNode
     */
    templateId: string;
    /**
     *
     * @type {NodeState}
     * @memberof NativeNode
     */
    state?: NodeState;
    /**
     *
     * @type {LoopInfo}
     * @memberof NativeNode
     */
    loopInfo?: LoopInfo;
    /**
     * A map of string keys and port group values
     * @type {{ [key: string]: PortGroup; }}
     * @memberof NativeNode
     */
    portGroups?: { [key: string]: PortGroup; };
    /**
     * Indicates whether the node has a view.  Not present, if the node has no view.
     * @type {boolean}
     * @memberof NativeNode
     */
    hasView?: boolean;
    /**
     * Indicates whether the node can re-execute itself (e.g. within a page of a data app). It&#39;s absent if the node isn&#39;t re-executable at all (i.e. it can&#39;t even be configured to be re-executable).
     * @type {boolean}
     * @memberof NativeNode
     */
    isReexecutable?: boolean;

}


/**
 * @export
 * @namespace NativeNode
 */
export namespace NativeNode {
}
/**
 * Description of certain aspects of a native node.
 * @export
 * @interface NativeNodeDescription
 */
export interface NativeNodeDescription extends NodeDescription {

    /**
     * A short description of the node. This is a simple string without markup tags.
     * @type {string}
     * @memberof NativeNodeDescription
     */
    shortDescription?: string;
    /**
     *
     * @type {Array<DynamicPortGroupDescription>}
     * @memberof NativeNodeDescription
     */
    dynamicInPortGroupDescriptions?: Array<DynamicPortGroupDescription>;
    /**
     *
     * @type {Array<DynamicPortGroupDescription>}
     * @memberof NativeNodeDescription
     */
    dynamicOutPortGroupDescriptions?: Array<DynamicPortGroupDescription>;
    /**
     *
     * @type {NodeViewDescription}
     * @memberof NativeNodeDescription
     */
    interactiveView?: NodeViewDescription;
    /**
     * A collection of URLs.
     * @type {Array<Link>}
     * @memberof NativeNodeDescription
     */
    links?: Array<Link>;

}


/**
 * Static properties of a native node which remain the same even if the node is not part of a workflow.
 * @export
 * @interface NativeNodeInvariants
 */
export interface NativeNodeInvariants {

    /**
     * The node&#39;s name.
     * @type {string}
     * @memberof NativeNodeInvariants
     */
    name: string;
    /**
     * The type of the node.
     * @type {string}
     * @memberof NativeNodeInvariants
     */
    type: NativeNodeInvariants.TypeEnum;
    /**
     * The icon encoded in a data-url.
     * @type {string}
     * @memberof NativeNodeInvariants
     */
    icon?: string;
    /**
     *
     * @type {NodeFactoryKey}
     * @memberof NativeNodeInvariants
     */
    nodeFactory?: NodeFactoryKey;

}


/**
 * @export
 * @namespace NativeNodeInvariants
 */
export namespace NativeNodeInvariants {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        Source = 'Source',
        Sink = 'Sink',
        Learner = 'Learner',
        Predictor = 'Predictor',
        Manipulator = 'Manipulator',
        Visualizer = 'Visualizer',
        Widget = 'Widget',
        LoopStart = 'LoopStart',
        LoopEnd = 'LoopEnd',
        ScopeStart = 'ScopeStart',
        ScopeEnd = 'ScopeEnd',
        QuickForm = 'QuickForm',
        Configuration = 'Configuration',
        Other = 'Other',
        Missing = 'Missing',
        Unknown = 'Unknown',
        Subnode = 'Subnode',
        VirtualIn = 'VirtualIn',
        VirtualOut = 'VirtualOut',
        Container = 'Container'
    }
}
/**
 * Represents a node of certain kind (native node, component, metanode) in a workflow.
 * @export
 * @interface Node
 */
export interface Node {

    /**
     * The id of the node.
     * @type {string}
     * @memberof Node
     */
    id: string;
    /**
     * The list of inputs.
     * @type {Array<NodePort>}
     * @memberof Node
     */
    inPorts: Array<NodePort>;
    /**
     * The list of outputs.
     * @type {Array<NodePort>}
     * @memberof Node
     */
    outPorts: Array<NodePort>;
    /**
     *
     * @type {NodeAnnotation}
     * @memberof Node
     */
    annotation?: NodeAnnotation;
    /**
     *
     * @type {XY}
     * @memberof Node
     */
    position: XY;
    /**
     * Whether it&#39;s a native node, component or a metanode.
     * @type {string}
     * @memberof Node
     */
    kind: Node.KindEnum;
    /**
     * Indicates whether this node has a dialog. Not present, if the node has no dialog.
     * @type {boolean}
     * @memberof Node
     */
    hasDialog?: boolean;
    /**
     *
     * @type {AllowedNodeActions}
     * @memberof Node
     */
    allowedActions?: AllowedNodeActions;
    /**
     *
     * @type {NodeExecutionInfo}
     * @memberof Node
     */
    executionInfo?: NodeExecutionInfo;

}


/**
 * @export
 * @namespace Node
 */
export namespace Node {
    /**
     * @export
     * @enum {string}
     */
    export enum KindEnum {
        Node = 'node',
        Component = 'component',
        Metanode = 'metanode'
    }
}
/**
 * The annotation to a node.
 * @export
 * @interface NodeAnnotation
 */
export interface NodeAnnotation extends Annotation {


}


/**
 * @export
 * @namespace NodeAnnotation
 */
export namespace NodeAnnotation {
}
/**
 * Node description properties that are common to all kinds of nodes. This is static information in the sense that it does not depend on a concrete node instance in a workflow.
 * @export
 * @interface NodeDescription
 */
export interface NodeDescription {

    /**
     * The freeform description text of the node. Sometimes also referred to as \&quot;intro text\&quot;. May contain HTML markup tags.
     * @type {string}
     * @memberof NodeDescription
     */
    description?: string;
    /**
     * List of dialog option groups. In case the dialog options are actually ungrouped, this is a singleton list containing a group with no name or description.
     * @type {Array<NodeDialogOptionGroup>}
     * @memberof NodeDescription
     */
    options?: Array<NodeDialogOptionGroup>;
    /**
     * Descriptions for the node views.
     * @type {Array<NodeViewDescription>}
     * @memberof NodeDescription
     */
    views?: Array<NodeViewDescription>;
    /**
     * Descriptions of static input ports.
     * @type {Array<NodePortDescription>}
     * @memberof NodeDescription
     */
    inPorts?: Array<NodePortDescription>;
    /**
     * Descriptions of static output ports.
     * @type {Array<NodePortDescription>}
     * @memberof NodeDescription
     */
    outPorts?: Array<NodePortDescription>;

}


/**
 * Description of a single node dialog option.
 * @export
 * @interface NodeDialogOptionDescription
 */
export interface NodeDialogOptionDescription {

    /**
     * The dialog option name.
     * @type {string}
     * @memberof NodeDialogOptionDescription
     */
    name: string;
    /**
     * The actual description of the dialog option. May contain HTML markup tags.
     * @type {string}
     * @memberof NodeDialogOptionDescription
     */
    description: string;
    /**
     * Whether the dialog option is marked as optional.
     * @type {boolean}
     * @memberof NodeDialogOptionDescription
     */
    optional?: boolean;

}


/**
 * A group of node dialog options.
 * @export
 * @interface NodeDialogOptionGroup
 */
export interface NodeDialogOptionGroup {

    /**
     * The name of the dialog option group.
     * @type {string}
     * @memberof NodeDialogOptionGroup
     */
    sectionName?: string;
    /**
     * The description of the dialog option group.
     * @type {string}
     * @memberof NodeDialogOptionGroup
     */
    sectionDescription?: string;
    /**
     *
     * @type {Array<NodeDialogOptionDescription>}
     * @memberof NodeDialogOptionGroup
     */
    fields?: Array<NodeDialogOptionDescription>;

}


/**
 * Information about the node execution. Might not be present if no special node execution info is available. If given, usually only one of the following properties is set, either the icon, the &#39;streamable&#39;-flag, or the job-manager.
 * @export
 * @interface NodeExecutionInfo
 */
export interface NodeExecutionInfo {

    /**
     *
     * @type {JobManager}
     * @memberof NodeExecutionInfo
     */
    jobManager?: JobManager;
    /**
     * This properties is only given if this node is part of a workflow (i.e. a component&#39;s workflow) that is in streaming mode. If true, this node can process the data in streamed manner, if false, it can&#39;t.
     * @type {boolean}
     * @memberof NodeExecutionInfo
     */
    streamable?: boolean;
    /**
     * A custom (decorator) icon set by its node executor (or the node executor of the parent workflow). Not present if the custom executor doesn&#39;t define a special icon or the &#39;streamable&#39; property is given. The icon is encoded in a data-url.
     * @type {string}
     * @memberof NodeExecutionInfo
     */
    icon?: string;

}


/**
 * Object to identify and load a node factory.
 * @export
 * @interface NodeFactoryKey
 */
export interface NodeFactoryKey {

    /**
     * The fully qualified java classname.
     * @type {string}
     * @memberof NodeFactoryKey
     */
    className: string;
    /**
     * Additional factory settings. Only required in case of &#39;dynamic&#39; node factories.
     * @type {string}
     * @memberof NodeFactoryKey
     */
    settings?: string;

}


/**
 * A group of nodes.
 * @export
 * @interface NodeGroup
 */
export interface NodeGroup {

    /**
     * The tag representing the node group.
     * @type {string}
     * @memberof NodeGroup
     */
    tag: string;
    /**
     * List of nodes corresponding to the given tag, in most-frequently-used order.
     * @type {Array<NodeTemplate>}
     * @memberof NodeGroup
     */
    nodes: Array<NodeTemplate>;

}


/**
 * A list of node groups.
 * @export
 * @interface NodeGroups
 */
export interface NodeGroups {

    /**
     * The list of node groups in a fixed order.
     * @type {Array<NodeGroup>}
     * @memberof NodeGroups
     */
    groups: Array<NodeGroup>;
    /**
     * Total number of groups available. In case the maximum number of included groups has been limited, the length of the \&quot;groups\&quot; list may be smaller than this number.
     * @type {number}
     * @memberof NodeGroups
     */
    totalNumGroups: number;

}


/**
 * A single port of a node.
 * @export
 * @interface NodePort
 */
export interface NodePort extends NodePortTemplate {

    /**
     * For native nodes, this provides additional information if the port carries data (i.e. if the respective node is executed and the port is active). For components, the port description is taken from the component&#39;s description, if provided by the user.
     * @type {string}
     * @memberof NodePort
     */
    info?: string;
    /**
     * The index starting at 0.
     * @type {number}
     * @memberof NodePort
     */
    index: number;
    /**
     *
     * @type {Array<string>}
     * @memberof NodePort
     */
    connectedVia?: Array<string>;
    /**
     *
     * @type {boolean}
     * @memberof NodePort
     */
    inactive?: boolean;
    /**
     * A port content version which allows one to detect port content changes (port data and spec). Will be absent if there is no data, i.e. no port content at all or if it&#39;s an input port. Will also be absent if there is no &#39;interaction info&#39; supposed to be included.
     * @type {number}
     * @memberof NodePort
     */
    portContentVersion?: number;
    /**
     * The port group this port belongs to. Only available for native nodes.
     * @type {string}
     * @memberof NodePort
     */
    portGroupId?: string;
    /**
     * Whether this port can be removed. Only available if &#39;interaction info&#39; is supposed to be included.
     * @type {boolean}
     * @memberof NodePort
     */
    canRemove?: boolean;

}


/**
 *
 * @export
 * @interface NodePortDescription
 */
export interface NodePortDescription extends NodePortTemplate {

    /**
     * The port description.
     * @type {string}
     * @memberof NodePortDescription
     */
    description?: string;
    /**
     * A human-readable name for the port type. May contain HTML markup tags.
     * @type {string}
     * @memberof NodePortDescription
     */
    typeName?: string;

}


/**
 * Properties that have NodePort and NodePortDescription in common. Or, put differently, the properties required to render a node port in the node repository (i.e. without port information specific to a node-instance).
 * @export
 * @interface NodePortTemplate
 */
export interface NodePortTemplate {

    /**
     * A descriptive name for the port. For native nodes, this name is taken from the node description. For components, the port name is taken from the component&#39;s description, if provided by the user.
     * @type {string}
     * @memberof NodePortTemplate
     */
    name?: string;
    /**
     * A unique port type id helping to infer the corresponding &#39;PortType&#39;
     * @type {string}
     * @memberof NodePortTemplate
     */
    typeId: string;
    /**
     * Whether it&#39;s a optional port or not.
     * @type {boolean}
     * @memberof NodePortTemplate
     */
    optional?: boolean;

}


/**
 * Represents the result of a node/component search in the node repository.
 * @export
 * @interface NodeSearchResult
 */
export interface NodeSearchResult {

    /**
     * The found nodes. If a non-empty search query has been given for the search, the nodes are sorted by their &#39;search score&#39; (i.e. how well it &#39;fits&#39; the query). If there is no search query but, e.g., only a list of tags (which is then more a &#39;node filter result&#39;), the nodes are sorted by their pre-defined weight (the weight might be, e.g., the nodes general popularity).
     * @type {Array<NodeTemplate>}
     * @memberof NodeSearchResult
     */
    nodes: Array<NodeTemplate>;
    /**
     * The total number of found nodes (depending on the actual search query). Not all nodes might be included because of used offsets or limits (pagination) used for the search.
     * @type {number}
     * @memberof NodeSearchResult
     */
    totalNumNodes: number;
    /**
     * The union of the tags of all the nodes in the search result (i.e. also including the nodes that might not be explicitly listed as part of this search result instance). The tags are sorted by their frequency of how many nodes nodes (in the search result) carry that particular tag.
     * @type {Array<string>}
     * @memberof NodeSearchResult
     */
    tags: Array<string>;

}


/**
 * Encapsulates properties around a node&#39;s execution state.
 * @export
 * @interface NodeState
 */
export interface NodeState {

    /**
     * Different execution states of a node. It is not given, if the node is inactive.
     * @type {string}
     * @memberof NodeState
     */
    executionState?: NodeState.ExecutionStateEnum;
    /**
     *
     * @type {number}
     * @memberof NodeState
     */
    progress?: number;
    /**
     *
     * @type {string}
     * @memberof NodeState
     */
    progressMessage?: string;
    /**
     *
     * @type {string}
     * @memberof NodeState
     */
    error?: string;
    /**
     *
     * @type {string}
     * @memberof NodeState
     */
    warning?: string;
    /**
     *
     * @type {string}
     * @memberof NodeState
     */
    issue?: string;
    /**
     *
     * @type {Array<string>}
     * @memberof NodeState
     */
    resolutions?: Array<string>;

}


/**
 * @export
 * @namespace NodeState
 */
export namespace NodeState {
    /**
     * @export
     * @enum {string}
     */
    export enum ExecutionStateEnum {
        IDLE = 'IDLE',
        CONFIGURED = 'CONFIGURED',
        EXECUTED = 'EXECUTED',
        EXECUTING = 'EXECUTING',
        QUEUED = 'QUEUED',
        HALTED = 'HALTED'
    }
}
/**
 * Contains all the &#39;static&#39; properties of a node or component required to draw the node/component figure.
 * @export
 * @interface NodeTemplate
 */
export interface NodeTemplate extends NativeNodeInvariants {

    /**
     * A unique identifier for this template.
     * @type {string}
     * @memberof NodeTemplate
     */
    id: string;
    /**
     * Whether this node templates represents a component.
     * @type {boolean}
     * @memberof NodeTemplate
     */
    component?: boolean;
    /**
     * The node&#39;s input ports.
     * @type {Array<NodePortTemplate>}
     * @memberof NodeTemplate
     */
    inPorts?: Array<NodePortTemplate>;
    /**
     * The node&#39;s output ports.
     * @type {Array<NodePortTemplate>}
     * @memberof NodeTemplate
     */
    outPorts?: Array<NodePortTemplate>;

}


/**
 * @export
 * @namespace NodeTemplate
 */
export namespace NodeTemplate {
}
/**
 *
 * @export
 * @interface NodeViewDescription
 */
export interface NodeViewDescription {

    /**
     * The view name.
     * @type {string}
     * @memberof NodeViewDescription
     */
    name: string;
    /**
     * The actual description of the view. May contain HTML markup tags.
     * @type {string}
     * @memberof NodeViewDescription
     */
    description?: string;

}


/**
 * A command that is based on a number of selected workflow parts (nodes or workflow annotations)
 * @export
 * @interface PartBasedCommand
 */
export interface PartBasedCommand extends WorkflowCommand {

    /**
     * The ids of the nodes referenced.
     * @type {Array<string>}
     * @memberof PartBasedCommand
     */
    nodeIds: Array<string>;
    /**
     * The ids of the workflow annotations referenced.
     * @type {Array<string>}
     * @memberof PartBasedCommand
     */
    annotationIds: Array<string>;

}


/**
 * @export
 * @namespace PartBasedCommand
 */
export namespace PartBasedCommand {
}
/**
 * Paste workflow parts in workflow definition format into the active workflow.
 * @export
 * @interface PasteCommand
 */
export interface PasteCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof PasteCommand
     */
    content: string;
    /**
     *
     * @type {XY}
     * @memberof PasteCommand
     */
    position?: XY;

}


/**
 * @export
 * @namespace PasteCommand
 */
export namespace PasteCommand {
}
/**
 *
 * @export
 * @interface PasteResult
 */
export interface PasteResult extends CommandResult {

    /**
     * The ids of the nodes that were pasted.
     * @type {Array<string>}
     * @memberof PasteResult
     */
    nodeIds?: Array<string>;
    /**
     * The ids of the workflow annotations that were pasted.
     * @type {Array<string>}
     * @memberof PasteResult
     */
    annotationIds?: Array<string>;

}


/**
 * @export
 * @namespace PasteResult
 */
export namespace PasteResult {
}
/**
 * A list of patch operations.
 * @export
 * @interface Patch
 */
export interface Patch {

    /**
     * The operations that make up this patch.
     * @type {Array<PatchOp>}
     * @memberof Patch
     */
    ops?: Array<PatchOp>;

}


/**
 * A JSONPatch document as defined by RFC 6902
 * @export
 * @interface PatchOp
 */
export interface PatchOp {

    /**
     * The operation to be performed
     * @type {string}
     * @memberof PatchOp
     */
    op: PatchOp.OpEnum;
    /**
     * A JSON-Pointer
     * @type {string}
     * @memberof PatchOp
     */
    path: string;
    /**
     * The value to be used within the operations.
     * @type {any}
     * @memberof PatchOp
     */
    value?: any;
    /**
     * A string containing a JSON Pointer value.
     * @type {string}
     * @memberof PatchOp
     */
    from?: string;

}


/**
 * @export
 * @namespace PatchOp
 */
export namespace PatchOp {
    /**
     * @export
     * @enum {string}
     */
    export enum OpEnum {
        Add = 'add',
        Remove = 'remove',
        Replace = 'replace',
        Move = 'move',
        Copy = 'copy',
        Test = 'test'
    }
}
/**
 * Abstract schema for commands acting on ports (port operations).
 * @export
 * @interface PortCommand
 */
export interface PortCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof PortCommand
     */
    side: PortCommand.SideEnum;
    /**
     * The identifier (name) of the modified port group. Required for native nodes, absent for container nodes.
     * @type {string}
     * @memberof PortCommand
     */
    portGroup?: string;
    /**
     *
     * @type {string}
     * @memberof PortCommand
     */
    nodeId: string;

}


/**
 * @export
 * @namespace PortCommand
 */
export namespace PortCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum SideEnum {
        Input = 'input',
        Output = 'output'
    }
}
/**
 * Within natives nodes, ports belong to port groups.  Port groups in turn are used to describe whether and how many additional input or output ports of a certain type can be added to a node depending on the current state of the node.
 * @export
 * @interface PortGroup
 */
export interface PortGroup {

    /**
     * Which input ports (identified by index position) belong to the port group. Either this or the  &#39;outputRange&#39; is required for a port group.
     * @type {Array<number>}
     * @memberof PortGroup
     */
    inputRange?: Array<number>;
    /**
     * Which output ports (identified by index position) belong to the port group. Either this or the  &#39;inputRange&#39; is required for a port group.
     * @type {Array<number>}
     * @memberof PortGroup
     */
    outputRange?: Array<number>;
    /**
     * Whether an additional input port can be added. Either this or &#x60;canAddOutPort&#x60; is required.
     * @type {boolean}
     * @memberof PortGroup
     */
    canAddInPort?: boolean;
    /**
     * Whether an additional input port can be added. Either this or &#x60;canAddInPort&#x60; is required.
     * @type {boolean}
     * @memberof PortGroup
     */
    canAddOutPort?: boolean;
    /**
     * A list of port type identifiers supported within this port group. If this property is not set, any port type is supported.
     * @type {Array<string>}
     * @memberof PortGroup
     */
    supportedPortTypeIds?: Array<string>;

}


/**
 * Describes the type of a port.
 * @export
 * @interface PortType
 */
export interface PortType {

    /**
     * A human-readable name for the port type.
     * @type {string}
     * @memberof PortType
     */
    name: string;
    /**
     *
     * @type {string}
     * @memberof PortType
     */
    kind: PortType.KindEnum;
    /**
     * The color of the port. Only given if &#39;kind&#39; is &#39;other&#39;.
     * @type {string}
     * @memberof PortType
     */
    color?: string;
    /**
     * List of port type ids this port type is compatible with (i.e. can be connected with). Not present if it&#39;s only compatible with itself. Only present if interaction info is supposed to be included. Only given if &#39;kind&#39; is &#39;other&#39;. Will never contain the &#39;generic&#39; port type since it&#39;s compatible with every port.
     * @type {Array<string>}
     * @memberof PortType
     */
    compatibleTypes?: Array<string>;
    /**
     * Whether this port type is hidden, e.g., from being actively selected by the user (e.g. for a component input/output). Will need to be shipped nevertheless to be able to just render hidden ports. This property is only present if true.
     * @type {boolean}
     * @memberof PortType
     */
    hidden?: boolean;
    /**
     *
     * @type {PortViews}
     * @memberof PortType
     */
    views?: PortViews;

}


/**
 * @export
 * @namespace PortType
 */
export namespace PortType {
    /**
     * @export
     * @enum {string}
     */
    export enum KindEnum {
        Table = 'table',
        FlowVariable = 'flowVariable',
        Generic = 'generic',
        Other = 'other'
    }
}
/**
 * Metadata about a port view.
 * @export
 * @interface PortViewDescriptor
 */
export interface PortViewDescriptor {

    /**
     * The display name of the port view.
     * @type {string}
     * @memberof PortViewDescriptor
     */
    label: string;
    /**
     * Whether the view is a port object spec view. Assumed to be false if omitted.
     * @type {boolean}
     * @memberof PortViewDescriptor
     */
    isSpecView?: boolean;

}


/**
 * Mapping of node execution state to list of view IDs to be displayed.
 * @export
 * @interface PortViewDescriptorMapping
 */
export interface PortViewDescriptorMapping {

    /**
     * IDs of views to be displayed when the node is in &#x60;configured&#x60; state.
     * @type {Array<number>}
     * @memberof PortViewDescriptorMapping
     */
    configured?: Array<number>;
    /**
     * IDs of views to be available when the node is in &#x60;executed&#x60; state.
     * @type {Array<number>}
     * @memberof PortViewDescriptorMapping
     */
    executed?: Array<number>;

}


/**
 * Provides information about views available for a port type.
 * @export
 * @interface PortViews
 */
export interface PortViews {

    /**
     *
     * @type {Array<PortViewDescriptor>}
     * @memberof PortViews
     */
    descriptors: Array<PortViewDescriptor>;
    /**
     *
     * @type {PortViewDescriptorMapping}
     * @memberof PortViews
     */
    descriptorMapping: PortViewDescriptorMapping;

}


/**
 * Event for changes to the dirtyState of a project/workflow.
 * @export
 * @interface ProjectDirtyStateEvent
 */
export interface ProjectDirtyStateEvent extends Event {

    /**
     * Mapping from project id to isDirty flag of workflow.
     * @type {{ [key: string]: boolean; }}
     * @memberof ProjectDirtyStateEvent
     */
    dirtyProjectsMap?: { [key: string]: boolean; };
    /**
     * Whether to replace the entire map or just to updated the set values.
     * @type {boolean}
     * @memberof ProjectDirtyStateEvent
     */
    shouldReplace?: boolean;

}


/**
 * The metadata for a workflow project, i.e. for the root-workflow.
 * @export
 * @interface ProjectMetadata
 */
export interface ProjectMetadata {

    /**
     * Single-line description of the workflow
     * @type {string}
     * @memberof ProjectMetadata
     */
    title?: string;
    /**
     * A detailed description of the project workflow.
     * @type {string}
     * @memberof ProjectMetadata
     */
    description?: string;
    /**
     * A collection of tags the user chose to describe the workflow
     * @type {Array<string>}
     * @memberof ProjectMetadata
     */
    tags?: Array<string>;
    /**
     * A collection of URLs attached to the workflow
     * @type {Array<Link>}
     * @memberof ProjectMetadata
     */
    links?: Array<Link>;
    /**
     * The date and time of the last change made to this workflow
     * @type {Date}
     * @memberof ProjectMetadata
     */
    lastEdit?: Date;

}


/**
 * Remove a port from a node
 * @export
 * @interface RemovePortCommand
 */
export interface RemovePortCommand extends PortCommand {

    /**
     * The index of the port to be removed (out of all ports in this side). Only used for container nodes.
     * @type {number}
     * @memberof RemovePortCommand
     */
    portIndex?: number;

}


/**
 * @export
 * @namespace RemovePortCommand
 */
export namespace RemovePortCommand {
}
/**
 * Alters the z-order of a list of workflow annotations.
 * @export
 * @interface ReorderWorkflowAnnotationsCommand
 */
export interface ReorderWorkflowAnnotationsCommand extends WorkflowCommand {

    /**
     * The IDs of the annotations to reorder
     * @type {Array<string>}
     * @memberof ReorderWorkflowAnnotationsCommand
     */
    annotationIds: Array<string>;
    /**
     * The specific reorder action to perform, can be one of four: &#39;bring_forward&#39; brings the selected  annotation forward by one relative-to-other-annotations position; &#39;bring_to_front&#39; moves the  selected annotation in front of all other annotations; &#39;send_backward&#39; sends the selected  annotation backward by one relative-to-other-annotations position; &#39;send_to_back&#39; sends the  selected annotation back of all other annotations.
     * @type {string}
     * @memberof ReorderWorkflowAnnotationsCommand
     */
    action: ReorderWorkflowAnnotationsCommand.ActionEnum;

}


/**
 * @export
 * @namespace ReorderWorkflowAnnotationsCommand
 */
export namespace ReorderWorkflowAnnotationsCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum ActionEnum {
        BringForward = 'bring_forward',
        BringToFront = 'bring_to_front',
        SendBackward = 'send_backward',
        SendToBack = 'send_to_back'
    }
}
/**
 * Replaces an existing node with a new node provided by either an existing node or generated by the given node factory.
 * @export
 * @interface ReplaceNodeCommand
 */
export interface ReplaceNodeCommand extends WorkflowCommand {

    /**
     * The node that needs to be replaced
     * @type {string}
     * @memberof ReplaceNodeCommand
     */
    targetNodeId: string;
    /**
     *
     * @type {NodeFactoryKey}
     * @memberof ReplaceNodeCommand
     */
    nodeFactory?: NodeFactoryKey;
    /**
     * An existing node id to be used for replacement
     * @type {string}
     * @memberof ReplaceNodeCommand
     */
    replacementNodeId?: string;

}


/**
 * @export
 * @namespace ReplaceNodeCommand
 */
export namespace ReplaceNodeCommand {
}
/**
 * Event type to register for SelectionEvents.
 * @export
 * @interface SelectionEventType
 */
export interface SelectionEventType extends EventType {

    /**
     * The workflow project id to get the selection-events for.
     * @type {string}
     * @memberof SelectionEventType
     */
    projectId: string;
    /**
     * The top-level (root) or sub-workflow to get the selection-events for.
     * @type {string}
     * @memberof SelectionEventType
     */
    workflowId: string;
    /**
     *
     * @type {string}
     * @memberof SelectionEventType
     */
    nodeId: string;

}


/**
 * Represents a single space (local workspace, hub space, ...).
 * @export
 * @interface Space
 */
export interface Space {

    /**
     * Identifier of this space, unique within a space provider.
     * @type {string}
     * @memberof Space
     */
    id: string;
    /**
     * Human readable space name.
     * @type {string}
     * @memberof Space
     */
    name: string;
    /**
     * The user that owns this space.
     * @type {string}
     * @memberof Space
     */
    owner: string;
    /**
     * A space description.
     * @type {string}
     * @memberof Space
     */
    description?: string;
    /**
     * Whether this space is private or public (available to everyone).
     * @type {boolean}
     * @memberof Space
     */
    _private?: boolean;

}


/**
 * A single item in a space (local workspace or hub space).
 * @export
 * @interface SpaceItem
 */
export interface SpaceItem {

    /**
     * Unique identifier of a space item
     * @type {string}
     * @memberof SpaceItem
     */
    id: string;
    /**
     * Name to be shown to the user in the UI
     * @type {string}
     * @memberof SpaceItem
     */
    name: string;
    /**
     * What kind of space item it is
     * @type {string}
     * @memberof SpaceItem
     */
    type: SpaceItem.TypeEnum;

}


/**
 * @export
 * @namespace SpaceItem
 */
export namespace SpaceItem {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        WorkflowGroup = 'WorkflowGroup',
        Workflow = 'Workflow',
        Component = 'Component',
        WorkflowTemplate = 'WorkflowTemplate',
        Data = 'Data'
    }
}
/**
 * Describes from where a workflow project originates.
 * @export
 * @interface SpaceItemReference
 */
export interface SpaceItemReference {

    /**
     *
     * @type {string}
     * @memberof SpaceItemReference
     */
    providerId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemReference
     */
    spaceId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemReference
     */
    itemId: string;
    /**
     * List of ids of the ancestors. The element at the first position in the list is the direct parent of this item, the second the parent of the parent etc. An empty list if the item is at root level.
     * @type {Array<string>}
     * @memberof SpaceItemReference
     */
    ancestorItemIds?: Array<string>;

}


/**
 * Holds the id and name of a space path segment.
 * @export
 * @interface SpacePathSegment
 */
export interface SpacePathSegment {

    /**
     * Id of the path segment.
     * @type {string}
     * @memberof SpacePathSegment
     */
    id: string;
    /**
     * Name of the path segment.
     * @type {string}
     * @memberof SpacePathSegment
     */
    name: string;

}


/**
 * Provides one or more spaces.
 * @export
 * @interface SpaceProvider
 */
export interface SpaceProvider {

    /**
     *
     * @type {Array<Space>}
     * @memberof SpaceProvider
     */
    spaces: Array<Space>;

}


/**
 * Defines the style of a range (e.g. within a workflow annotation).
 * @export
 * @interface StyleRange
 */
export interface StyleRange {

    /**
     * Style range start.
     * @type {number}
     * @memberof StyleRange
     */
    start: number;
    /**
     * Style range length.
     * @type {number}
     * @memberof StyleRange
     */
    length: number;
    /**
     *
     * @type {boolean}
     * @memberof StyleRange
     */
    bold?: boolean;
    /**
     *
     * @type {boolean}
     * @memberof StyleRange
     */
    italic?: boolean;
    /**
     * Style range font size in pt.
     * @type {number}
     * @memberof StyleRange
     */
    fontSize: number;
    /**
     * Style range foreground color.
     * @type {string}
     * @memberof StyleRange
     */
    color?: string;

}


/**
 * The link of a metanode or component.
 * @export
 * @interface TemplateLink
 */
export interface TemplateLink {

    /**
     * A URL, if the metanode/component is linked to.
     * @type {string}
     * @memberof TemplateLink
     */
    url?: string;
    /**
     * The status of the link of this metanode/component (UpToDate, HasUpdate, Error)
     * @type {string}
     * @memberof TemplateLink
     */
    updateStatus?: TemplateLink.UpdateStatusEnum;

}


/**
 * @export
 * @namespace TemplateLink
 */
export namespace TemplateLink {
    /**
     * @export
     * @enum {string}
     */
    export enum UpdateStatusEnum {
        UPTODATE = 'UP_TO_DATE',
        HASUPDATE = 'HAS_UPDATE',
        ERROR = 'ERROR'
    }
}
/**
 * Changes the size (width and height) and position (x, y) of a workflow annotation.
 * @export
 * @interface TransformWorkflowAnnotationCommand
 */
export interface TransformWorkflowAnnotationCommand extends WorkflowAnnotationCommand {

    /**
     *
     * @type {Bounds}
     * @memberof TransformWorkflowAnnotationCommand
     */
    bounds: Bounds;

}


/**
 * @export
 * @namespace TransformWorkflowAnnotationCommand
 */
export namespace TransformWorkflowAnnotationCommand {
}
/**
 * Moves workflow nodes and workflow annotations to a defined position.
 * @export
 * @interface TranslateCommand
 */
export interface TranslateCommand extends PartBasedCommand {

    /**
     *
     * @type {XY}
     * @memberof TranslateCommand
     */
    translation: XY;

}


/**
 * @export
 * @namespace TranslateCommand
 */
export namespace TranslateCommand {
}
/**
 * Event for changes to the update state indicating updates are available.
 * @export
 * @interface UpdateAvailableEvent
 */
export interface UpdateAvailableEvent extends Event {

    /**
     * List of new major releases.
     * @type {Array<UpdateInfo>}
     * @memberof UpdateAvailableEvent
     */
    newReleases?: Array<UpdateInfo>;
    /**
     * List of new bugfix releases.
     * @type {Array<string>}
     * @memberof UpdateAvailableEvent
     */
    bugfixes?: Array<string>;

}


/**
 * Event type to register for &#x60;UpdateAvailableEvent&#x60;s
 * @export
 * @interface UpdateAvailableEventType
 */
export interface UpdateAvailableEventType extends EventType {


}


/**
 * Updates the name of a component or metanode
 * @export
 * @interface UpdateComponentOrMetanodeNameCommand
 */
export interface UpdateComponentOrMetanodeNameCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof UpdateComponentOrMetanodeNameCommand
     */
    name: string;
    /**
     *
     * @type {string}
     * @memberof UpdateComponentOrMetanodeNameCommand
     */
    nodeId: string;

}


/**
 * @export
 * @namespace UpdateComponentOrMetanodeNameCommand
 */
export namespace UpdateComponentOrMetanodeNameCommand {
}
/**
 * Information about an available update, derived from &#x60;UpdateInfo&#x60; core class.
 * @export
 * @interface UpdateInfo
 */
export interface UpdateInfo {

    /**
     * The name for the update, e.g. \&quot;KNIME Analytics Platform 5.0\&quot;.
     * @type {string}
     * @memberof UpdateInfo
     */
    name: string;
    /**
     * Short name for the update, e.g. \&quot;5.0\&quot;
     * @type {string}
     * @memberof UpdateInfo
     */
    shortName: string;
    /**
     * Whether a direct update is possible or not.
     * @type {boolean}
     * @memberof UpdateInfo
     */
    isUpdatePossible: boolean;

}


/**
 * Updates the label of a native node, component or metanode.
 * @export
 * @interface UpdateNodeLabelCommand
 */
export interface UpdateNodeLabelCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof UpdateNodeLabelCommand
     */
    label: string;
    /**
     *
     * @type {string}
     * @memberof UpdateNodeLabelCommand
     */
    nodeId: string;

}


/**
 * @export
 * @namespace UpdateNodeLabelCommand
 */
export namespace UpdateNodeLabelCommand {
}
/**
 * Updates the text and/or the border color of a workflow annotation. Either one can be &#39;null&#39;,  but never both of them.
 * @export
 * @interface UpdateWorkflowAnnotationCommand
 */
export interface UpdateWorkflowAnnotationCommand extends WorkflowAnnotationCommand {

    /**
     * The new formatted text to update the annotation with
     * @type {string}
     * @memberof UpdateWorkflowAnnotationCommand
     */
    text?: string;
    /**
     * The new border color as a hex string (rgb)
     * @type {string}
     * @memberof UpdateWorkflowAnnotationCommand
     */
    borderColor?: string;

}


/**
 * @export
 * @namespace UpdateWorkflowAnnotationCommand
 */
export namespace UpdateWorkflowAnnotationCommand {
}
/**
 * The structure of a workflow.
 * @export
 * @interface Workflow
 */
export interface Workflow {

    /**
     *
     * @type {WorkflowInfo}
     * @memberof Workflow
     */
    info: WorkflowInfo;
    /**
     * The node map.
     * @type {{ [key: string]: any; }}
     * @memberof Workflow
     */
    nodes: { [key: string]: any; };
    /**
     * A map from ids to node templates.
     * @type {{ [key: string]: NativeNodeInvariants; }}
     * @memberof Workflow
     */
    nodeTemplates: { [key: string]: NativeNodeInvariants; };
    /**
     * The list of connections.
     * @type {{ [key: string]: Connection; }}
     * @memberof Workflow
     */
    connections: { [key: string]: Connection; };
    /**
     * List of all workflow annotations. The list order determines the z-order. Annotations at the end of the list are rendered on top.
     * @type {Array<WorkflowAnnotation>}
     * @memberof Workflow
     */
    workflowAnnotations: Array<WorkflowAnnotation>;
    /**
     * The workflow parent hierarchy. The first in the list represents the root workflow, the last the direct parent. Not available if this workflow is the root already.
     * @type {Array<WorkflowInfo>}
     * @memberof Workflow
     */
    parents?: Array<WorkflowInfo>;
    /**
     *
     * @type {MetaPorts}
     * @memberof Workflow
     */
    metaInPorts?: MetaPorts;
    /**
     *
     * @type {MetaPorts}
     * @memberof Workflow
     */
    metaOutPorts?: MetaPorts;
    /**
     *
     * @type {AllowedWorkflowActions}
     * @memberof Workflow
     */
    allowedActions?: AllowedWorkflowActions;
    /**
     *
     * @type {ComponentNodeDescription}
     * @memberof Workflow
     */
    componentMetadata?: ComponentNodeDescription;
    /**
     *
     * @type {ProjectMetadata}
     * @memberof Workflow
     */
    projectMetadata?: ProjectMetadata;
    /**
     * Flag indicating whether the workflow is in a dirty state, i.e. contains unsaved changes.
     * @type {boolean}
     * @memberof Workflow
     */
    dirty: boolean;

}


/**
 * A workflow annotation.
 * @export
 * @interface WorkflowAnnotation
 */
export interface WorkflowAnnotation extends Annotation {

    /**
     *
     * @type {Bounds}
     * @memberof WorkflowAnnotation
     */
    bounds: Bounds;
    /**
     * A unique identifier for the workflow annotation.
     * @type {string}
     * @memberof WorkflowAnnotation
     */
    id: string;
    /**
     *
     * @type {number}
     * @memberof WorkflowAnnotation
     */
    borderWidth: number;
    /**
     * A hex color string (rgb).
     * @type {string}
     * @memberof WorkflowAnnotation
     */
    borderColor: string;

}


/**
 * @export
 * @namespace WorkflowAnnotation
 */
export namespace WorkflowAnnotation {
}
/**
 * Abstract schema for commands manipulating individual workflow annotations
 * @export
 * @interface WorkflowAnnotationCommand
 */
export interface WorkflowAnnotationCommand extends WorkflowCommand {

    /**
     * The ID of the annotation to manipulate
     * @type {string}
     * @memberof WorkflowAnnotationCommand
     */
    annotationId: string;

}


/**
 * @export
 * @namespace WorkflowAnnotationCommand
 */
export namespace WorkflowAnnotationCommand {
}
/**
 * Event for all kind of workflow changes.
 * @export
 * @interface WorkflowChangedEvent
 */
export interface WorkflowChangedEvent extends Event {

    /**
     * A unique identifier for the version of the object this patch is applied to. Should only be missing if the patch is empty!
     * @type {string}
     * @memberof WorkflowChangedEvent
     */
    snapshotId: string;
    /**
     *
     * @type {Patch}
     * @memberof WorkflowChangedEvent
     */
    patch: Patch;

}


/**
 * Event type to register for &#39;WorkflowChangedEvent&#39;s.
 * @export
 * @interface WorkflowChangedEventType
 */
export interface WorkflowChangedEventType extends EventType {

    /**
     * The workflow project id to get the change-events for.
     * @type {string}
     * @memberof WorkflowChangedEventType
     */
    projectId: string;
    /**
     * The top-level (root) or sub-workflow to get the change-events for.
     * @type {string}
     * @memberof WorkflowChangedEventType
     */
    workflowId: string;
    /**
     * The initial snapshot id of the workflow version known to the client/ui.
     * @type {string}
     * @memberof WorkflowChangedEventType
     */
    snapshotId: string;

}


/**
 * A command that is executed to change a workflow.
 * @export
 * @interface WorkflowCommand
 */
export interface WorkflowCommand {

    /**
     * The kind of command which directly maps to a specific &#39;implementation&#39;.
     * @type {string}
     * @memberof WorkflowCommand
     */
    kind: WorkflowCommand.KindEnum;

}


/**
 * @export
 * @namespace WorkflowCommand
 */
export namespace WorkflowCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum KindEnum {
        Translate = 'translate',
        Delete = 'delete',
        Connect = 'connect',
        AddNode = 'add_node',
        ReplaceNode = 'replace_node',
        InsertNode = 'insert_node',
        UpdateComponentOrMetanodeName = 'update_component_or_metanode_name',
        UpdateNodeLabel = 'update_node_label',
        Collapse = 'collapse',
        Expand = 'expand',
        AddPort = 'add_port',
        RemovePort = 'remove_port',
        Copy = 'copy',
        Cut = 'cut',
        Paste = 'paste',
        TransformWorkflowAnnotation = 'transform_workflow_annotation',
        UpdateWorkflowAnnotation = 'update_workflow_annotation',
        ReorderWorkflowAnnotations = 'reorder_workflow_annotations',
        AddWorkflowAnnotation = 'add_workflow_annotation'
    }
}
/**
 * A list of items in a workflow group and more.
 * @export
 * @interface WorkflowGroupContent
 */
export interface WorkflowGroupContent {

    /**
     * The path (id and name per path-segment) of all workflow groups along the path-hierarchy with the last entry  in the list being the id of the direct parent of these space items. Empty list if at root-level.
     * @type {Array<SpacePathSegment>}
     * @memberof WorkflowGroupContent
     */
    path: Array<SpacePathSegment>;
    /**
     * List of space items in the order of appearance
     * @type {Array<SpaceItem>}
     * @memberof WorkflowGroupContent
     */
    items: Array<SpaceItem>;

}


/**
 *
 * @export
 * @interface WorkflowInfo
 */
export interface WorkflowInfo {

    /**
     *
     * @type {string}
     * @memberof WorkflowInfo
     */
    name: string;
    /**
     * The id of the workflow, be it a metanode, a component or a project workflow.
     * @type {string}
     * @memberof WorkflowInfo
     */
    containerId: string;
    /**
     * Whether the workflow is contained in a component, metanode or is the project workflow (i.e. top-level) itself.
     * @type {string}
     * @memberof WorkflowInfo
     */
    containerType: WorkflowInfo.ContainerTypeEnum;
    /**
     * True if the component or metanode is linked. If not, this property is absent.
     * @type {boolean}
     * @memberof WorkflowInfo
     */
    linked?: boolean;
    /**
     * True if the workflow is a temporary copy from a Hub. If not, this property is absent.
     * @type {boolean}
     * @memberof WorkflowInfo
     */
    onHub?: boolean;
    /**
     *
     * @type {JobManager}
     * @memberof WorkflowInfo
     */
    jobManager?: JobManager;

}


/**
 * @export
 * @namespace WorkflowInfo
 */
export namespace WorkflowInfo {
    /**
     * @export
     * @enum {string}
     */
    export enum ContainerTypeEnum {
        Component = 'component',
        Metanode = 'metanode',
        Project = 'project'
    }
}
/**
 * Represents an entire workflow project.
 * @export
 * @interface WorkflowProject
 */
export interface WorkflowProject {

    /**
     *
     * @type {string}
     * @memberof WorkflowProject
     */
    projectId: string;
    /**
     *
     * @type {SpaceItemReference}
     * @memberof WorkflowProject
     */
    origin: SpaceItemReference;
    /**
     *
     * @type {string}
     * @memberof WorkflowProject
     */
    name: string;
    /**
     * If this workflow project is active, it provides the node id of the active workflow (e.g. the root workflow or a sub-workflow (component/metanode)).
     * @type {string}
     * @memberof WorkflowProject
     */
    activeWorkflowId?: string;

}


/**
 * A workflow with an additional snapshot id.
 * @export
 * @interface WorkflowSnapshot
 */
export interface WorkflowSnapshot {

    /**
     *
     * @type {Workflow}
     * @memberof WorkflowSnapshot
     */
    workflow: Workflow;
    /**
     * A unique identifier for the snapshot.
     * @type {string}
     * @memberof WorkflowSnapshot
     */
    snapshotId: string;

}


/**
 *
 * @export
 * @interface XY
 */
export interface XY {

    /**
     *
     * @type {number}
     * @memberof XY
     */
    x: number;
    /**
     *
     * @type {number}
     * @memberof XY
     */
    y: number;

}



/**
 * application - functional programming interface
 * @export
 */
const application = function(rpcClient: RPCClient) {
    return {
        /**
         * Provides information on the global application state, such as opened workflows etc.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getState(
        	params: {  }
        ): Promise<AppState> {
           const defaultParams = { 
           }

           return rpcClient.call('ApplicationService.getState', { ...defaultParams, ...params });
        },
    }
};

/**
 * event - functional programming interface
 * @export
 */
const event = function(rpcClient: RPCClient) {
    return {
        /**
         * Adds a new event listener for a certain type of event.
         * @param {EventType} [eventType] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        addEventListener(
        	params: { eventType?: EventType  }
        ): Promise<Response> {
           const defaultParams = { 
                eventType: null,
           }

           return rpcClient.call('EventService.addEventListener', { ...defaultParams, ...params });
        },
        /**
         * Unregisters event listeners.
         * @param {EventType} [eventType] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        removeEventListener(
        	params: { eventType?: EventType  }
        ): Promise<Response> {
           const defaultParams = { 
                eventType: null,
           }

           return rpcClient.call('EventService.removeEventListener', { ...defaultParams, ...params });
        },
    }
};

/**
 * node - functional programming interface
 * @export
 */
const node = function(rpcClient: RPCClient) {
    return {
        /**
         * Calls a data service of a specific type for a specific node.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'dialog' | 'view'} extensionType The node ui-extension-type, i.e. dialog or view.
         * @param {'initial_data' | 'data' | 'apply_data'} serviceType 
         * @param {string} [dataServiceRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        callNodeDataService(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  extensionType: 'dialog' | 'view',  serviceType: 'initial_data' | 'data' | 'apply_data',  dataServiceRequest?: string  }
        ): Promise<string> {
           const defaultParams = { 
                dataServiceRequest: null,
           }

           return rpcClient.call('NodeService.callNodeDataService', { ...defaultParams, ...params });
        },
        /**
         * Changes state of a loop. The provided node-id must reference a loop-end node.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'pause' | 'resume' | 'step'} [action] The action (pause, resume, step) to be performed in order to change the loop state.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        changeLoopState(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  action?: 'pause' | 'resume' | 'step'  }
        ): Promise<Response> {
           const defaultParams = { 
                action: null,
           }

           return rpcClient.call('NodeService.changeLoopState', { ...defaultParams, ...params });
        },
        /**
         * Changes the node state of multiple nodes represented by a list of node-ids.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {Array<string>} [nodeIds] The list of node ids of the nodes to be changed. All ids must reference nodes on the same workflow level. If no node ids are given the state of the parent workflow (i.e. the one referenced by workflow-id) is changed which is equivalent to change the states of all contained nodes.
         * @param {'reset' | 'cancel' | 'execute'} [action] The action (reset, cancel, execute) to be performed in order to change the node&#39;s state.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        changeNodeStates(
        	params: { projectId: string,  workflowId: string,  nodeIds?: Array<string>,  action?: 'reset' | 'cancel' | 'execute'  }
        ): Promise<Response> {
           const defaultParams = { 
                nodeIds: null,
                action: null,
           }

           return rpcClient.call('NodeService.changeNodeStates', { ...defaultParams, ...params });
        },
        /**
         * Obtain the description of a given node.
         * @param {NodeFactoryKey} nodeFactoryKey The key identifying the node.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodeDescription(
        	params: { nodeFactoryKey: NodeFactoryKey  }
        ): Promise<NativeNodeDescription> {
           const defaultParams = { 
           }

           return rpcClient.call('NodeService.getNodeDescription', { ...defaultParams, ...params });
        },
        /**
         * Returns all the information on a node dialog required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodeDialog(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<any> {
           const defaultParams = { 
           }

           return rpcClient.call('NodeService.getNodeDialog', { ...defaultParams, ...params });
        },
        /**
         * Returns all the information on a node view required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodeView(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<any> {
           const defaultParams = { 
           }

           return rpcClient.call('NodeService.getNodeView', { ...defaultParams, ...params });
        },
        /**
         * Updates the data point selection (aka hiliting) for a single node as specified.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'add' | 'remove' | 'replace'} mode Whether to add, remove or replace the data point selection.
         * @param {Array<string>} [selections] A list of strings that are translated to the row keys affected by the data point selection modification.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDataPointSelection(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  mode: 'add' | 'remove' | 'replace',  selections?: Array<string>  }
        ): Promise<Response> {
           const defaultParams = { 
                selections: null,
           }

           return rpcClient.call('NodeService.updateDataPointSelection', { ...defaultParams, ...params });
        },
    }
};

/**
 * noderepository - functional programming interface
 * @export
 */
const noderepository = function(rpcClient: RPCClient) {
    return {
        /**
         * Given a node and a port, it recommends a certain number of compatible successor nodes the user might want to add next to its workflow. If queried with no node and no port, it recommends the  most relevant source nodes, that naturally have no predecessor.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} [nodeId] The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} [portIdx] The port index to be used.
         * @param {number} [nodesLimit] The maximum number of node recommendations to return.
         * @param {boolean} [fullTemplateInfo] If true, the result will contain the full information for nodes/components (such as icon and port information). Otherwise only minimal information (such as name) will be included and the others omitted.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodeRecommendations(
        	params: { projectId: string,  workflowId: string,  nodeId?: string,  portIdx?: number,  nodesLimit?: number,  fullTemplateInfo?: boolean  }
        ): Promise<Array<NodeTemplate>> {
           const defaultParams = { 
                nodeId: null,
                portIdx: null,
                nodesLimit: null,
                fullTemplateInfo: null,
           }

           return rpcClient.call('NodeRepositoryService.getNodeRecommendations', { ...defaultParams, ...params });
        },
        /**
         * Compiles a list of node templates (with complete information, i.e. including icons, etc.). It doesn't actually change any state or create a new resource (despite the 'post').
         * @param {Array<string>} [nodeTemplateIds] A list of template ids to request the node templates for.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodeTemplates(
        	params: { nodeTemplateIds?: Array<string>  }
        ): Promise<{ [key: string]: NodeTemplate; }> {
           const defaultParams = { 
                nodeTemplateIds: null,
           }

           return rpcClient.call('NodeRepositoryService.getNodeTemplates', { ...defaultParams, ...params });
        },
        /**
         * Returns a pre-defined set of groups (defined by tags) and nodes per group (the most frequently used  ones in that group).
         * @param {number} [numNodesPerTag] The number of nodes per tag/group to be returned.
         * @param {number} [tagsOffset] The number of tags to be skipped (for pagination).
         * @param {number} [tagsLimit] The maximum number of tags to be returned (mainly for pagination).
         * @param {boolean} [fullTemplateInfo] If true, the result will contain the full information for nodes/components (such as icon and port information). Otherwise only minimal information (such as name) will be included and the others omitted.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getNodesGroupedByTags(
        	params: { numNodesPerTag?: number,  tagsOffset?: number,  tagsLimit?: number,  fullTemplateInfo?: boolean  }
        ): Promise<NodeGroups> {
           const defaultParams = { 
                numNodesPerTag: null,
                tagsOffset: null,
                tagsLimit: null,
                fullTemplateInfo: null,
           }

           return rpcClient.call('NodeRepositoryService.getNodesGroupedByTags', { ...defaultParams, ...params });
        },
        /**
         * Searches for nodes (and components) in the node repository.
         * @param {string} [q] The term to search for.
         * @param {Array<string>} [tags] A list of tags. Only nodes/components having any/all tags will be included in the search result.
         * @param {boolean} [allTagsMatch] If true, only the nodes/components that have all of the given tags are included in the search result. Otherwise nodes/components that have at least one of the given tags are included.
         * @param {number} [offset] Number of nodes/components to be skipped in the search result (for pagination).
         * @param {number} [limit] The maximum number of nodes/components in the search result (mainly for pagination).
         * @param {boolean} [fullTemplateInfo] If true, the result will contain the full information for nodes/components (such as icon and port information). Otherwise only minimal information (such as name) will be included and the others omitted.
         * @param {'IN_COLLECTION' | 'NOT_IN_COLLECTION' | 'ALL'} [nodesPartition] If &#39;IN_COLLECTION&#39; then only nodes that are part of the collection are returned. If &#39;NOT_IN_COLLECTION&#39;  then only nodes that are not part of the active collection are returned. If &#39;ALL&#39; then all nodes (ignoring  collections) are returned. Defaults to &#39;ALL&#39;.
         * @param {string} [portTypeId] The port type ID of the port type all returned nodes (and components) have to be compatible with.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        searchNodes(
        	params: { q?: string,  tags?: Array<string>,  allTagsMatch?: boolean,  offset?: number,  limit?: number,  fullTemplateInfo?: boolean,  nodesPartition?: 'IN_COLLECTION' | 'NOT_IN_COLLECTION' | 'ALL',  portTypeId?: string  }
        ): Promise<NodeSearchResult> {
           const defaultParams = { 
                q: null,
                tags: null,
                allTagsMatch: null,
                offset: null,
                limit: null,
                fullTemplateInfo: null,
                nodesPartition: null,
                portTypeId: null,
           }

           return rpcClient.call('NodeRepositoryService.searchNodes', { ...defaultParams, ...params });
        },
    }
};

/**
 * port - functional programming interface
 * @export
 */
const port = function(rpcClient: RPCClient) {
    return {
        /**
         * Performs text-based remote procedure calls for ports. The format of the rpc request and response depends on the port type that is being addressed.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} portIdx The port index to be used.
         * @param {number} viewIdx The index of the specific port view to obtain
         * @param {'initial_data' | 'data'} serviceType 
         * @param {string} [dataServiceRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        callPortDataService(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number,  serviceType: 'initial_data' | 'data',  dataServiceRequest?: string  }
        ): Promise<string> {
           const defaultParams = { 
                dataServiceRequest: null,
           }

           return rpcClient.call('PortService.callPortDataService', { ...defaultParams, ...params });
        },
        /**
         * Returns all the information on a port view required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} portIdx The port index to be used.
         * @param {number} viewIdx The index of the specific port view to obtain
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getPortView(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number  }
        ): Promise<any> {
           const defaultParams = { 
           }

           return rpcClient.call('PortService.getPortView', { ...defaultParams, ...params });
        },
    }
};

/**
 * space - functional programming interface
 * @export
 */
const space = function(rpcClient: RPCClient) {
    return {
        /**
         * Create a new workflow within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory  (workflow group).
         * @param {string} itemName Name given to a space item.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string,  itemName: string  }
        ): Promise<SpaceItem> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.createWorkflow', { ...defaultParams, ...params });
        },
        /**
         * Create a new workflow group within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory  (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createWorkflowGroup(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<SpaceItem> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.createWorkflowGroup', { ...defaultParams, ...params });
        },
        /**
         * Deletes items from the space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {Array<string>} itemIds A list of identifiers of items in the space.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteItems(
        	params: { spaceId: string,  spaceProviderId: string,  itemIds: Array<string>  }
        ): Promise<Response> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.deleteItems', { ...defaultParams, ...params });
        },
        /**
         * Mainly returns the spaces provided by this space-provider.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getSpaceProvider(
        	params: { spaceProviderId: string  }
        ): Promise<SpaceProvider> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.getSpaceProvider', { ...defaultParams, ...params });
        },
        /**
         * Get shallow list of workflows, components and data-files within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory  (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listWorkflowGroup(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<WorkflowGroupContent> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.listWorkflowGroup', { ...defaultParams, ...params });
        },
        /**
         * Move a space items to a different workflow group within its space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {Array<string>} itemIds A list of identifiers of items in the space.
         * @param {string} destWorkflowGroupItemId The destination workflow group item id, therefore the new parent.
         * @param {'noop' | 'autorename' | 'overwrite'} collisionHandling How to solve potential name collisions.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        moveItems(
        	params: { spaceId: string,  spaceProviderId: string,  itemIds: Array<string>,  destWorkflowGroupItemId: string,  collisionHandling: 'noop' | 'autorename' | 'overwrite'  }
        ): Promise<Response> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.moveItems', { ...defaultParams, ...params });
        },
        /**
         * Rename a space Item
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory  (workflow group).
         * @param {string} itemName Name given to a space item.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        renameItem(
        	params: { spaceProviderId: string,  spaceId: string,  itemId: string,  itemName: string  }
        ): Promise<SpaceItem> {
           const defaultParams = { 
           }

           return rpcClient.call('SpaceService.renameItem', { ...defaultParams, ...params });
        },
    }
};

/**
 * workflow - functional programming interface
 * @export
 */
const workflow = function(rpcClient: RPCClient) {
    return {
        /**
         * Executed a command on the referenced workflow. Every request with the same operation is idempotent.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {WorkflowCommand} workflowCommand An object that describes the command to be executed.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        executeWorkflowCommand(
        	params: { projectId: string,  workflowId: string,  workflowCommand: WorkflowCommand  }
        ): Promise<CommandResult> {
           const defaultParams = { 
           }

           return rpcClient.call('WorkflowService.executeWorkflowCommand', { ...defaultParams, ...params });
        },
        /**
         * Retrieves the complete structure (sub-)workflows.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {boolean} [includeInteractionInfo] Whether to enclose information that is required when the user is interacting with the returned workflow. E.g. the allowed actions (reset, execute, cancel) for contained nodes and the entire workflow itself.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflow(
        	params: { projectId: string,  workflowId: string,  includeInteractionInfo?: boolean  }
        ): Promise<WorkflowSnapshot> {
           const defaultParams = { 
                includeInteractionInfo: null,
           }

           return rpcClient.call('WorkflowService.getWorkflow', { ...defaultParams, ...params });
        },
        /**
         * Re-does the last command from the redo-stack.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        redoWorkflowCommand(
        	params: { projectId: string,  workflowId: string  }
        ): Promise<Response> {
           const defaultParams = { 
           }

           return rpcClient.call('WorkflowService.redoWorkflowCommand', { ...defaultParams, ...params });
        },
        /**
         * Un-does the last command from the undo-stack.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        undoWorkflowCommand(
        	params: { projectId: string,  workflowId: string  }
        ): Promise<Response> {
           const defaultParams = { 
           }

           return rpcClient.call('WorkflowService.undoWorkflowCommand', { ...defaultParams, ...params });
        },
    }
};


const WorkflowCommandApiWrapper = function(rpcClient: RPCClient, configuration: Configuration) {
  const identity = (response) => response
  const { postProcessCommandResponse = identity } = configuration;

  return {
 	/**
     * Moves workflow nodes and workflow annotations to a defined position.
     */
	Translate(
		params: { projectId: string, workflowId: string } & Omit<TranslateCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Translate }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Deletes the specified nodes, workflow annotations or connections. Note that there are potentially more connections deleted than specified, i.e. those connected to a node that is to be deleted. If any of the elements can&#39;t be deleted (because it doesn&#39;t exist or the deletion is not allowed) the entire delete operation is aborted (i.e. nothing is deleted).
     */
	Delete(
		params: { projectId: string, workflowId: string } & Omit<DeleteCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Delete }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Connects two nodes (and by doing that possibly replacing another connection).
     */
	Connect(
		params: { projectId: string, workflowId: string } & Omit<ConnectCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Connect }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Adds a new node to the workflow.
     */
	AddNode(
		params: { projectId: string, workflowId: string } & Omit<AddNodeCommand, 'kind'>
    ): Promise<AddNodeResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AddNode }
		}) as Promise<AddNodeResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Replaces an existing node with a new node provided by either an existing node or generated by the given node factory.
     */
	ReplaceNode(
		params: { projectId: string, workflowId: string } & Omit<ReplaceNodeCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.ReplaceNode }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Inserts a node on top of an existing connection
     */
	InsertNode(
		params: { projectId: string, workflowId: string } & Omit<InsertNodeCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.InsertNode }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Updates the name of a component or metanode
     */
	UpdateComponentOrMetanodeName(
		params: { projectId: string, workflowId: string } & Omit<UpdateComponentOrMetanodeNameCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateComponentOrMetanodeName }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Updates the label of a native node, component or metanode.
     */
	UpdateNodeLabel(
		params: { projectId: string, workflowId: string } & Omit<UpdateNodeLabelCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateNodeLabel }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Resets nodes contained in the metanode or container and expands it.
     */
	Expand(
		params: { projectId: string, workflowId: string } & Omit<ExpandCommand, 'kind'>
    ): Promise<ExpandResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Expand }
		}) as Promise<ExpandResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Resets selected nodes and collapses selected nodes and annotations into a metanode or component.
     */
	Collapse(
		params: { projectId: string, workflowId: string } & Omit<CollapseCommand, 'kind'>
    ): Promise<CollapseResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Collapse }
		}) as Promise<CollapseResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Add a port to a node. In case of native nodes, the port will be appended to the given port group. In case of container nodes, port will be added as last port.
     */
	AddPort(
		params: { projectId: string, workflowId: string } & Omit<AddPortCommand, 'kind'>
    ): Promise<AddPortResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AddPort }
		}) as Promise<AddPortResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Remove a port from a node
     */
	RemovePort(
		params: { projectId: string, workflowId: string } & Omit<RemovePortCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.RemovePort }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Copy selected workflow parts and serialize to workflow definition format.  This command only returns the serialized workflow parts.
     */
	Copy(
		params: { projectId: string, workflowId: string } & Omit<CopyCommand, 'kind'>
    ): Promise<CopyResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Copy }
		}) as Promise<CopyResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Cut selected workflow parts and serialize to workflow definition format. This command returns the serialized workflow parts and deletes the selected nodes and annotations.
     */
	Cut(
		params: { projectId: string, workflowId: string } & Omit<CutCommand, 'kind'>
    ): Promise<CopyResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Cut }
		}) as Promise<CopyResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Paste workflow parts in workflow definition format into the active workflow.
     */
	Paste(
		params: { projectId: string, workflowId: string } & Omit<PasteCommand, 'kind'>
    ): Promise<PasteResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.Paste }
		}) as Promise<PasteResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Changes the size (width and height) and position (x, y) of a workflow annotation.
     */
	TransformWorkflowAnnotation(
		params: { projectId: string, workflowId: string } & Omit<TransformWorkflowAnnotationCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.TransformWorkflowAnnotation }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Updates the text and/or the border color of a workflow annotation. Either one can be &#39;null&#39;,  but never both of them.
     */
	UpdateWorkflowAnnotation(
		params: { projectId: string, workflowId: string } & Omit<UpdateWorkflowAnnotationCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateWorkflowAnnotation }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Alters the z-order of a list of workflow annotations.
     */
	ReorderWorkflowAnnotations(
		params: { projectId: string, workflowId: string } & Omit<ReorderWorkflowAnnotationsCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.ReorderWorkflowAnnotations }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Creates a new workflow annotation at a given position.
     */
	AddWorkflowAnnotation(
		params: { projectId: string, workflowId: string } & Omit<AddWorkflowAnnotationCommand, 'kind'>
    ): Promise<AddAnnotationResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AddWorkflowAnnotation }
		}) as Promise<AddAnnotationResult>;
		return postProcessCommandResponse(commandResponse);
	},	

  }
}

export type EventParams =
    | (WorkflowChangedEventType & { typeId: 'WorkflowChangedEventType' })
    | (AppStateChangedEventType & { typeId: 'AppStateChangedEventType' })
    | (SelectionEventType & { typeId: 'SelectionEventType' })
    | (UpdateAvailableEventType & { typeId: 'UpdateAvailableEventType' })
;

export interface EventHandlers {
    WorkflowChangedEvent?(payload: WorkflowChangedEvent): void;
    CompositeEvent?(payload: CompositeEvent): void;
    ProjectDirtyStateEvent?(payload: ProjectDirtyStateEvent): void;
    AppStateChangedEvent?(payload: AppStateChangedEvent): void;
    UpdateAvailableEvent?(payload: UpdateAvailableEvent): void;
}

const EventApiWrapper = function (rpcClient: RPCClient) {
    return {
        subscribeEvent(params: EventParams): Promise<Response> {
			return event(rpcClient).addEventListener({ eventType: params });
        },

        registerEventHandlers(handlers: EventHandlers): void {
			rpcClient.registerEventHandlers(handlers);
        },

        unsubscribeEventListener(params: EventParams): Promise<Response> {
			return event(rpcClient).removeEventListener({ eventType: params });
        },
    };
};



export const createAPI = (configuration: Configuration) => {
    const rpcClient = createRPCClient(configuration);

    const api = { 
        application: application(rpcClient),
        event: event(rpcClient),
        node: node(rpcClient),
        noderepository: noderepository(rpcClient),
        port: port(rpcClient),
        space: space(rpcClient),
        workflow: workflow(rpcClient),
    };

    const { workflow: { executeWorkflowCommand, ...rest } } = api;

    return {
        ...api,
        workflow: rest,
        event: EventApiWrapper(rpcClient),
        workflowCommand: WorkflowCommandApiWrapper(rpcClient, configuration)
    }
};