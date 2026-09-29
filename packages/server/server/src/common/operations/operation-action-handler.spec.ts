/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
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
import { Action, ChangeBoundsOperation, MessageAction, OperationResponseAction, UpdateModelAction } from '@eclipse-glsp/protocol';
import { Container, ContainerModule } from 'inversify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionDispatcher } from '../actions/action-dispatcher';
import { Command } from '../command/command';
import { CommandStack } from '../command/command-stack';
import { Operations } from '../di/service-identifiers';
import { ModelState } from '../model/model-state';
import { ModelSubmissionHandler } from '../model/model-submission-handler';
import { StubActionDispatcher, StubLogger } from '../test/mock-util';
import { GLSPServerError } from '../utils/glsp-server-error';
import { Logger } from '../utils/logger';
import { OperationActionHandler } from './operation-action-handler';
import { OperationHandler } from './operation-handler';
import { OperationHandlerRegistry } from './operation-handler-registry';

describe('OperationActionHandler', () => {
    const updateModel = UpdateModelAction.create({ id: 'root', type: 'graph' });
    const command: Command = { execute: vi.fn(), undo: vi.fn(), redo: vi.fn() };

    let modelState: { isReadonly: boolean; root: { revision: number } };
    let operationHandler: { execute: ReturnType<typeof vi.fn>; createResponse: ReturnType<typeof vi.fn> };
    let commandStack: { execute: ReturnType<typeof vi.fn> };
    let submitModel: ReturnType<typeof vi.fn>;
    let actionDispatcher: StubActionDispatcher;
    let handler: OperationActionHandler;

    function createOperation(requestId = 'request_1'): ChangeBoundsOperation {
        return { ...ChangeBoundsOperation.create([]), requestId };
    }

    beforeEach(() => {
        modelState = { isReadonly: false, root: { revision: 5 } };
        operationHandler = { execute: vi.fn(() => command), createResponse: vi.fn(() => OperationResponseAction.create()) };
        commandStack = { execute: vi.fn() };
        submitModel = vi.fn((): Action[] => [updateModel]);
        actionDispatcher = new StubActionDispatcher();
        vi.spyOn(actionDispatcher, 'dispatchAll');

        const container = new Container();
        container.load(
            new ContainerModule(bind => {
                bind(Operations).toConstantValue([ChangeBoundsOperation.KIND]);
                bind(ModelState).toConstantValue(modelState);
                bind(CommandStack).toConstantValue(commandStack);
                bind(ActionDispatcher).toConstantValue(actionDispatcher);
                bind(Logger).toConstantValue(new StubLogger());
                bind(ModelSubmissionHandler).toConstantValue({ submitModel } as unknown as ModelSubmissionHandler);
                bind(OperationHandlerRegistry).toConstantValue({
                    getOperationHandler: () => operationHandler as unknown as OperationHandler
                } as unknown as OperationHandlerRegistry);
            })
        );
        handler = container.resolve(OperationActionHandler);
    });

    it('should return the model update followed by a response with the model revision', async () => {
        const operation = createOperation();
        const result = await handler.execute(operation);

        expect(commandStack.execute).toHaveBeenCalledWith(command);
        expect(operationHandler.createResponse).toHaveBeenCalledWith(operation, command);
        expect(result).toEqual([updateModel, OperationResponseAction.create({ revision: 5 })]);
    });

    it('should return the response created by the operation handler', async () => {
        const customResponse = { ...OperationResponseAction.create(), kind: 'customResponse', createdIds: ['node1'] };
        operationHandler.createResponse.mockReturnValue(customResponse);

        const result = await handler.execute(createOperation());

        expect(result).toEqual([updateModel, { ...customResponse, revision: 5 }]);
        expect(customResponse).not.toHaveProperty('revision');
    });

    it('should return an ok response if the operation handler does not create a command', async () => {
        operationHandler.execute.mockReturnValue(undefined);

        const result = await handler.execute(createOperation());

        expect(submitModel).not.toHaveBeenCalled();
        expect(operationHandler.createResponse).toHaveBeenCalledWith(expect.anything(), undefined);
        expect(result).toEqual([OperationResponseAction.create({ revision: 5 })]);
    });

    it('should not return a response for an operation that has not been dispatched as request', async () => {
        const result = await handler.execute(createOperation(''));

        expect(result).toEqual([updateModel]);
    });

    it('should only warn about operations dispatched as plain action in readonly mode', async () => {
        modelState.isReadonly = true;

        const result = await handler.execute(createOperation(''));

        expect(result).toEqual([expect.objectContaining({ kind: MessageAction.KIND, severity: 'WARNING' })]);
        expect(operationHandler.execute).not.toHaveBeenCalled();
    });

    it('should send the model update and rethrow if the response creation fails', async () => {
        const error = new Error('response failed');
        operationHandler.createResponse.mockRejectedValue(error);

        await expect(handler.execute(createOperation())).rejects.toBe(error);
        expect(commandStack.execute).toHaveBeenCalledWith(command);
        expect(actionDispatcher.dispatchAll).toHaveBeenCalledWith([updateModel]);
    });

    it('should reject operations in readonly mode', async () => {
        modelState.isReadonly = true;

        await expect(handler.execute(createOperation())).rejects.toBeInstanceOf(GLSPServerError);
        expect(operationHandler.execute).not.toHaveBeenCalled();
    });

    it('should resubmit the model and rethrow if the execution fails', async () => {
        const error = new Error('execution failed');
        commandStack.execute.mockRejectedValue(error);

        await expect(handler.execute(createOperation())).rejects.toBe(error);
        expect(actionDispatcher.dispatchAll).toHaveBeenCalledWith([updateModel]);
    });

    it('should rethrow without resubmitting the model if the operation handler fails', async () => {
        const error = new Error('handler failed');
        operationHandler.execute.mockRejectedValue(error);

        await expect(handler.execute(createOperation())).rejects.toBe(error);
        expect(submitModel).not.toHaveBeenCalled();
        expect(actionDispatcher.dispatchAll).not.toHaveBeenCalled();
    });

    it('should rethrow the original error if the model resubmission fails', async () => {
        const error = new Error('execution failed');
        commandStack.execute.mockRejectedValue(error);
        submitModel.mockImplementation(() => {
            throw new Error('submission failed');
        });

        await expect(handler.execute(createOperation())).rejects.toBe(error);
    });
});
