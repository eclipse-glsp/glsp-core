/********************************************************************************
 * Copyright (c) 2019-2026 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import {
    Action,
    ActionDispatcher,
    ActionHandler,
    ActionHandlerRegistry,
    Deferred,
    EMPTY_ROOT,
    GModelRoot,
    HandleActionResult,
    IActionDispatcher,
    MaybePromise,
    OperationResponseAction,
    RejectAction,
    RequestAction,
    RequestRejectedError,
    ResponseAction,
    SetModelAction,
    TYPES
} from '@eclipse-glsp/sprotty';
import { inject, injectable } from 'inversify';
import { GLSPActionHandlerRegistry } from './action-handler-registry';
import { IGModelRootListener } from './editor-context-service';
import { OptionalAction } from './model/glsp-model-source';
import { ModelInitializationConstraint } from './model/model-initialization-constraint';

/**
 * An `Operation` dispatched as request whose response has been received, but whose completion is deferred until the
 * model has been updated to the resulting revision (see {@link GLSPActionDispatcher.completeOperation}).
 */
export interface DeferredOperation {
    /** The model revision the operation waits for before it is completed. */
    revision: number;
    /** Completes the operation, i.e. resolves the corresponding request. */
    complete: () => void;
}

@injectable()
export class GLSPActionDispatcher extends ActionDispatcher implements IGModelRootListener, IActionDispatcher {
    protected readonly timeouts: Map<string, NodeJS.Timeout> = new Map();
    protected initializedConstraint = false;

    @inject(ModelInitializationConstraint)
    protected initializationConstraint: ModelInitializationConstraint;

    @inject(ActionHandlerRegistry)
    protected override actionHandlerRegistry: ActionHandlerRegistry;

    /** @deprecated No longer in used. The {@link ActionHandlerRegistry} is now directly injected */
    @inject(TYPES.ActionHandlerRegistryProvider) protected override actionHandlerRegistryProvider: () => Promise<ActionHandlerRegistry>;
    protected postUpdateQueue: Action[] = [];
    /** The revision of the current model root, updated on every model root change. */
    protected modelRevision?: number;
    /** All operations whose completion is deferred until the model has been updated, by request id. */
    protected readonly deferredOperations = new Map<string, DeferredOperation>();

    protected initializeDeferred = new Deferred<void>();

    override initialize(): Promise<void> {
        if (!this.initialized) {
            this.initialized = this.initializeDeferred.promise;
            this.doInitialize();
        }
        return this.initialized;
    }

    protected async doInitialize(): Promise<void> {
        try {
            if (this.actionHandlerRegistry instanceof GLSPActionHandlerRegistry) {
                this.actionHandlerRegistry.initialize();
            }
            this.handleAction(SetModelAction.create(EMPTY_ROOT)).catch(() => {
                /* Logged in handleAction method */
            });
            this.startModelInitialization();
            this.initializeDeferred.resolve();
        } catch (error) {
            this.initializeDeferred.reject(error);
        }
    }

    protected startModelInitialization(): void {
        if (!this.initializedConstraint) {
            this.logger.log(this, 'Starting model initialization mode');
            this.initializationConstraint.onInitialized(() => this.logger.log(this, 'Model initialization completed'));
            this.initializedConstraint = true;
        }
    }

    onceModelInitialized(): Promise<void> {
        return this.initializationConstraint.onInitialized();
    }

    hasHandler(action: Action): boolean {
        return this.actionHandlerRegistry.get(action.kind).length > 0;
    }

    /**
     * Processes all given actions, by dispatching them to the corresponding handlers, after the model initialization is completed.
     *
     * @param actions The actions that should be dispatched after the model initialization
     */
    dispatchOnceModelInitialized(...actions: Action[]): void {
        this.initializationConstraint.onInitialized(() => this.dispatchAll(actions));
    }

    /**
     * Processes all given actions, by dispatching them to the corresponding handlers, after the next model update.
     * The given actions are queued until the next model update cycle has been completed i.e.
     * the `EditorContextService.onModelRootChanged` event is triggered.
     *
     * @param actions The actions that should be dispatched after the next model update
     */
    dispatchAfterNextUpdate(...actions: Action[]): void {
        this.postUpdateQueue.push(...actions);
    }

    modelRootChanged(root: Readonly<GModelRoot>): void {
        this.updateModelRevision(root.revision);
        if (this.postUpdateQueue.length === 0) {
            return;
        }

        const toDispatch = [...this.postUpdateQueue];
        this.postUpdateQueue = [];
        this.dispatchAll(toDispatch);
    }

    override async dispatch(action: Action): Promise<void> {
        const result = await super.dispatch(action);
        this.initializationConstraint.notifyDispatched(action);
        return result;
    }

    protected override handleAction(action: Action): Promise<void> {
        return ResponseAction.hasValidResponseId(action) ? this.handleResponseAction(action) : this.doHandleAction(action);
    }

    protected async handleResponseAction(action: ResponseAction): Promise<void> {
        const requestId = action.responseId;
        const request = this.requests.get(requestId);
        if (!request) {
            this.clearRequestTimeout(requestId);
            if (OperationResponseAction.is(action) && !this.hasHandler(action)) {
                // Pure acknowledgement of an operation that is no longer pending (e.g. timed out) => nothing to handle
                this.logger.log(this, 'No matching request for operation response, dropping it', action);
                return;
            }
            // No pending request: re-dispatch as a normal action.
            this.logger.log(this, 'No matching request for response, dispatch normally', action);
            action.responseId = '';
            return this.handleAction(action);
        }

        if (OperationResponseAction.is(action)) {
            // The request and its timeout stay registered until the operation is completed, so that the timeout of
            // `requestUntil` still applies if the model never reaches the response revision.
            this.completeOperation(requestId, action.revision, () => {
                if (this.requests.get(requestId) === request) {
                    this.requests.delete(requestId);
                    this.clearRequestTimeout(requestId);
                    request.resolve(action);
                }
            });
            return;
        }

        this.requests.delete(requestId);
        this.clearRequestTimeout(requestId);
        if (RejectAction.is(action)) {
            request.reject(new RequestRejectedError(action));
            this.logger.warn(this, `Request with id ${requestId} failed.`, action.message, action.detail);
        } else {
            request.resolve(action);
        }
    }

    protected clearRequestTimeout(requestId: string): void {
        const timeout = this.timeouts.get(requestId);
        if (timeout !== undefined) {
            clearTimeout(timeout);
            this.timeouts.delete(requestId);
        }
    }

    /**
     * Completes the operation with the given request id once the model has been updated to (at least) the given revision.
     * Operation responses carry the model revision that results from the operation. With client-side layout, the server sends
     * the corresponding model update only after the client has returned the computed bounds, i.e. after the response.
     * Deferring the completion of the operation until the revision is reached ensures that callers awaiting an operation
     * always observe the updated model. Deferred operations are completed by {@link updateModelRevision}.
     * The timeout of operations dispatched via {@link requestUntil} still applies while the completion is deferred.
     *
     * @param requestId The request id of the operation.
     * @param revision The model revision to wait for. If `undefined`, the operation is completed immediately.
     * @param complete Completes the operation, i.e. resolves the corresponding request.
     */
    protected completeOperation(requestId: string, revision: number | undefined, complete: () => void): void {
        if (revision === undefined || (this.modelRevision !== undefined && this.modelRevision >= revision)) {
            complete();
            return;
        }
        this.logger.log(
            this,
            `Deferring completion of operation ${requestId} until model revision ${revision} (current: ${this.modelRevision})`
        );
        this.deferredOperations.set(requestId, { revision, complete });
    }

    /**
     * Updates the current model revision and completes all deferred operations for which the revision has been reached
     * (see {@link completeOperation}). If the revision decreased (e.g. because the model has been reloaded), all deferred
     * operations are completed, as the awaited revision will never be reached.
     */
    protected updateModelRevision(revision: number | undefined): void {
        const previousRevision = this.modelRevision;
        this.modelRevision = revision;
        const reset = revision === undefined || (previousRevision !== undefined && revision < previousRevision);
        for (const [requestId, operation] of this.deferredOperations) {
            if (reset || revision >= operation.revision) {
                this.deferredOperations.delete(requestId);
                this.logger.log(this, `Operation ${requestId} completed at model revision ${revision}`);
                operation.complete();
            }
        }
    }

    protected doHandleAction(action: Action): Promise<void> {
        const handlers = this.actionHandlerRegistry.get(action.kind);
        return handlers.length === 0 ? this.handleActionWithoutHandler(action) : this.handleActionWithHandler(action, handlers);
    }

    protected async handleActionWithoutHandler(action: Action): Promise<void> {
        if (OptionalAction.is(action) && !this.hasHandler(action)) {
            return;
        }
        this.logger.warn(this, 'Missing handler for action', action);
        const error = new Error(`Missing handler for action '${action.kind}'`);
        if (RequestAction.is(action)) {
            const request = this.requests.get(action.requestId);
            if (request !== undefined) {
                this.requests.delete(action.requestId);
                request.reject(error);
            }
        }
        throw error;
    }

    protected async handleActionWithHandler(action: Action, handlers: ActionHandler[]): Promise<void> {
        this.logger.log(this, 'Handle', action);
        // No `await` inside the loop: invoke handlers in one burst and await their results collectively.
        const handlerResults: PromiseLike<unknown>[] = [];
        for (const handler of handlers) {
            const maybeResult = handler.handle(action);
            if (MaybePromise.isPromise(maybeResult)) {
                handlerResults.push(maybeResult.then(result => this.processHandlerResult(result)));
            } else {
                const resultPromise = this.processHandlerResult(maybeResult);
                if (resultPromise) {
                    handlerResults.push(resultPromise);
                }
            }
        }
        await Promise.all(handlerResults);
    }

    protected processHandlerResult(result: HandleActionResult): Promise<unknown> | undefined {
        if (Action.is(result)) {
            return this.dispatch(result);
        }
        if (result !== undefined) {
            this.blockUntil = result.blockUntil;
            return this.commandStack.execute(result);
        }
        return undefined;
    }

    override request<Res extends ResponseAction>(action: RequestAction<Res>): Promise<Res> {
        if (!action.requestId || action.requestId === '') {
            action.requestId = RequestAction.generateRequestId();
        }
        return super.request(action);
    }

    /**
     * Dispatch a request and waits for a response until the timeout given in `timeoutMs` has
     * been reached. The returned promise is resolved when a response with matching identifier
     * is dispatched or when the timeout has been reached. That response is _not_ passed to the
     * registered action handlers. Instead, it is the responsibility of the caller of this method
     * to handle the response properly. For example, it can be sent to the registered handlers by
     * passing it again to the `dispatch` method.
     * If `rejectOnTimeout` is set to false (default) the returned promise will be resolved with
     * no value, otherwise it will be rejected.
     */
    requestUntil<Res extends ResponseAction>(
        action: RequestAction<Res>,
        timeoutMs: number = action.timeout ?? 2000,
        rejectOnTimeout = false
    ): Promise<Res | undefined> {
        if (!action.requestId || action.requestId === '') {
            action.requestId = RequestAction.generateRequestId();
        }
        // Stamp the effective timeout onto the action so the receiving side
        // (handleServerRequest/handleClientRequest) can respect it.
        action.timeout = timeoutMs;

        const requestId = action.requestId;
        const timeout = setTimeout(() => {
            const deferred = this.requests.get(requestId);
            if (deferred !== undefined) {
                clearTimeout(timeout);
                this.requests.delete(requestId);

                const notification = 'Request ' + requestId + ' (' + action + ') time out after ' + timeoutMs + 'ms.';
                if (rejectOnTimeout) {
                    deferred.reject(notification);
                } else {
                    this.logger.info(this, notification);
                    deferred.resolve();
                }
            }
        }, timeoutMs);
        this.timeouts.set(requestId, timeout);

        const result = super.request<Res>(action);
        // handleResponseAction only clears the timeout on the response path; clear it here on every
        // other settle path (timeout, rejection, missing handler) so the timer and map entry can't leak.
        const clearRequestTimeout = (): void => {
            this.deferredOperations.delete(requestId);
            this.clearRequestTimeout(requestId);
        };
        result.then(clearRequestTimeout, clearRequestTimeout);
        return result;
    }
}
