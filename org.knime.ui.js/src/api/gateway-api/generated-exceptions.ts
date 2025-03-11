export const KNOWN_EXECUTOR_EXCEPTIONS = ["ServiceCallException", "NetworkException", "NodeDescriptionNotAvailableException", "NodeNotFoundException", "NoSuchElementException", "NotASubWorkflowException", "InvalidRequestException", "OperationNotAllowedException", "IOException", "CollisionException", ] as const;
export type KnownExecutorExceptions = (typeof KNOWN_EXECUTOR_EXCEPTIONS)[number];

export class GatewayException extends Error {}
export class KnownGatewayException extends GatewayException {
    constructor(e: { message: string }) {
        super(e.message, { cause: e })
    }
}
export class UnknownGatewayException extends GatewayException {
    data: Object;
    constructor(e: { message: string, data: Object }) {
        super(e.message, { cause: e })
        this.data = e.data;
    }
}
export class RequiredError extends KnownGatewayException {}
export class ServiceCallException extends KnownGatewayException {}
export class NetworkException extends KnownGatewayException {}
export class NodeDescriptionNotAvailableException extends KnownGatewayException {}
export class NodeNotFoundException extends KnownGatewayException {}
export class NoSuchElementException extends KnownGatewayException {}
export class NotASubWorkflowException extends KnownGatewayException {}
export class InvalidRequestException extends KnownGatewayException {}
export class OperationNotAllowedException extends KnownGatewayException {}
export class IOException extends KnownGatewayException {}
export class CollisionException extends KnownGatewayException {}

function isKnownGatewayException(e: unknown): e is { message: string, data: string } {
    return (
        e !== null &&
	    typeof e === "object" &&
	    "code" in e &&
	    typeof e.code === "number" &&
	    e.code === -32600 &&
	    "data" in e &&
	    typeof e.data === "string" &&
	    (KNOWN_EXECUTOR_EXCEPTIONS as ReadonlyArray<string>).includes(e.data)
    );
}

function isUnknownGatewayException(e: unknown): e is { message: string, data: Object } {
    return (
        e !== null &&
        typeof e === "object" &&
        "code" in e &&
        typeof e.code === "number" &&
        e.code === -32601 &&
        "data" in e &&
        typeof e.data === "object"
    );
}

const exceptionClassMapping = {
    ServiceCallException,
    NetworkException,
    NodeDescriptionNotAvailableException,
    NodeNotFoundException,
    NoSuchElementException,
    NotASubWorkflowException,
    InvalidRequestException,
    OperationNotAllowedException,
    IOException,
    CollisionException,
} as const;

export function mapToExceptionClass(e: unknown) {
    if (isKnownGatewayException(e)) {
        return new exceptionClassMapping[e.data](e);
    } else if (isUnknownGatewayException(e)) {
        return new UnknownGatewayException(e);
    } else {
        return e;
    }
}