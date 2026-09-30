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
import {
    DiagramCapabilities,
    ActionMessage,
    ChangeBoundsOperation,
    DisposeClientSessionParameters,
    GLSPCapability,
    GLSPClientProxy,
    GLSPServerListener,
    InitializeClientSessionParameters,
    InitializeParameters,
    MessageAction,
    OperationResponseAction,
    RejectAction
} from '@eclipse-glsp/protocol';
import * as assert from 'assert';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { Container, ContainerModule } from 'inversify';
import { GlobalActionProvider } from '../actions/global-action-provider';
import { SessionCapabilityProvider } from '../capabilities/session-capability-provider';
import { ClientSession } from '../session/client-session';
import { ClientSessionManager } from '../session/client-session-manager';
import * as mock from '../test/mock-util';
import { GLSPServerError } from '../utils/glsp-server-error';
import { Logger } from '../utils/logger';
import { DefaultGLSPServer } from './glsp-server';

describe('test DefaultGLSPServer', () => {
    const container = new Container();
    const clientSessionId = 'myClientSession';
    const diagramType = 'myDiagram';
    const applicationId = 'Test';
    const protocolVersion = '2.0.0';
    const actionKinds = new Map<string, string[]>();
    actionKinds.set(diagramType, ['A1', 'A2']);
    const diagramCapabilities = new Map<string, DiagramCapabilities>();
    diagramCapabilities.set(diagramType, { [GLSPCapability.Popup]: true, [GLSPCapability.LabelEdit]: { validation: true } });
    const sessionManager = new mock.StubClientSessionManager();
    let spy_sessionManager_getOrCreate: MockInstance;
    let spy_sessionManager_dispose: MockInstance;
    const listener1 = new mock.StubGLSPServerListener();
    let spy_listener1_initialize: MockInstance;
    let spy_listener1_shutdown: MockInstance;
    const listener2 = new mock.StubGLSPServerListener();
    let spy_listener2_initialize: MockInstance;
    let spy_listener2_shutdown: MockInstance;

    container.load(
        new ContainerModule(bind => {
            bind(Logger).toConstantValue(new mock.StubLogger());
            bind(GLSPClientProxy).toConstantValue(new mock.StubGLSPClientProxy());
            bind(ClientSessionManager).toConstantValue(sessionManager);
            bind(GlobalActionProvider).toConstantValue(<GlobalActionProvider>{
                actionKinds,
                getDiagramCapabilities: async () => diagramCapabilities
            });
            bind(GLSPServerListener).toConstantValue(listener1);
        })
    );

    const glspServer = container.resolve(DefaultGLSPServer);

    beforeEach(() => {
        vi.restoreAllMocks();
        spy_sessionManager_getOrCreate = vi.spyOn(sessionManager, 'getOrCreateClientSession');
        spy_sessionManager_dispose = vi.spyOn(sessionManager, 'disposeClientSession');
        spy_listener1_initialize = vi.spyOn(listener1, 'serverInitialized');
        spy_listener1_shutdown = vi.spyOn(listener1, 'serverShutDown');
        spy_listener2_initialize = vi.spyOn(listener2, 'serverInitialized');
        spy_listener2_shutdown = vi.spyOn(listener2, 'serverShutDown');
    });

    it('Test calls before server initialization (should throw errors)', async () => {
        assert.rejects(() => glspServer.initializeClientSession({ clientSessionId: 'id', diagramType: 'type', clientActionKinds: [] }));
        assert.rejects(() => glspServer.disposeClientSession({ clientSessionId: 'id' }));
        assert.throws(() => glspServer.process({ clientId: 'id', action: { kind: 'action' } }));
    });

    it('addListener - add existing listener', () => {
        const originalSize = glspServer['serverListeners'].length;
        glspServer.addListener(listener1);
        expect(glspServer['serverListeners'].length).toBe(originalSize);
    });

    it('addListener - add new listener', () => {
        const originalSize = glspServer['serverListeners'].length;
        glspServer.addListener(listener2);
        expect(glspServer['serverListeners']).toContain(listener2);
        expect(glspServer['serverListeners'].length).toBe(originalSize + 1);
    });

    it('removeListener - remove non-existing listener', () => {
        const originalSize = glspServer['serverListeners'].length;
        glspServer.removeListener({});
        expect(glspServer['serverListeners'].length).toBe(originalSize);
    });

    it('removeListener - remove existing listener', () => {
        const originalSize = glspServer['serverListeners'].length;
        glspServer.removeListener(listener2);
        expect(glspServer['serverListeners'].length).toBe(originalSize - 1);
    });

    it('initialize - with wrong protocol version', async () => {
        const initializeParameters: InitializeParameters = { applicationId, protocolVersion: 'abc' };
        assert.rejects(glspServer.initialize(initializeParameters));
    });

    it('initialize - with correct parameters', async () => {
        const initializeParameters: InitializeParameters = { applicationId, protocolVersion };
        const result = await glspServer.initialize(initializeParameters);
        expect(result.protocolVersion).toBe(protocolVersion);
        expect(result.serverActions[diagramType]).toBe(actionKinds.get(diagramType));
        expect(result.capabilities?.diagramTypes?.[diagramType]).toEqual(diagramCapabilities.get(diagramType));
        expect(spy_listener1_initialize).toHaveBeenCalledWith(glspServer);
        expect(spy_listener2_initialize).not.toHaveBeenCalled();
    });

    it('initialize - subsequent call with same parameters', async () => {
        const initializeParameters: InitializeParameters = { applicationId, protocolVersion };
        const result = await glspServer.initialize(initializeParameters);
        expect(result.protocolVersion).toBe(protocolVersion);
        expect(result.serverActions[diagramType]).toBe(actionKinds.get(diagramType));
        expect(result.serverActions[diagramType]).toBe(actionKinds.get(diagramType));
    });

    it('initialize -  subsequent call with other parameters', async () => {
        const initializeParameters = { applicationId: 'someOtherApp', protocolVersion: 'AnotherProtocolVersion' };
        await assert.rejects(() => glspServer.initialize(initializeParameters));
    });

    it('initialize client session', async () => {
        const initializeClientSessionParameters: InitializeClientSessionParameters = {
            clientSessionId,
            diagramType,
            clientActionKinds: []
        };
        const result = await glspServer.initializeClientSession(initializeClientSessionParameters);
        expect(spy_sessionManager_getOrCreate).toHaveBeenCalledWith(initializeClientSessionParameters);
        // The stub session container does not provide a SessionCapabilityProvider
        expect(result.capabilities).toBeUndefined();
    });

    it('initialize client session - returns session capabilities resolved with session args', async () => {
        const sessionContainer = new Container();
        const provider: SessionCapabilityProvider = {
            getCapabilities: async args => ({ [GLSPCapability.Popup]: args?.readonly !== true }),
            updateCapabilities: async () => {}
        };
        sessionContainer.bind(SessionCapabilityProvider).toConstantValue(provider);
        spy_sessionManager_getOrCreate.mockReturnValue(mock.createClientSession(clientSessionId, diagramType, sessionContainer));
        const result = await glspServer.initializeClientSession({
            clientSessionId,
            diagramType,
            clientActionKinds: [],
            args: { readonly: true }
        });
        expect(result.capabilities).toEqual({ [GLSPCapability.Popup]: false });
    });

    it('dispose client session', async () => {
        const disposeClientSessionParameters: DisposeClientSessionParameters = {
            clientSessionId
        };
        await glspServer.disposeClientSession(disposeClientSessionParameters);
        expect(spy_sessionManager_dispose).toHaveBeenCalledWith(clientSessionId);
    });

    it('shutdown server', async () => {
        glspServer.shutdown();
        expect(spy_listener1_shutdown).toHaveBeenCalledWith(glspServer);
        expect(spy_listener2_shutdown).not.toHaveBeenCalled();
    });
});

describe('test DefaultGLSPServer operation processing', () => {
    const clientId = 'myClientSession';
    let clientProxy: mock.StubGLSPClientProxy;
    let actionDispatcher: mock.StubActionDispatcher;
    let glspServer: DefaultGLSPServer;

    function sentActions(): unknown[] {
        return vi.mocked(clientProxy.process).mock.calls.map(([message]: [ActionMessage]) => message.action);
    }

    beforeEach(async () => {
        clientProxy = new mock.StubGLSPClientProxy();
        vi.spyOn(clientProxy, 'process');
        actionDispatcher = new mock.StubActionDispatcher();
        const container = new Container();
        container.load(
            new ContainerModule(bind => {
                bind(Logger).toConstantValue(new mock.StubLogger());
                bind(GLSPClientProxy).toConstantValue(clientProxy);
                bind(ClientSessionManager).toConstantValue(new mock.StubClientSessionManager());
                bind(GlobalActionProvider).toConstantValue(<GlobalActionProvider>{
                    actionKinds: new Map(),
                    getDiagramCapabilities: async () => new Map()
                });
            })
        );
        glspServer = container.resolve(DefaultGLSPServer);
        await glspServer.initialize({ applicationId: 'Test', protocolVersion: DefaultGLSPServer.PROTOCOL_VERSION });
        glspServer['clientSessions'].set(clientId, { id: clientId, actionDispatcher } as unknown as ClientSession);
    });

    it('should send the operation response to the client', async () => {
        const response = OperationResponseAction.create({ responseId: 'request_1' });
        vi.spyOn(actionDispatcher, 'request').mockResolvedValue(response);

        const operation = ChangeBoundsOperation.create([]);
        operation.requestId = 'request_1';
        glspServer.process({ clientId, action: operation });

        await vi.waitFor(() => expect(sentActions()).toEqual([response]));
    });

    it('should reject a failed operation with the error message', async () => {
        vi.spyOn(actionDispatcher, 'request').mockRejectedValue(new GLSPServerError('Element not found', 'some cause'));

        const operation = ChangeBoundsOperation.create([]);
        operation.requestId = 'request_1';
        glspServer.process({ clientId, action: operation });

        await vi.waitFor(() =>
            expect(sentActions()).toEqual([
                RejectAction.create(`Failed to execute operation 'changeBounds': Element not found`, {
                    responseId: 'request_1',
                    detail: 'some cause'
                })
            ])
        );
    });

    it('should dispatch an operation without request id as plain action and report errors via message', async () => {
        const requestSpy = vi.spyOn(actionDispatcher, 'request');
        vi.spyOn(actionDispatcher, 'dispatch').mockRejectedValue(new GLSPServerError('Element not found'));

        glspServer.process({ clientId, action: ChangeBoundsOperation.create([]) });

        await vi.waitFor(() => expect(sentActions()).toEqual([expect.objectContaining({ kind: MessageAction.KIND, severity: 'ERROR' })]));
        expect(requestSpy).not.toHaveBeenCalled();
    });
});
