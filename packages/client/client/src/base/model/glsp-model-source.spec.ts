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
import { ActionHandlerRegistry, ActionMessage, Operation, TYPES } from '@eclipse-glsp/sprotty';
import { Container } from 'inversify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLSPActionDispatcher } from '../action-dispatcher';
import { GLSPActionHandlerRegistry } from '../action-handler-registry';
import { defaultModule } from '../default.module';
import { IDiagramOptions } from './diagram-loader';
import { GLSPModelSource } from './glsp-model-source';

describe('GLSPModelSource', () => {
    let modelSource: GLSPModelSource;
    let actionDispatcher: GLSPActionDispatcher;

    function receive(operation: Operation): void {
        modelSource['messageReceived']({ clientId: 'client1', action: operation } as ActionMessage);
    }

    beforeEach(() => {
        const container = new Container();
        container.load(defaultModule);
        container.bind(TYPES.IDiagramOptions).toConstantValue(<IDiagramOptions>(<unknown>{
            clientId: 'client1',
            diagramType: 'diagramType',
            glspClientProvider: async () => ({}) as any
        }));
        actionDispatcher = container.get(GLSPActionDispatcher);
        modelSource = container.get<GLSPModelSource>(TYPES.ModelSource);
        modelSource.initialize(container.get<GLSPActionHandlerRegistry>(ActionHandlerRegistry));
        vi.spyOn(actionDispatcher, 'dispatch').mockResolvedValue();
        vi.spyOn(actionDispatcher, 'request').mockResolvedValue(undefined as any);
        vi.spyOn(actionDispatcher, 'requestUntil').mockResolvedValue(undefined);
    });

    it('should dispatch an operation without request id received from the server as plain action', () => {
        const operation: Operation = { kind: 'testOperation', isOperation: true, requestId: '' };
        receive(operation);
        expect(actionDispatcher.dispatch).toHaveBeenCalledWith(operation);
        expect(actionDispatcher.request).not.toHaveBeenCalled();
    });

    it('should handle an operation with request id received from the server as request', () => {
        const operation: Operation = { kind: 'testOperation', isOperation: true, requestId: 'server_1' };
        receive(operation);
        expect(actionDispatcher.request).toHaveBeenCalledWith(operation);
        expect(actionDispatcher.dispatch).not.toHaveBeenCalled();
    });
});
