import type { Configuration } from './configuration';
import type { RPCClient } from './rpc-client';
import { mapToExceptionClass } from './generated-exceptions';

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
 * Insert a new bendpoint on a given connection.
 * @export
 * @interface AddBendpointCommand
 */
export interface AddBendpointCommand extends WorkflowCommand {

    /**
     * The connection id to add a bendpoint to.
     * @type {string}
     * @memberof AddBendpointCommand
     */
    connectionId: string;
    /**
     * The index of the bendpoint to be added
     * @type {number}
     * @memberof AddBendpointCommand
     */
    index: number;
    /**
     *
     * @type {XY}
     * @memberof AddBendpointCommand
     */
    position: XY;

}


/**
 * @export
 * @namespace AddBendpointCommand
 */
export namespace AddBendpointCommand {
}
/**
 * Adds a new component to the workflow.
 * @export
 * @interface AddComponentCommand
 */
export interface AddComponentCommand extends WorkflowCommand {

    /**
     *
     * @type {string}
     * @memberof AddComponentCommand
     */
    providerId: string;
    /**
     *
     * @type {string}
     * @memberof AddComponentCommand
     */
    spaceId: string;
    /**
     *
     * @type {string}
     * @memberof AddComponentCommand
     */
    itemId: string;
    /**
     *
     * @type {XY}
     * @memberof AddComponentCommand
     */
    position: XY;

}


/**
 * @export
 * @namespace AddComponentCommand
 */
export namespace AddComponentCommand {
}
/**
 *
 * @export
 * @interface AddComponentResult
 */
export interface AddComponentResult extends CommandResult {

    /**
     * The id of the new componet added.
     * @type {string}
     * @memberof AddComponentResult
     */
    newNodeId?: string;
    /**
     *
     * @type {ProblemMessage}
     * @memberof AddComponentResult
     */
    problem?: ProblemMessage;

}


/**
 * @export
 * @namespace AddComponentResult
 */
export namespace AddComponentResult {
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
    /**
     * Optional parameter that describe the relation of the new node with the given node,  either a Successor or a predecessor of the given node
     * @type {string}
     * @memberof AddNodeCommand
     */
    nodeRelation?: AddNodeCommand.NodeRelationEnum;

}


/**
 * @export
 * @namespace AddNodeCommand
 */
export namespace AddNodeCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum NodeRelationEnum {
        PREDECESSORS = 'PREDECESSORS',
        SUCCESSORS = 'SUCCESSORS'
    }
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
    newNodeId?: string;

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
     * @type {TypedText}
     * @memberof Annotation
     */
    text: TypedText;
    /**
     * The background color. If not given, the default background color needs to be used (which is usually opaque).
     * @type {string}
     * @memberof Annotation
     */
    backgroundColor?: string;
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
     * The general mode the app is initialized with.  Control various aspects of the app  (ui elements being hidden/shown, whether a workflow can be edited, ...)
     * @type {string}
     * @memberof AppState
     */
    appMode?: AppState.AppModeEnum;
    /**
     * List of all opened workflow projects.
     * @type {Array<Project>}
     * @memberof AppState
     */
    openProjects?: Array<Project>;
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
     * Available component node types.
     * @type {Array<string>}
     * @memberof AppState
     */
    availableComponentTypes?: Array<string>;
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
     * Whether the application should use embedded dialogs or detached dialogs.
     * @type {boolean}
     * @memberof AppState
     */
    useEmbeddedDialogs?: boolean;
    /**
     * Whether all K-AI-related features (chat sidebar, build mode, scripting assistance, etc.) are enabled.
     * @type {boolean}
     * @memberof AppState
     */
    isKaiEnabled?: boolean;
    /**
     * Display name of currently active node collection. Compatible with \&quot;Search in {activeNodeCollection} nodes\&quot;.
     * @type {string}
     * @memberof AppState
     */
    activeNodeCollection?: string;
    /**
     * Whether to always confirm node config changes or apply them automatically when de-selecting a node.
     * @type {boolean}
     * @memberof AppState
     */
    confirmNodeConfigChanges?: boolean;
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
    /**
     * Whether the node repository is loaded (and ready to be used) or not.
     * @type {boolean}
     * @memberof AppState
     */
    nodeRepositoryLoaded?: boolean;
    /**
     * Web URL to send the user to to download the desktop edition of the Analytics Platform.
     * @type {string}
     * @memberof AppState
     */
    analyticsPlatformDownloadURL?: string;
    /**
     * Wheter to enable the locking of metanodes and components
     * @type {boolean}
     * @memberof AppState
     */
    isSubnodeLockingEnabled?: boolean;
    /**
     * A list of all available space providers.
     * @type {Array<SpaceProvider>}
     * @memberof AppState
     */
    spaceProviders?: Array<SpaceProvider>;

}


/**
 * @export
 * @namespace AppState
 */
export namespace AppState {
    /**
     * @export
     * @enum {string}
     */
    export enum AppModeEnum {
        Default = 'default',
        JobViewer = 'job-viewer',
        Playground = 'playground'
    }
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
 * Automatically connects all the nodes / port bars selected.
 * @export
 * @interface AutoConnectCommand
 */
export interface AutoConnectCommand extends ConnectablesBasedCommand {


}


/**
 * @export
 * @namespace AutoConnectCommand
 */
export namespace AutoConnectCommand {
}
/**
 * Remove all connections among the selected workflow parts.
 * @export
 * @interface AutoDisconnectCommand
 */
export interface AutoDisconnectCommand extends ConnectablesBasedCommand {


}


/**
 * @export
 * @namespace AutoDisconnectCommand
 */
export namespace AutoDisconnectCommand {
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
 * Metadata on a node category
 * @export
 * @interface CategoryMetadata
 */
export interface CategoryMetadata {

    /**
     * Human-readable display name of this category
     * @type {string}
     * @memberof CategoryMetadata
     */
    displayName?: string;
    /**
     * The full path of this category in the category tree.
     * @type {Array<string>}
     * @memberof CategoryMetadata
     */
    path?: Array<string>;

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
        CollapseResult = 'collapse_result',
        ExpandResult = 'expand_result',
        ConvertContainerResult = 'convert_container_result',
        CopyResult = 'copy_result',
        PasteResult = 'paste_result',
        AddNodeResult = 'add_node_result',
        AddPortResult = 'add_port_result',
        AddAnnotationResult = 'add_annotation_result',
        UpdateLinkedComponentsResult = 'update_linked_components_result'
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
    /**
     * The lock-status of this node. It has three states: absent if there is no lock at all, true if it&#39;s locked, false if it&#39;s unlocked.
     * @type {boolean}
     * @memberof ComponentNode
     */
    isLocked?: boolean;

}


/**
 * @export
 * @namespace ComponentNode
 */
export namespace ComponentNode {
}
/**
 * Basic information about a component node.
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
export interface ComponentNodeDescription extends EditableMetadata {


}


/**
 * @export
 * @namespace ComponentNodeDescription
 */
export namespace ComponentNodeDescription {
}
/**
 * The (user-editable) description of a component&#39;s port. Assumed to be Plaintext.
 * @export
 * @interface ComponentPortDescription
 */
export interface ComponentPortDescription {

    /**
     *
     * @type {string}
     * @memberof ComponentPortDescription
     */
    name?: string;
    /**
     *
     * @type {string}
     * @memberof ComponentPortDescription
     */
    description?: string;

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
 * A selection of connectable workflow parts
 * @export
 * @interface ConnectablesBasedCommand
 */
export interface ConnectablesBasedCommand extends WorkflowCommand {

    /**
     *
     * @type {boolean}
     * @memberof ConnectablesBasedCommand
     */
    workflowInPortsBarSelected?: boolean;
    /**
     *
     * @type {boolean}
     * @memberof ConnectablesBasedCommand
     */
    workflowOutPortsBarSelected?: boolean;
    /**
     *
     * @type {Array<any>}
     * @memberof ConnectablesBasedCommand
     */
    selectedNodes: Array<any>;
    /**
     * Consider only flow variable ports (including hidden/implicit).
     * @type {boolean}
     * @memberof ConnectablesBasedCommand
     */
    flowVariablePortsOnly?: boolean;

}


/**
 * @export
 * @namespace ConnectablesBasedCommand
 */
export namespace ConnectablesBasedCommand {
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
    /**
     * List of bendpoint coordinates.
     * @type {Array<XY>}
     * @memberof Connection
     */
    bendpoints?: Array<XY>;

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
 * Copy selected workflow parts and serialize to workflow definition format. This command only returns the serialized workflow parts.
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
    /**
     * Map from connection ID to indices of bendpoints on that connection
     * @type {{ [key: string]: Array<number>; }}
     * @memberof DeleteCommand
     */
    connectionBendpoints?: { [key: string]: Array<number>; };

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
 * Metadata properties of a workflow (project or component) that can be edited
 * @export
 * @interface EditableMetadata
 */
export interface EditableMetadata {

    /**
     *
     * @type {TypedText}
     * @memberof EditableMetadata
     */
    description?: TypedText;
    /**
     * Descriminator for different types of metadata.
     * @type {string}
     * @memberof EditableMetadata
     */
    metadataType: EditableMetadata.MetadataTypeEnum;
    /**
     * A collection of tags the user chose to describe the workflow
     * @type {Array<string>}
     * @memberof EditableMetadata
     */
    tags?: Array<string>;
    /**
     * A collection of URLs attached to the workflow
     * @type {Array<Link>}
     * @memberof EditableMetadata
     */
    links?: Array<Link>;

}


/**
 * @export
 * @namespace EditableMetadata
 */
export namespace EditableMetadata {
    /**
     * @export
     * @enum {string}
     */
    export enum MetadataTypeEnum {
        Project = 'project',
        Component = 'component'
    }
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
 * Information about the extension which provides this node
 * @export
 * @interface Extension
 */
export interface Extension {

    /**
     * Display name of the extension
     * @type {string}
     * @memberof Extension
     */
    name: string;
    /**
     *
     * @type {Vendor}
     * @memberof Extension
     */
    vendor?: Vendor;

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
 * Encapsulates user feedback to K-AI.
 * @export
 * @interface KaiFeedback
 */
export interface KaiFeedback {

    /**
     * True if the feedback is positive, false if it is negative.
     * @type {boolean}
     * @memberof KaiFeedback
     */
    isPositive: boolean;
    /**
     * A comment provided by the user.
     * @type {string}
     * @memberof KaiFeedback
     */
    comment: string;
    /**
     * Identifies the top-level workflow.
     * @type {string}
     * @memberof KaiFeedback
     */
    projectId: string;

}


/**
 * A message send to K-AI. Consists of the role (user or AI) and a message content.
 * @export
 * @interface KaiMessage
 */
export interface KaiMessage {

    /**
     * Role of the message sender.
     * @type {string}
     * @memberof KaiMessage
     */
    role: KaiMessage.RoleEnum;
    /**
     * Content of the message.
     * @type {string}
     * @memberof KaiMessage
     */
    content: string;

}


/**
 * @export
 * @namespace KaiMessage
 */
export namespace KaiMessage {
    /**
     * @export
     * @enum {string}
     */
    export enum RoleEnum {
        Assistant = 'assistant',
        User = 'user'
    }
}
/**
 * Encapsulates a request to K-AI which contains the entire conversation  as well as information on the open workflow, subworkflow and selected nodes. 
 * @export
 * @interface KaiRequest
 */
export interface KaiRequest {

    /**
     * The conversationId is assigned by the service and allows to correlate requests. Null for the first request of a conversation. 
     * @type {string}
     * @memberof KaiRequest
     */
    conversationId?: string;
    /**
     * Identifies the top-level workflow.
     * @type {string}
     * @memberof KaiRequest
     */
    projectId: string;
    /**
     * ID of the subworkflow the user is in.
     * @type {string}
     * @memberof KaiRequest
     */
    workflowId: string;
    /**
     * The IDs of the selected nodes.
     * @type {Array<string>}
     * @memberof KaiRequest
     */
    selectedNodes: Array<string>;
    /**
     *
     * @type {XY}
     * @memberof KaiRequest
     */
    startPosition?: XY;
    /**
     *
     * @type {Array<KaiMessage>}
     * @memberof KaiRequest
     */
    messages: Array<KaiMessage>;

}


/**
 *
 * @export
 * @interface KaiUiStrings
 */
export interface KaiUiStrings {

    /**
     * The disclaimer users have to accept before they can chat with K-AI.
     * @type {string}
     * @memberof KaiUiStrings
     */
    disclaimer: string;
    /**
     *
     * @type {KaiWelcomeMessages}
     * @memberof KaiUiStrings
     */
    welcomeMessages: KaiWelcomeMessages;

}


/**
 * The messages K-AI starts the conversations with.
 * @export
 * @interface KaiWelcomeMessages
 */
export interface KaiWelcomeMessages {

    /**
     * The welcome message for the Q&amp;A mode
     * @type {string}
     * @memberof KaiWelcomeMessages
     */
    qa: string;
    /**
     * The welcome message for the Build mode
     * @type {string}
     * @memberof KaiWelcomeMessages
     */
    build: string;

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
    /**
     * The lock-status of this node. It has three states: absent if there is no lock at all, true if it&#39;s locked, false if it&#39;s unlocked.
     * @type {boolean}
     * @memberof MetaNode
     */
    isLocked?: boolean;

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
     *
     * @type {Bounds}
     * @memberof MetaPorts
     */
    bounds?: Bounds;
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
     * Indicates whether the node has a view. Not present, if the node has no view.
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
     * The freeform description text of the node. Sometimes also referred to as \&quot;intro text\&quot;. May contain HTML markup tags.
     * @type {string}
     * @memberof NativeNodeDescription
     */
    description?: string;
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
    /**
     *
     * @type {Extension}
     * @memberof NativeNodeDescription
     */
    extension?: Extension;

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
    /**
     *
     * @type {Extension}
     * @memberof NativeNodeInvariants
     */
    extension?: Extension;

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
        Forbidden = 'Forbidden',
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
     * Indicates whether and type of dialog a node has. Not present if the node has no dialog.
     * @type {string}
     * @memberof Node
     */
    dialogType?: Node.DialogTypeEnum;
    /**
     * A change in this value signals that the input of the node has changed (this currently only considers   port specs). Includes the flow variable port. Not present if &#x60;hasDialog&#x60; is false. Not present if &#x60;interaction info&#x60; is not included. Not present if no input ports present. Not present for metanodes.
     * @type {number}
     * @memberof Node
     */
    inputContentVersion?: number;
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
    /**
     * @export
     * @enum {string}
     */
    export enum DialogTypeEnum {
        Web = 'web',
        Swing = 'swing'
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
 * A category of nodes, including metadata, directly contained nodes, and child categories.
 * @export
 * @interface NodeCategory
 */
export interface NodeCategory {

    /**
     *
     * @type {CategoryMetadata}
     * @memberof NodeCategory
     */
    metadata?: CategoryMetadata;
    /**
     * List of nodes directly in this category (not including those in sub-categories).
     * @type {Array<NodeTemplate>}
     * @memberof NodeCategory
     */
    nodes?: Array<NodeTemplate>;
    /**
     * Child categories of this category.
     * @type {Array<CategoryMetadata>}
     * @memberof NodeCategory
     */
    childCategories?: Array<CategoryMetadata>;

}


/**
 * Node description properties that are common to all kinds of nodes. This is static information in the sense that it does not depend on a concrete node instance in a workflow.
 * @export
 * @interface NodeDescription
 */
export interface NodeDescription {

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
 * A node ID and whether the node is executed or not
 * @export
 * @interface NodeIdAndIsExecuted
 */
export interface NodeIdAndIsExecuted {

    /**
     *
     * @type {string}
     * @memberof NodeIdAndIsExecuted
     */
    id: string;
    /**
     *
     * @type {boolean}
     * @memberof NodeIdAndIsExecuted
     */
    isExecuted: boolean;

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
    connectedVia: Array<string>;
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
    /**
     * Flag for the magical ports on the outside of Components with reporting activated, absent if &#x60;false&#x60;.
     * @type {boolean}
     * @memberof NodePort
     */
    isComponentReportPort?: boolean;

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
 * Event emmitted while loading the node repository.
 * @export
 * @interface NodeRepositoryLoadingProgressEvent
 */
export interface NodeRepositoryLoadingProgressEvent extends Event {

    /**
     * The overall progress in range [0,1].
     * @type {number}
     * @memberof NodeRepositoryLoadingProgressEvent
     */
    progress?: number;
    /**
     * The name of the extension currently processed.
     * @type {string}
     * @memberof NodeRepositoryLoadingProgressEvent
     */
    extensionName?: string;

}


/**
 * The event type to register for the respective event.
 * @export
 * @interface NodeRepositoryLoadingProgressEventType
 */
export interface NodeRepositoryLoadingProgressEventType extends EventType {


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
    totalNumNodesFound: number;
    /**
     * The total number of nodes that match the search criteria but were filtered out by the requested partion. Absent if there aren&#39;t any filtered nodes in the node repository.
     * @type {number}
     * @memberof NodeSearchResult
     */
    totalNumFilteredNodesFound?: number;
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
     * @type {Array<string>}
     * @memberof NodeState
     */
    progressMessages?: Array<string>;
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
    /**
     * Map from connection ID to indices of bendpoints on that connection
     * @type {{ [key: string]: Array<number>; }}
     * @memberof PartBasedCommand
     */
    connectionBendpoints?: { [key: string]: Array<number>; };

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
    ops: Array<PatchOp>;

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
     * Which input ports (identified by index position) belong to the port group. Either this or the &#39;outputRange&#39; is required for a port group.
     * @type {Array<number>}
     * @memberof PortGroup
     */
    inputRange?: Array<number>;
    /**
     * Which output ports (identified by index position) belong to the port group. Either this or the &#39;inputRange&#39; is required for a port group.
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
 * Represents a problem message.
 * @export
 * @interface ProblemMessage
 */
export interface ProblemMessage {

    /**
     *
     * @type {string}
     * @memberof ProblemMessage
     */
    type: ProblemMessage.TypeEnum;
    /**
     *
     * @type {string}
     * @memberof ProblemMessage
     */
    title: string;
    /**
     *
     * @type {string}
     * @memberof ProblemMessage
     */
    message: string;

}


/**
 * @export
 * @namespace ProblemMessage
 */
export namespace ProblemMessage {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        Error = 'error',
        Warning = 'warning'
    }
}
/**
 * Represents an entire workflow project.
 * @export
 * @interface Project
 */
export interface Project {

    /**
     *
     * @type {string}
     * @memberof Project
     */
    projectId: string;
    /**
     *
     * @type {SpaceItemReference}
     * @memberof Project
     */
    origin?: SpaceItemReference;
    /**
     *
     * @type {string}
     * @memberof Project
     */
    name: string;
    /**
     * If this workflow project is active, it provides the node id of the active workflow (e.g. the root workflow or a sub-workflow (component/metanode)).
     * @type {string}
     * @memberof Project
     */
    activeWorkflowId?: string;

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
 * Emitted when a project with a known project-id has been disposed.
 * @export
 * @interface ProjectDisposedEvent
 */
export interface ProjectDisposedEvent extends Event {

    /**
     * The id of the project that has been disposed.
     * @type {string}
     * @memberof ProjectDisposedEvent
     */
    projectId: string;

}


/**
 * The event type to register for the respective event.
 * @export
 * @interface ProjectDisposedEventType
 */
export interface ProjectDisposedEventType extends EventType {

    /**
     * The event is going to emitted if the project  with this id is disposed.
     * @type {string}
     * @memberof ProjectDisposedEventType
     */
    projectId: string;

}


/**
 * Metadata of a workflow project.
 * @export
 * @interface ProjectMetadata
 */
export interface ProjectMetadata extends EditableMetadata {

    /**
     * The date and time of the last change made to this workflow
     * @type {Date}
     * @memberof ProjectMetadata
     */
    lastEdit?: Date;

}


/**
 * @export
 * @namespace ProjectMetadata
 */
export namespace ProjectMetadata {
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
     * The specific reorder action to perform, can be one of four: &#39;bring_forward&#39; brings the selected annotation forward by one relative-to-other-annotations position; &#39;bring_to_front&#39; moves the selected annotation in front of all other annotations; &#39;send_backward&#39; sends the selected annotation backward by one relative-to-other-annotations position; &#39;send_to_back&#39; sends the selected annotation back of all other annotations.
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
 * A selection (aka hiliting) event.
 * @export
 * @interface SelectionEvent
 */
export interface SelectionEvent extends Event {

    /**
     * The project emitting the event.
     * @type {string}
     * @memberof SelectionEvent
     */
    projectId: string;
    /**
     * The (sub-)workflow emitting the event.
     * @type {string}
     * @memberof SelectionEvent
     */
    workflowId: string;
    /**
     * The node emitting the event.
     * @type {string}
     * @memberof SelectionEvent
     */
    nodeId: string;
    /**
     * The port emitting the event (in case of a port view).
     * @type {number}
     * @memberof SelectionEvent
     */
    portIndex?: number;
    /**
     * selection mode
     * @type {string}
     * @memberof SelectionEvent
     */
    mode: SelectionEvent.ModeEnum;
    /**
     * representation of the actual selection (e.g. a list of row keys)
     * @type {Array<string>}
     * @memberof SelectionEvent
     */
    selection?: Array<string>;
    /**
     * an error message if the selection event couldn&#39;t be created
     * @type {string}
     * @memberof SelectionEvent
     */
    error?: string;

}


/**
 * @export
 * @namespace SelectionEvent
 */
export namespace SelectionEvent {
    /**
     * @export
     * @enum {string}
     */
    export enum ModeEnum {
        ADD = 'ADD',
        REMOVE = 'REMOVE',
        REPLACE = 'REPLACE'
    }
}
/**
 * Event emmitted in order to show a toast.
 * @export
 * @interface ShowToastEvent
 */
export interface ShowToastEvent extends Event {

    /**
     * The type of toast.
     * @type {string}
     * @memberof ShowToastEvent
     */
    type: ShowToastEvent.TypeEnum;
    /**
     * The headline. If not specified, the type is used as headline.
     * @type {string}
     * @memberof ShowToastEvent
     */
    headline?: string;
    /**
     * The toast message.
     * @type {string}
     * @memberof ShowToastEvent
     */
    message?: string;
    /**
     * If set to true, the toast will have an animated progress bar indicating time before being automatically dismissed.
     * @type {boolean}
     * @memberof ShowToastEvent
     */
    autoRemove?: boolean;

}


/**
 * @export
 * @namespace ShowToastEvent
 */
export namespace ShowToastEvent {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        Error = 'error',
        Warning = 'warning',
        Success = 'success',
        Info = 'info'
    }
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
 * Defines a group of spaces, could be an user or a team.
 * @export
 * @interface SpaceGroup
 */
export interface SpaceGroup {

    /**
     * Identifier of the group
     * @type {string}
     * @memberof SpaceGroup
     */
    id: string;
    /**
     * The group name
     * @type {string}
     * @memberof SpaceGroup
     */
    name: string;
    /**
     * The type of the group.
     * @type {string}
     * @memberof SpaceGroup
     */
    type: SpaceGroup.TypeEnum;
    /**
     * The spaces contained in the group.
     * @type {Array<Space>}
     * @memberof SpaceGroup
     */
    spaces: Array<Space>;

}


/**
 * @export
 * @namespace SpaceGroup
 */
export namespace SpaceGroup {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        TEAM = 'TEAM',
        USER = 'USER'
    }
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
 * Event to update the state of the space explorer.
 * @export
 * @interface SpaceItemChangedEvent
 */
export interface SpaceItemChangedEvent extends Event {

    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEvent
     */
    providerId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEvent
     */
    spaceId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEvent
     */
    itemId: string;

}


/**
 * The event type to register for the respective event.
 * @export
 * @interface SpaceItemChangedEventType
 */
export interface SpaceItemChangedEventType extends EventType {

    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEventType
     */
    providerId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEventType
     */
    spaceId: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemChangedEventType
     */
    itemId: string;

}


/**
 * Describes from where a workflow or component project originates.
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
     *
     * @type {string}
     * @memberof SpaceItemReference
     */
    projectType?: SpaceItemReference.ProjectTypeEnum;
    /**
     *
     * @type {SpaceItemVersion}
     * @memberof SpaceItemReference
     */
    version?: SpaceItemVersion;
    /**
     * List of ids of the ancestors. The element at the first position in the list is the direct parent of this item, the second the parent of the parent etc. An empty list if the item is at root level.
     * @type {Array<string>}
     * @memberof SpaceItemReference
     */
    ancestorItemIds?: Array<string>;

}


/**
 * @export
 * @namespace SpaceItemReference
 */
export namespace SpaceItemReference {
    /**
     * @export
     * @enum {string}
     */
    export enum ProjectTypeEnum {
        Workflow = 'Workflow',
        Component = 'Component'
    }
}
/**
 *
 * @export
 * @interface SpaceItemVersion
 */
export interface SpaceItemVersion {

    /**
     *
     * @type {number}
     * @memberof SpaceItemVersion
     */
    version: number;
    /**
     *
     * @type {string}
     * @memberof SpaceItemVersion
     */
    title: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemVersion
     */
    description?: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemVersion
     */
    author?: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemVersion
     */
    authorAccountId?: string;
    /**
     *
     * @type {string}
     * @memberof SpaceItemVersion
     */
    createdOn?: string;

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
 * General space provider meta information.
 * @export
 * @interface SpaceProvider
 */
export interface SpaceProvider {

    /**
     *
     * @type {string}
     * @memberof SpaceProvider
     */
    id: string;
    /**
     *
     * @type {string}
     * @memberof SpaceProvider
     */
    name: string;
    /**
     * Type of the space provider.
     * @type {string}
     * @memberof SpaceProvider
     */
    type: SpaceProvider.TypeEnum;
    /**
     * host of the SpaceProvider, absent if not applicable
     * @type {string}
     * @memberof SpaceProvider
     */
    hostname?: string;
    /**
     * Whether this provider is the Community Hub
     * @type {boolean}
     * @memberof SpaceProvider
     */
    isCommunityHub?: boolean;
    /**
     *
     * @type {boolean}
     * @memberof SpaceProvider
     */
    connected: boolean;
    /**
     *
     * @type {string}
     * @memberof SpaceProvider
     */
    connectionMode: SpaceProvider.ConnectionModeEnum;
    /**
     *
     * @type {string}
     * @memberof SpaceProvider
     */
    username?: string;

}


/**
 * @export
 * @namespace SpaceProvider
 */
export namespace SpaceProvider {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        LOCAL = 'LOCAL',
        HUB = 'HUB',
        SERVER = 'SERVER'
    }
    /**
     * @export
     * @enum {string}
     */
    export enum ConnectionModeEnum {
        AUTHENTICATED = 'AUTHENTICATED',
        ANONYMOUS = 'ANONYMOUS',
        AUTOMATIC = 'AUTOMATIC'
    }
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
    /**
     * Whether this link type can be changed or not.
     * @type {boolean}
     * @memberof TemplateLink
     */
    isLinkTypeChangeable?: boolean;
    /**
     * Whether this Hub item version can be changed. This can only be true for shared templates on a Hub.
     * @type {any}
     * @memberof TemplateLink
     */
    isHubItemVersionChangeable?: any;

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
 * Sets the bounds (x,y,width,height) of a metanode ports bar.
 * @export
 * @interface TransformMetanodePortsBarCommand
 */
export interface TransformMetanodePortsBarCommand extends WorkflowCommand {

    /**
     * in- or out-metanode ports bar to set the bounds for
     * @type {string}
     * @memberof TransformMetanodePortsBarCommand
     */
    type?: TransformMetanodePortsBarCommand.TypeEnum;
    /**
     *
     * @type {Bounds}
     * @memberof TransformMetanodePortsBarCommand
     */
    bounds?: Bounds;

}


/**
 * @export
 * @namespace TransformMetanodePortsBarCommand
 */
export namespace TransformMetanodePortsBarCommand {
    /**
     * @export
     * @enum {string}
     */
    export enum TypeEnum {
        In = 'in',
        Out = 'out'
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
    /**
     * Whether to move the in-ports bar of a metanode. Requires the  metanode ports bar position to be set. Will fail otherwise.
     * @type {boolean}
     * @memberof TranslateCommand
     */
    metanodeInPortsBar?: boolean;
    /**
     * Whether to move the out-ports bar of a metanode. Requires the  metanode ports bar position to be set. Will fail otherwise.
     * @type {boolean}
     * @memberof TranslateCommand
     */
    metanodeOutPortsBar?: boolean;

}


/**
 * @export
 * @namespace TranslateCommand
 */
export namespace TranslateCommand {
}
/**
 * A text of a certain content type.
 * @export
 * @interface TypedText
 */
export interface TypedText {

    /**
     * The actual text.
     * @type {string}
     * @memberof TypedText
     */
    value: string;
    /**
     * The content type of the text.
     * @type {string}
     * @memberof TypedText
     */
    contentType: TypedText.ContentTypeEnum;

}


/**
 * @export
 * @namespace TypedText
 */
export namespace TypedText {
    /**
     * @export
     * @enum {string}
     */
    export enum ContentTypeEnum {
        Plain = 'text/plain',
        Html = 'text/html'
    }
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
 * Updates a components link information or unlinks a component
 * @export
 * @interface UpdateComponentLinkInformationCommand
 */
export interface UpdateComponentLinkInformationCommand extends WorkflowCommand {

    /**
     * Id of component which link information is to be updated
     * @type {string}
     * @memberof UpdateComponentLinkInformationCommand
     */
    nodeId: string;
    /**
     * New link URL, empty if you want to unlink the component
     * @type {string}
     * @memberof UpdateComponentLinkInformationCommand
     */
    newUrl?: string;

}


/**
 * @export
 * @namespace UpdateComponentLinkInformationCommand
 */
export namespace UpdateComponentLinkInformationCommand {
}
/**
 * Update the metadata of a component.
 * @export
 * @interface UpdateComponentMetadataCommand
 */
export interface UpdateComponentMetadataCommand extends WorkflowCommand {

    /**
     *
     * @type {Array<ComponentPortDescription>}
     * @memberof UpdateComponentMetadataCommand
     */
    inPorts: Array<ComponentPortDescription>;
    /**
     *
     * @type {Array<ComponentPortDescription>}
     * @memberof UpdateComponentMetadataCommand
     */
    outPorts: Array<ComponentPortDescription>;
    /**
     * The component icon, or null if the default icon should be used.
     * @type {string}
     * @memberof UpdateComponentMetadataCommand
     */
    icon?: string;
    /**
     *
     * @type {string}
     * @memberof UpdateComponentMetadataCommand
     */
    type?: UpdateComponentMetadataCommand.TypeEnum;

}


/**
 * @export
 * @namespace UpdateComponentMetadataCommand
 */
export namespace UpdateComponentMetadataCommand {
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
 * Updates all the linked component, returning a success state at the end.
 * @export
 * @interface UpdateLinkedComponentsCommand
 */
export interface UpdateLinkedComponentsCommand extends WorkflowCommand {

    /**
     * The ids of the nodes referenced.
     * @type {Array<string>}
     * @memberof UpdateLinkedComponentsCommand
     */
    nodeIds: Array<string>;

}


/**
 * @export
 * @namespace UpdateLinkedComponentsCommand
 */
export namespace UpdateLinkedComponentsCommand {
}
/**
 *
 * @export
 * @interface UpdateLinkedComponentsResult
 */
export interface UpdateLinkedComponentsResult extends CommandResult {

    /**
     * Whether the update succeeded or an error occured and no component link was updated.
     * @type {string}
     * @memberof UpdateLinkedComponentsResult
     */
    status: UpdateLinkedComponentsResult.StatusEnum;
    /**
     * Optional detail messages describing the update results
     * @type {Array<string>}
     * @memberof UpdateLinkedComponentsResult
     */
    details?: Array<string>;

}


/**
 * @export
 * @namespace UpdateLinkedComponentsResult
 */
export namespace UpdateLinkedComponentsResult {
    /**
     * @export
     * @enum {string}
     */
    export enum StatusEnum {
        Success = 'success',
        Error = 'error',
        Unchanged = 'unchanged'
    }
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
 * Update the metadata of a workflow project.
 * @export
 * @interface UpdateProjectMetadataCommand
 */
export interface UpdateProjectMetadataCommand extends WorkflowCommand {


}


/**
 * @export
 * @namespace UpdateProjectMetadataCommand
 */
export namespace UpdateProjectMetadataCommand {
}
/**
 * Updates the text and/or the border color of a workflow annotation. Either one can be &#39;null&#39;, but never both of them.
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
 * The vendor of an extension.
 * @export
 * @interface Vendor
 */
export interface Vendor {

    /**
     * Display name of the extension vendor
     * @type {string}
     * @memberof Vendor
     */
    name: string;
    /**
     * True if KNIME is the vendor, otherwise it&#39;s absent.
     * @type {boolean}
     * @memberof Vendor
     */
    isKNIME?: boolean;

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
     * @type {any}
     * @memberof Workflow
     */
    metadata: any;
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
        AutoConnect = 'auto_connect',
        AutoDisconnect = 'auto_disconnect',
        AddNode = 'add_node',
        AddComponent = 'add_component',
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
        AddWorkflowAnnotation = 'add_workflow_annotation',
        UpdateProjectMetadata = 'update_project_metadata',
        UpdateComponentMetadata = 'update_component_metadata',
        AddBendpoint = 'add_bendpoint',
        UpdateComponentLinkInformation = 'update_component_link_information',
        TransformMetanodePortsBar = 'transform_metanode_ports_bar',
        UpdateLinkedComponents = 'update_linked_components'
    }
}
/**
 * A list of items in a workflow group and more.
 * @export
 * @interface WorkflowGroupContent
 */
export interface WorkflowGroupContent {

    /**
     * The path (id and name per path-segment) of all workflow groups along the path-hierarchy with the last entry in the list being the id of the direct parent of these space items. Empty list if at root-level.
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
     * True if the workflow contains (deeply nested) linked components. If not, this property is absent.
     * @type {boolean}
     * @memberof WorkflowInfo
     */
    containsLinkedComponents?: boolean;
    /**
     * Type of the surrounding space&#39;s provider.
     * @type {string}
     * @memberof WorkflowInfo
     */
    providerType?: WorkflowInfo.ProviderTypeEnum;
    /**
     * The version identifier. &#x60;null&#x60; corresponds to the current-state (working area).
     * @type {string}
     * @memberof WorkflowInfo
     */
    version?: string;
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
    /**
     * @export
     * @enum {string}
     */
    export enum ProviderTypeEnum {
        LOCAL = 'LOCAL',
        HUB = 'HUB',
        SERVER = 'SERVER'
    }
}
/**
 * A message in the workflow monitor. &#x60;templateId&#x60; is only present if the node is a native node. &#x60;componentInfo&#x60; is only present if the node is a component node.
 * @export
 * @interface WorkflowMonitorMessage
 */
export interface WorkflowMonitorMessage {

    /**
     * The template id of the native node the message is associated with. Only present if the node is a native node.
     * @type {string}
     * @memberof WorkflowMonitorMessage
     */
    templateId?: string;
    /**
     *
     * @type {ComponentNodeAndDescription}
     * @memberof WorkflowMonitorMessage
     */
    componentInfo?: ComponentNodeAndDescription;
    /**
     * The id of the worklfow the node is contained in.
     * @type {string}
     * @memberof WorkflowMonitorMessage
     */
    workflowId: string;
    /**
     * The id of the node the message is associated with.
     * @type {string}
     * @memberof WorkflowMonitorMessage
     */
    nodeId: string;
    /**
     * The name of the node the message is associated with.
     * @type {string}
     * @memberof WorkflowMonitorMessage
     */
    name: string;
    /**
     * The actual message.
     * @type {string}
     * @memberof WorkflowMonitorMessage
     */
    message: string;

}


/**
 * The state of the workflow monitor.
 * @export
 * @interface WorkflowMonitorState
 */
export interface WorkflowMonitorState {

    /**
     * All the error messages in the entire workflow.
     * @type {Array<WorkflowMonitorMessage>}
     * @memberof WorkflowMonitorState
     */
    errors: Array<WorkflowMonitorMessage>;
    /**
     * All the warning messages in the entire workflow.
     * @type {Array<WorkflowMonitorMessage>}
     * @memberof WorkflowMonitorState
     */
    warnings: Array<WorkflowMonitorMessage>;

}


/**
 * Event for changes to the workflow monitor state.
 * @export
 * @interface WorkflowMonitorStateChangeEvent
 */
export interface WorkflowMonitorStateChangeEvent extends Event {

    /**
     *
     * @type {Patch}
     * @memberof WorkflowMonitorStateChangeEvent
     */
    patch: Patch;

}


/**
 * The event type to register for the respective event.
 * @export
 * @interface WorkflowMonitorStateChangeEventType
 */
export interface WorkflowMonitorStateChangeEventType extends EventType {

    /**
     * The workflow project id to get the change-events for.
     * @type {string}
     * @memberof WorkflowMonitorStateChangeEventType
     */
    projectId: string;
    /**
     * The initial snapshot id of the workflow monitor state version known to the client/ui.
     * @type {string}
     * @memberof WorkflowMonitorStateChangeEventType
     */
    snapshotId: string;

}


/**
 * Snapshot of the workflow monitor state.
 * @export
 * @interface WorkflowMonitorStateSnapshot
 */
export interface WorkflowMonitorStateSnapshot {

    /**
     *
     * @type {WorkflowMonitorState}
     * @memberof WorkflowMonitorStateSnapshot
     */
    state: WorkflowMonitorState;
    /**
     * A unique identifier for the version of the workflow monitor state.
     * @type {string}
     * @memberof WorkflowMonitorStateSnapshot
     */
    snapshotId: string;

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
            
            return rpcClient.call('ApplicationService.getState', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
    }
};

/**
 * component - functional programming interface
 * @export
 */
const component = function(rpcClient: RPCClient) {
    return {
        /**
         * Get a components description, will only work for component nodes.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        getComponentDescription(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<ComponentNodeDescription> {
            const defaultParams = { 
            }
            
            return rpcClient.call('ComponentService.getComponentDescription', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns all the information on a node view required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        getCompositeViewPage(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<any> {
            const defaultParams = { 
            }
            
            return rpcClient.call('ComponentService.getCompositeViewPage', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        addEventListener(
        	params: { eventType?: EventType  }
        ): Promise<Response> {
            const defaultParams = { 
                eventType: null,
            }
            
            return rpcClient.call('EventService.addEventListener', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
            
            return rpcClient.call('EventService.removeEventListener', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
    }
};

/**
 * kai - functional programming interface
 * @export
 */
const kai = function(rpcClient: RPCClient) {
    return {
        /**
         * Aborts the currently running request to the given chain.
         * @param {string} kaiChainId Id of a K-AI chain.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        abortAiRequest(
        	params: { kaiChainId: string  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('KaiService.abortAiRequest', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Fetches the disclaimer and welcome messages displayed in K-AI's chat interface.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getUiStrings(
        	params: {  }
        ): Promise<KaiUiStrings> {
            const defaultParams = { 
            }
            
            return rpcClient.call('KaiService.getUiStrings', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Sends a request to a chain.
         * @param {string} kaiChainId Id of a K-AI chain.
         * @param {KaiRequest} kaiRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        makeAiRequest(
        	params: { kaiChainId: string,  kaiRequest: KaiRequest  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('KaiService.makeAiRequest', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Submits feedback for a chain.
         * @param {string} kaiFeedbackId Id of the K-AI feedback
         * @param {KaiFeedback} kaiFeedback 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        submitFeedback(
        	params: { kaiFeedbackId: string,  kaiFeedback: KaiFeedback  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('KaiService.submitFeedback', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        callNodeDataService(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  extensionType: 'dialog' | 'view',  serviceType: 'initial_data' | 'data' | 'apply_data',  dataServiceRequest?: string  }
        ): Promise<string> {
            const defaultParams = { 
                dataServiceRequest: null,
            }
            
            return rpcClient.call('NodeService.callNodeDataService', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Changes state of a loop. The provided node-id must reference a loop-end node.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'pause' | 'resume' | 'step'} [action] The action (pause, resume, step) to be performed in order to change the loop state.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {OperationNotAllowedException} If the an operation is not allowed, e.g., because it&#39;s not applicable.
         */
        changeLoopState(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  action?: 'pause' | 'resume' | 'step'  }
        ): Promise<Response> {
            const defaultParams = { 
                action: null,
            }
            
            return rpcClient.call('NodeService.changeLoopState', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Changes the node state of multiple nodes represented by a list of node-ids.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {Array<string>} [nodeIds] The list of node ids of the nodes to be changed. All ids must reference nodes on the same workflow level. If no node ids are given the state of the parent workflow (i.e. the one referenced by workflow-id) is changed which is equivalent to change the states of all contained nodes.
         * @param {'reset' | 'cancel' | 'execute'} [action] The action (reset, cancel, execute) to be performed in order to change the node&#39;s state.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {OperationNotAllowedException} If the an operation is not allowed, e.g., because it&#39;s not applicable.
         */
        changeNodeStates(
        	params: { projectId: string,  workflowId: string,  nodeIds?: Array<string>,  action?: 'reset' | 'cancel' | 'execute'  }
        ): Promise<Response> {
            const defaultParams = { 
                nodeIds: null,
                action: null,
            }
            
            return rpcClient.call('NodeService.changeNodeStates', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * De-activates all the data service associated with the specified ui-extension.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'dialog' | 'view'} extensionType The node ui-extension-type, i.e. dialog or view.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        deactivateNodeDataServices(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  extensionType: 'dialog' | 'view'  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('NodeService.deactivateNodeDataServices', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Obtain the description of a given node.
         * @param {NodeFactoryKey} nodeFactoryKey The key identifying the node.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {NodeDescriptionNotAvailableException} A description for a given node could not be determined.
         */
        getNodeDescription(
        	params: { nodeFactoryKey: NodeFactoryKey  }
        ): Promise<NativeNodeDescription> {
            const defaultParams = { 
            }
            
            return rpcClient.call('NodeService.getNodeDescription', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns all the information on a node dialog required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        getNodeDialog(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<any> {
            const defaultParams = { 
            }
            
            return rpcClient.call('NodeService.getNodeDialog', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns all the information on a node view required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        getNodeView(
        	params: { projectId: string,  workflowId: string,  nodeId: string  }
        ): Promise<any> {
            const defaultParams = { 
            }
            
            return rpcClient.call('NodeService.getNodeView', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Updates the data point selection (aka hiliting) for a single node as specified.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {'add' | 'remove' | 'replace'} mode Whether to add, remove or replace the data point selection.
         * @param {Array<string>} [selection] A list of strings that are translated to the row keys affected by the data point selection modification.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         */
        updateDataPointSelection(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  mode: 'add' | 'remove' | 'replace',  selection?: Array<string>  }
        ): Promise<Response> {
            const defaultParams = { 
                selection: null,
            }
            
            return rpcClient.call('NodeService.updateDataPointSelection', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * Provides metadata and contents of node categories.
         * @param {Array<string>} categoryPath 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NoSuchElementException} The requested element was not found.
         */
        getNodeCategory(
        	params: { categoryPath: Array<string>  }
        ): Promise<NodeCategory> {
            const defaultParams = { 
            }
            
            return rpcClient.call('NodeRepositoryService.getNodeCategory', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Given a node, a port and a node-relation it recommends a certain number of compatible nodes the user might want to add next to its workflow. If queried with no node, no port and no node-relation, it recommends the most relevant source nodes, that naturally have no predecessor.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} [nodeId] The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} [portIdx] The port index to be used.
         * @param {number} [nodesLimit] The maximum number of node recommendations to return.
         * @param {'PREDECESSORS' | 'SUCCESSORS'} [nodeRelation] The relation between connected nodes, either predecessors or succesors
         * @param {boolean} [fullTemplateInfo] If true, the result will contain the full information for nodes/components (such as icon and port information). Otherwise only minimal information (such as name) will be included and the others omitted.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {OperationNotAllowedException} If the an operation is not allowed, e.g., because it&#39;s not applicable.
         */
        getNodeRecommendations(
        	params: { projectId: string,  workflowId: string,  nodeId?: string,  portIdx?: number,  nodesLimit?: number,  nodeRelation?: 'PREDECESSORS' | 'SUCCESSORS',  fullTemplateInfo?: boolean  }
        ): Promise<Array<NodeTemplate>> {
            const defaultParams = { 
                nodeId: null,
                portIdx: null,
                nodesLimit: null,
                nodeRelation: null,
                fullTemplateInfo: null,
            }
            
            return rpcClient.call('NodeRepositoryService.getNodeRecommendations', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
            
            return rpcClient.call('NodeRepositoryService.getNodeTemplates', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns a pre-defined set of groups (defined by tags) and nodes per group (the most frequently used ones in that group).
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
            
            return rpcClient.call('NodeRepositoryService.getNodesGroupedByTags', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Searches for nodes (and components) in the node repository.
         * @param {string} [q] The term to search for.
         * @param {Array<string>} [tags] A list of tags. Only nodes/components having any/all tags will be included in the search result.
         * @param {boolean} [allTagsMatch] If true, only the nodes/components that have all of the given tags are included in the search result. Otherwise nodes/components that have at least one of the given tags are included.
         * @param {number} [offset] Number of nodes/components to be skipped in the search result (for pagination).
         * @param {number} [limit] The maximum number of nodes/components in the search result (mainly for pagination).
         * @param {boolean} [fullTemplateInfo] If true, the result will contain the full information for nodes/components (such as icon and port information). Otherwise only minimal information (such as name) will be included and the others omitted.
         * @param {string} [portTypeId] The port type ID of the port type all returned nodes (and components) have to be compatible with.
         * @param {'PREDECESSORS' | 'SUCCESSORS'} [nodeRelation] The relation between connected nodes, either predecessors or succesors
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        searchNodes(
        	params: { q?: string,  tags?: Array<string>,  allTagsMatch?: boolean,  offset?: number,  limit?: number,  fullTemplateInfo?: boolean,  portTypeId?: string,  nodeRelation?: 'PREDECESSORS' | 'SUCCESSORS'  }
        ): Promise<NodeSearchResult> {
            const defaultParams = { 
                q: null,
                tags: null,
                allTagsMatch: null,
                offset: null,
                limit: null,
                fullTemplateInfo: null,
                portTypeId: null,
                nodeRelation: null,
            }
            
            return rpcClient.call('NodeRepositoryService.searchNodes', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        callPortDataService(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number,  serviceType: 'initial_data' | 'data',  dataServiceRequest?: string  }
        ): Promise<string> {
            const defaultParams = { 
                dataServiceRequest: null,
            }
            
            return rpcClient.call('PortService.callPortDataService', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * De-activates all data services associated with the port view.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} portIdx The port index to be used.
         * @param {number} viewIdx The index of the specific port view to obtain
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        deactivatePortDataServices(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('PortService.deactivatePortDataServices', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns all the information on a port data value view required to render it.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} portIdx The port index to be used.
         * @param {number} rowIdx The row index to be used.
         * @param {number} colIdx The column index to be used.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        getDataValueView(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  rowIdx: number,  colIdx: number  }
        ): Promise<any> {
            const defaultParams = { 
            }
            
            return rpcClient.call('PortService.getDataValueView', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        getPortView(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number  }
        ): Promise<any> {
            const defaultParams = { 
            }
            
            return rpcClient.call('PortService.getPortView', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Updates the data point selection (aka hiliting) for a single port as specified.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {string} nodeId The ID of a node. The node-id format: Node IDs always start with &#39;root&#39; and optionally followed by numbers separated by &#39;:&#39; referring to nested nodes/subworkflows,e.g. root:3:6:4. Nodes within components require an additional trailing &#39;0&#39;, e.g. &#39;root:3:6:0:4&#39; (if &#39;root:3:6&#39; is a component).
         * @param {number} portIdx The port index to be used.
         * @param {number} viewIdx The index of the specific port view to obtain
         * @param {'add' | 'remove' | 'replace'} mode Whether to add, remove or replace the data point selection.
         * @param {Array<string>} [selection] A list of strings that are translated to the row keys affected by the data point selection modification.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NodeNotFoundException} The requested node was not found.
         */
        updateDataPointSelection(
        	params: { projectId: string,  workflowId: string,  nodeId: string,  portIdx: number,  viewIdx: number,  mode: 'add' | 'remove' | 'replace',  selection?: Array<string>  }
        ): Promise<Response> {
            const defaultParams = { 
                selection: null,
            }
            
            return rpcClient.call('PortService.updateDataPointSelection', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * Create a new space within a given space provider.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} spaceGroupName Identifier name of a space-group.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        createSpace(
        	params: { spaceProviderId: string,  spaceGroupName: string  }
        ): Promise<Space> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.createSpace', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Create a new workflow within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {string} itemName Name given to a space item.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        createWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string,  itemName: string  }
        ): Promise<SpaceItem> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.createWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Create a new workflow group within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        createWorkflowGroup(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<SpaceItem> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.createWorkflowGroup', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Deletes items from the space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {Array<string>} itemIds A list of identifiers of items in the space.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        deleteItems(
        	params: { spaceId: string,  spaceProviderId: string,  itemIds: Array<string>  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.deleteItems', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Deletes job from the space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {string} jobId The ID of the job to delete
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        deleteJobsForWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string,  jobId: string  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.deleteJobsForWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Deletes schedule from the space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {string} scheduleId The ID of the schedule to delete
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        deleteSchedulesForWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string,  scheduleId: string  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.deleteSchedulesForWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns the spaces provided by this space-provider.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         * @throws {NetworkException} If a Gateway service call failed due to a network error.
         */
        getSpaceGroups(
        	params: { spaceProviderId: string  }
        ): Promise<Array<SpaceGroup>> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.getSpaceGroups', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Lists the available jobs for the given workflow.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        listJobsForWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<Array<any>> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.listJobsForWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Lists the available schedules for the given workflow.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        listSchedulesForWorkflow(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<Array<any>> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.listSchedulesForWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Get shallow list of workflows, components and data-files within a given workflow group.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         * @throws {NetworkException} If a Gateway service call failed due to a network error.
         */
        listWorkflowGroup(
        	params: { spaceId: string,  spaceProviderId: string,  itemId: string  }
        ): Promise<WorkflowGroupContent> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.listWorkflowGroup', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Move or copy space items to a different workflow group within its space.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {Array<string>} itemIds A list of identifiers of items in the space.
         * @param {string} destWorkflowGroupItemId The destination workflow group item id, therefore the new parent.
         * @param {'noop' | 'autorename' | 'overwrite'} collisionHandling How to solve potential name collisions.
         * @param {boolean} copy Copy instead of move items.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        moveOrCopyItems(
        	params: { spaceId: string,  spaceProviderId: string,  itemIds: Array<string>,  destWorkflowGroupItemId: string,  collisionHandling: 'noop' | 'autorename' | 'overwrite',  copy: boolean  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.moveOrCopyItems', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Rename a space Item
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} itemId The unique identifier of the space item. If &#39;root&#39;, it refers to the root directory (workflow group).
         * @param {string} itemName Name given to a space item.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        renameItem(
        	params: { spaceProviderId: string,  spaceId: string,  itemId: string,  itemName: string  }
        ): Promise<SpaceItem> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.renameItem', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Rename a space
         * @param {string} spaceProviderId Identifies a space-provider.
         * @param {string} spaceId The unique identifier of the space (local workspace, hub space). If &#39;local&#39; it refers to the local workspace.
         * @param {string} spaceName Name given to a space.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        renameSpace(
        	params: { spaceProviderId: string,  spaceId: string,  spaceName: string  }
        ): Promise<Space> {
            const defaultParams = { 
            }
            
            return rpcClient.call('SpaceService.renameSpace', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
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
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        executeWorkflowCommand(
        	params: { projectId: string,  workflowId: string,  workflowCommand: WorkflowCommand  }
        ): Promise<CommandResult> {
            const defaultParams = { 
            }
            
            return rpcClient.call('WorkflowService.executeWorkflowCommand', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns the node IDs of all updatable linked components present on a workflow, even if they are deeply nested.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NotASubWorkflowException} The requested node is not a sub-workflow (i.e. a meta- or sub-node), but is required to be.
         * @throws {NodeNotFoundException} The requested node was not found.
         * @throws {InvalidRequestException} If the request is invalid for a reason.
         */
        getUpdatableLinkedComponents(
        	params: { projectId: string,  workflowId: string  }
        ): Promise<Array<NodeIdAndIsExecuted>> {
            const defaultParams = { 
            }
            
            return rpcClient.call('WorkflowService.getUpdatableLinkedComponents', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Retrieves the complete structure (sub-)workflows.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {boolean} [includeInteractionInfo] Whether to enclose information that is required when the user is interacting with the returned workflow. E.g. the allowed actions (reset, execute, cancel) for contained nodes and the entire workflow itself.
         * @param {string} [version] The version identifier. &#x60;null&#x60; corresponds to the current-state (working area).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {NotASubWorkflowException} The requested node is not a sub-workflow (i.e. a meta- or sub-node), but is required to be.
         * @throws {NodeNotFoundException} The requested node was not found.
         */
        getWorkflow(
        	params: { projectId: string,  workflowId: string,  includeInteractionInfo?: boolean,  version?: string  }
        ): Promise<WorkflowSnapshot> {
            const defaultParams = { 
                includeInteractionInfo: null,
                version: null,
            }
            
            return rpcClient.call('WorkflowService.getWorkflow', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Returns the current state of the workflow monitor.
         * @param {string} projectId ID of the workflow-project.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getWorkflowMonitorState(
        	params: { projectId: string  }
        ): Promise<WorkflowMonitorStateSnapshot> {
            const defaultParams = { 
            }
            
            return rpcClient.call('WorkflowService.getWorkflowMonitorState', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Re-does the last command from the redo-stack.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        redoWorkflowCommand(
        	params: { projectId: string,  workflowId: string  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('WorkflowService.redoWorkflowCommand', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
        /**
         * Un-does the last command from the undo-stack.
         * @param {string} projectId ID of the workflow-project.
         * @param {string} workflowId The ID of a workflow which has the same format as a node-id.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         * @throws {ServiceCallException} If a Gateway service call failed for some reason.
         */
        undoWorkflowCommand(
        	params: { projectId: string,  workflowId: string  }
        ): Promise<Response> {
            const defaultParams = { 
            }
            
            return rpcClient.call('WorkflowService.undoWorkflowCommand', { ...defaultParams, ...params }).catch(e => { throw mapToExceptionClass(e) });
        },
    }
};


const WorkflowCommandApiWrapper = function(rpcClient: RPCClient, configuration: Configuration) {
  const identity = <T>(response: T) => response;
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
     * Remove all connections among the selected workflow parts.
     */
	AutoDisconnect(
		params: { projectId: string, workflowId: string } & Omit<AutoDisconnectCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AutoDisconnect }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Automatically connects all the nodes / port bars selected.
     */
	AutoConnect(
		params: { projectId: string, workflowId: string } & Omit<AutoConnectCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AutoConnect }
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
     * Adds a new component to the workflow.
     */
	AddComponent(
		params: { projectId: string, workflowId: string } & Omit<AddComponentCommand, 'kind'>
    ): Promise<AddComponentResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AddComponent }
		}) as Promise<AddComponentResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Insert a new bendpoint on a given connection.
     */
	AddBendpoint(
		params: { projectId: string, workflowId: string } & Omit<AddBendpointCommand, 'kind'>
    ): Promise<CommandResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.AddBendpoint }
		}) as Promise<CommandResult>;
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
     * Copy selected workflow parts and serialize to workflow definition format. This command only returns the serialized workflow parts.
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
     * Updates the text and/or the border color of a workflow annotation. Either one can be &#39;null&#39;, but never both of them.
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

 	/**
     * Update the metadata of a workflow project.
     */
	UpdateProjectMetadata(
		params: { projectId: string, workflowId: string } & Omit<UpdateProjectMetadataCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateProjectMetadata }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Update the metadata of a component.
     */
	UpdateComponentMetadata(
		params: { projectId: string, workflowId: string } & Omit<UpdateComponentMetadataCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateComponentMetadata }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Updates a components link information or unlinks a component
     */
	UpdateComponentLinkInformation(
		params: { projectId: string, workflowId: string } & Omit<UpdateComponentLinkInformationCommand, 'kind'>
    ): Promise<unknown> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateComponentLinkInformation }
		});
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Sets the bounds (x,y,width,height) of a metanode ports bar.
     */
	TransformMetanodePortsBar(
		params: { projectId: string, workflowId: string } & Omit<TransformMetanodePortsBarCommand, 'kind'>
    ): Promise<CommandResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.TransformMetanodePortsBar }
		}) as Promise<CommandResult>;
		return postProcessCommandResponse(commandResponse);
	},	

 	/**
     * Updates all the linked component, returning a success state at the end.
     */
	UpdateLinkedComponents(
		params: { projectId: string, workflowId: string } & Omit<UpdateLinkedComponentsCommand, 'kind'>
    ): Promise<UpdateLinkedComponentsResult> {
    	const { projectId, workflowId, ...commandParams } = params;
		const commandResponse = workflow(rpcClient).executeWorkflowCommand({
            projectId: params.projectId,
            workflowId: params.workflowId,
            workflowCommand: { ...commandParams, kind: WorkflowCommand.KindEnum.UpdateLinkedComponents }
		}) as Promise<UpdateLinkedComponentsResult>;
		return postProcessCommandResponse(commandResponse);
	},	

  }
}

export type EventParams =
    | (WorkflowChangedEventType & { typeId: 'WorkflowChangedEventType' })
    | (AppStateChangedEventType & { typeId: 'AppStateChangedEventType' })
    | (UpdateAvailableEventType & { typeId: 'UpdateAvailableEventType' })
    | (NodeRepositoryLoadingProgressEventType & { typeId: 'NodeRepositoryLoadingProgressEventType' })
    | (ProjectDisposedEventType & { typeId: 'ProjectDisposedEventType' })
    | (WorkflowMonitorStateChangeEventType & { typeId: 'WorkflowMonitorStateChangeEventType' })
    | (SpaceItemChangedEventType & { typeId: 'SpaceItemChangedEventType' })
;

export interface EventHandlers {
    WorkflowChangedEvent?(payload: WorkflowChangedEvent): void;
    CompositeEvent?(payload: CompositeEvent): void;
    ProjectDirtyStateEvent?(payload: ProjectDirtyStateEvent): void;
    AppStateChangedEvent?(payload: AppStateChangedEvent): void;
    UpdateAvailableEvent?(payload: UpdateAvailableEvent): void;
    NodeRepositoryLoadingProgressEvent?(payload: NodeRepositoryLoadingProgressEvent): void;
    ShowToastEvent?(payload: ShowToastEvent): void;
    ProjectDisposedEvent?(payload: ProjectDisposedEvent): void;
    WorkflowMonitorStateChangeEvent?(payload: WorkflowMonitorStateChangeEvent): void;
    SpaceItemChangedEvent?(payload: SpaceItemChangedEvent): void;
    SelectionEvent?(payload: SelectionEvent): void;
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
    const rpcClient = configuration.createRPCClient();

    const api = { 
        application: application(rpcClient),
        component: component(rpcClient),
        event: event(rpcClient),
        kai: kai(rpcClient),
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
