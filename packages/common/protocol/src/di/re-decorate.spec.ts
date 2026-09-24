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

import { Container, injectable } from 'inversify';
import { describe, expect, it, vi } from 'vitest';
import { JsonrpcClientProxy } from '../client-server-protocol/jsonrpc/base-jsonrpc-glsp-client';
import './re-decorate';

@injectable()
class CustomClientProxy extends JsonrpcClientProxy {}

describe('JSON-RPC proxy decoration', () => {
    it('keeps the proxy injectable and supports a bound subclass', () => {
        const container = new Container();
        expect(container.resolve(JsonrpcClientProxy)).toBeInstanceOf(JsonrpcClientProxy);
        container.bind(JsonrpcClientProxy).to(CustomClientProxy);
        expect(container.resolve(JsonrpcClientProxy)).toBeInstanceOf(CustomClientProxy);
    });

    it('can load the DI module again with the same proxy class', async () => {
        vi.doMock('../client-server-protocol/jsonrpc/base-jsonrpc-glsp-client', () => ({ JsonrpcClientProxy }));
        try {
            vi.resetModules();
            await expect(import('./re-decorate')).resolves.toBeDefined();
            vi.resetModules();
            await expect(import('./re-decorate')).resolves.toBeDefined();
        } finally {
            vi.doUnmock('../client-server-protocol/jsonrpc/base-jsonrpc-glsp-client');
        }
    });
});
