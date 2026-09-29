/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
import { Action, MaybePromise, MessageAction, Operation, OperationResponseAction, RequestAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { ActionDispatcher } from '../actions/action-dispatcher';
import { ActionHandler } from '../actions/action-handler';
import { Command } from '../command/command';
import { CommandStack } from '../command/command-stack';
import { Operations } from '../di/service-identifiers';
import { ModelState } from '../model/model-state';
import { ModelSubmissionHandler } from '../model/model-submission-handler';
import { GLSPServerError } from '../utils/glsp-server-error';
import { Logger } from '../utils/logger';
import { OperationHandler } from './operation-handler';
import { OperationHandlerRegistry } from './operation-handler-registry';

@injectable()
export class OperationActionHandler implements ActionHandler {
    @inject(OperationHandlerRegistry)
    protected operationHandlerRegistry: OperationHandlerRegistry;

    @inject(ModelSubmissionHandler)
    protected modelSubmissionHandler: ModelSubmissionHandler;

    @inject(ModelState)
    protected modelState: ModelState;

    @inject(CommandStack)
    protected commandStack: CommandStack;

    @inject(ActionDispatcher)
    protected actionDispatcher: ActionDispatcher;

    @inject(Logger)
    protected logger: Logger;

    constructor(@inject(Operations) readonly actionKinds: string[]) {}

    /**
     * Executes the given operation and returns the resulting model submission actions followed by the
     * {@link OperationResponseAction} (see {@link createResponse}). With client-side layout the model update itself is only sent
     * after the client has returned the computed bounds, the `revision` of the response allows the client to wait for it.
     * If the operation cannot be executed (e.g. because the model is readonly or the execution fails) an error is thrown
     * instead. For operations dispatched as request this results in a `RejectAction` being sent to the requesting party.
     * Operations dispatched as plain action in readonly mode are not considered a failure, the dispatching party is only
     * notified with a warning (see {@link handleReadonly}).
     */
    async execute(action: Operation): Promise<Action[]> {
        if (!this.handles(action)) {
            throw new GLSPServerError(`Unhandled operation kind: ${action.kind}`);
        }
        if (this.modelState.isReadonly) {
            return this.handleReadonly(action);
        }
        return this.executeOperation(action);
    }

    /**
     * Invoked if the given operation is received while the model is readonly. Operations dispatched as request are rejected,
     * so that the requesting party can react to it. Operations dispatched as plain action (e.g. a drag of the user) are
     * answered with a warning `MessageAction` instead of being reported as error.
     */
    protected handleReadonly(operation: Operation): Action[] {
        const message = `Server is in readonly-mode! Could not execute operation: ${operation.kind}`;
        if (RequestAction.hasValidRequestId(operation)) {
            throw new GLSPServerError(message);
        }
        return [MessageAction.create(message, { severity: 'WARNING' })];
    }

    protected executeOperation(operation: Operation): MaybePromise<Action[]> {
        const operationHandler = this.operationHandlerRegistry.getOperationHandler(operation);
        if (operationHandler) {
            return this.executeHandler(operation, operationHandler);
        }
        return this.createResponse(operation);
    }

    protected async executeHandler(operation: Operation, handler: OperationHandler): Promise<Action[]> {
        const command = await handler.execute(operation);
        const result: Action[] = [];
        if (command) {
            try {
                await this.executeCommand(command);
                result.push(...(await this.submitModel()));
            } catch (error) {
                return this.handleOperationError(operation, error);
            }
        }
        try {
            result.push(...(await this.createResponse(operation, handler, command)));
        } catch (error) {
            return this.handleResponseError(operation, result, error);
        }
        return result;
    }

    /**
     * Invoked if the response of the given operation could not be created (see {@link OperationHandler.createResponse}).
     * At this point the command has already been executed, so the model submission actions are dispatched anyway to keep the
     * client in sync with the server. Afterwards the error is rethrown, i.e. the operation is rejected although its changes
     * have been applied (and can be undone).
     */
    protected async handleResponseError(operation: Operation, submission: Action[], error: unknown): Promise<never> {
        try {
            await this.actionDispatcher.dispatchAll(submission);
        } catch (dispatchError) {
            this.logger.error(
                `Failed to dispatch the model update after the response creation for '${operation.kind}' failed`,
                dispatchError
            );
        }
        throw error;
    }

    protected async executeCommand(command: Command): Promise<void> {
        return this.commandStack.execute(command);
    }

    protected submitModel(): MaybePromise<Action[]> {
        return this.modelSubmissionHandler.submitModel('operation');
    }

    /**
     * Creates the response that answers the successful execution of the given operation. The response itself is created by the
     * given operation handler (see {@link OperationHandler.createResponse}), this method stamps it with the current model revision.
     * Only operations that have been dispatched as request (i.e. have a non-empty `requestId`) are answered.
     * Operations dispatched as plain actions (e.g. internally on the server) do not expect a response.
     *
     * @param operation The executed operation.
     * @param handler The operation handler that executed the operation, if any.
     * @param command The command that has been executed for the operation, if any.
     */
    protected async createResponse(operation: Operation, handler?: OperationHandler, command?: Command): Promise<Action[]> {
        if (!RequestAction.hasValidRequestId(operation)) {
            return [];
        }
        const response = handler ? await handler.createResponse(operation, command) : OperationResponseAction.create();
        // Copy the response instead of mutating it, handlers might return a shared instance
        const stamped: OperationResponseAction = { ...response, revision: this.modelState.root.revision };
        return [stamped];
    }

    /**
     * Invoked if the execution of the command of the given operation (or the subsequent model submission) failed.
     * The (potentially partially modified) model state is resubmitted to ensure that the client stays in sync with the server.
     * Afterwards the error is rethrown so that it is propagated to the dispatching party.
     * Failures that occur before a command has been executed (e.g. in {@link OperationHandler.execute}) did not change the model,
     * they are propagated directly without resubmitting the model.
     */
    protected async handleOperationError(operation: Operation, error: unknown): Promise<never> {
        try {
            await this.actionDispatcher.dispatchAll(await this.submitModel());
        } catch (submitError) {
            this.logger.error(`Failed to resubmit the model after the failed execution of '${operation.kind}'`, submitError);
        }
        throw error;
    }

    handles(action: Action): boolean {
        return this.actionKinds.includes(action.kind);
    }

    /**
     *  @Deprecated Use {@link OperationHandlerRegistry#getOperationHandler(Operation) instead}.
     */

    static getOperationHandler(operation: Operation, registry: OperationHandlerRegistry): OperationHandler | undefined {
        return registry.getOperationHandler(operation);
    }
}
