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

import { GLSPServer } from '@eclipse-glsp/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'inversify';
import * as net from 'net';
import { createAppModule } from '../di/app-module';
import { delay, waitForReachable } from '../test/port-util';
import { defaultSocketLaunchOptions } from './socket-cli-parser';
import { SocketServerLauncher } from './socket-server-launcher';

const serverPort = 5008;

let serverStub: GLSPServer;

function frame(payload: string): string {
    return `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;
}

const initializeRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { applicationId: 'client-app', protocolVersion: '1.0.0' }
});

function closed(socket: net.Socket): Promise<void> {
    return new Promise(resolve => (socket.destroyed ? resolve() : socket.once('close', () => resolve())));
}

/** Sends the payload on a new connection and resolves with the first response chunk. */
async function sendAndReadResponse(payload: string): Promise<string> {
    const client = await connect();
    try {
        const response = new Promise<string>(resolve => client.once('data', data => resolve(data.toString())));
        client.write(payload);
        return await response;
    } finally {
        client.destroy();
    }
}

/** Opens a connection to the launcher and resolves once it is established. */
async function connect(): Promise<net.Socket> {
    const client = net.createConnection({ port: serverPort });
    await new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('error', reject);
    });
    return client;
}

function createLauncher(): SocketServerLauncher {
    serverStub = {
        initialize: vi.fn().mockResolvedValue({}),
        initializeClientSession: vi.fn().mockResolvedValue(undefined),
        disposeClientSession: vi.fn().mockResolvedValue(undefined),
        process: vi.fn(),
        shutdown: vi.fn(),
        addListener: vi.fn().mockReturnValue(true),
        removeListener: vi.fn().mockReturnValue(true)
    } as unknown as GLSPServer;

    const appContainer = new Container();
    appContainer.load(createAppModule(defaultSocketLaunchOptions));
    appContainer.bind(GLSPServer).toConstantValue(serverStub);
    return appContainer.resolve(SocketServerLauncher);
}

describe('test SocketServerLauncher', () => {
    let launcher: SocketServerLauncher | undefined;

    afterEach(() => {
        launcher?.shutdown();
        launcher = undefined;
    });

    it('starts and stops', async () => {
        launcher = createLauncher();

        launcher.start({ port: serverPort });
        await waitForReachable(serverPort, true);

        launcher.shutdown();
        await waitForReachable(serverPort, false);
    });

    it('resolves the address it is listening on', async () => {
        launcher = createLauncher();

        launcher.start({ port: serverPort });

        await expect(launcher.listening).resolves.toMatchObject({ port: serverPort });
    });

    it('resolves a promise that was grabbed before the launch', async () => {
        launcher = createLauncher();
        const listening = launcher.listening;

        launcher.start({ port: serverPort });

        await expect(listening).resolves.toMatchObject({ port: serverPort });
    });

    it('resolves the port the operating system assigned', async () => {
        launcher = createLauncher();

        launcher.start({ port: 0 });
        const address = await launcher.listening;

        expect(address.port).toBeGreaterThan(0);
        expect(launcher.port).toBe(address.port);
        await waitForReachable(address.port, true);
    });

    it('reports no port unless it is listening', async () => {
        launcher = createLauncher();
        expect(launcher.port).toBeUndefined();

        launcher.start({ port: serverPort });
        await launcher.listening;
        expect(launcher.port).toBe(serverPort);

        launcher.shutdown();
        await waitForReachable(serverPort, false);
        expect(launcher.port).toBeUndefined();
    });

    it('notifies observers after establishing an accepted GLSP connection', async () => {
        launcher = createLauncher();
        const createServerInstance = vi.spyOn(launcher as any, 'createServerInstance');
        const accepted: net.Socket[] = [];
        launcher.onConnection(socket => {
            expect(createServerInstance).toHaveBeenCalledOnce();
            accepted.push(socket);
        });

        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.write(frame(initializeRequest));
            await vi.waitFor(() => expect(accepted).toHaveLength(1));
        } finally {
            client.destroy();
        }
    });

    it('rejects if the port is already in use', async () => {
        const blocker = net.createServer();
        await new Promise<void>(resolve => blocker.listen(serverPort, () => resolve()));
        try {
            launcher = createLauncher();

            // `start` reports the same failure, so it is awaited here as well to keep every rejection handled
            const stopped = Promise.resolve(launcher.start({ port: serverPort }));

            await expect(launcher.listening).rejects.toThrow();
            await expect(stopped).rejects.toThrow();
        } finally {
            await new Promise<void>(resolve => blocker.close(() => resolve()));
        }
    });

    it('releases the server socket again when a restarted launcher is shut down', async () => {
        launcher = createLauncher();

        launcher.start({ port: serverPort });
        await waitForReachable(serverPort, true);
        launcher.shutdown();
        await waitForReachable(serverPort, false);

        launcher.start({ port: serverPort });
        await waitForReachable(serverPort, true);
        launcher.shutdown();
        await waitForReachable(serverPort, false);
    });

    it('keeps notifying observers across a restart', async () => {
        launcher = createLauncher();
        const accepted: net.Socket[] = [];
        launcher.onConnection(socket => accepted.push(socket));

        launcher.start({ port: serverPort });
        await launcher.listening;
        launcher.shutdown();
        await waitForReachable(serverPort, false);

        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.write(frame(initializeRequest));
            await vi.waitFor(() => expect(accepted).toHaveLength(1));
        } finally {
            client.destroy();
        }
    });

    it('processes a framed JSON-RPC request', async () => {
        launcher = createLauncher();
        launcher.start({ port: serverPort });
        await launcher.listening;

        await expect(sendAndReadResponse(frame(initializeRequest))).resolves.toContain('"id":1');
        expect(serverStub.initialize).toHaveBeenCalledOnce();
    });

    it('rejects a connection that starts with an HTTP request', async () => {
        launcher = createLauncher();
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        const createServerInstance = vi.spyOn(launcher as any, 'createServerInstance');
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            // What a browser sends for a cross-origin `fetch(..., { method: 'POST', mode: 'no-cors', body })`.
            client.write(
                `POST / HTTP/1.1\r\nHost: localhost\r\nContent-Type: text/plain;charset=UTF-8\r\n` +
                    `Content-Length: ${Buffer.byteLength(initializeRequest)}\r\n\r\n${initializeRequest}`
            );

            await closed(client);
            expect(onConnection).not.toHaveBeenCalled();
            expect(serverStub.initialize).not.toHaveBeenCalled();
            expect(createServerInstance).not.toHaveBeenCalled();
        } finally {
            client.destroy();
        }
    });

    it('processes a request whose first header is Content-Type', async () => {
        launcher = createLauncher();
        launcher.start({ port: serverPort });
        await launcher.listening;

        const payload = `Content-Type: application/vscode-jsonrpc; charset=utf-8\r\n${frame(initializeRequest)}`;
        await expect(sendAndReadResponse(payload)).resolves.toContain('"id":1');
    });

    it('processes a request with lowercase header names, like the JSON-RPC reader', async () => {
        launcher = createLauncher();
        launcher.start({ port: serverPort });
        await launcher.listening;

        const payload = `content-length: ${Buffer.byteLength(initializeRequest)}\r\n\r\n${initializeRequest}`;
        await expect(sendAndReadResponse(payload)).resolves.toContain('"id":1');
    });

    it('rejects a message without base protocol framing', async () => {
        launcher = createLauncher();
        const createServerInstance = vi.spyOn(launcher as any, 'createServerInstance');
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.write(initializeRequest);

            await closed(client);
            expect(createServerInstance).not.toHaveBeenCalled();
        } finally {
            client.destroy();
        }
    });

    it('rejects an HTTP request line that arrives in pieces', async () => {
        launcher = createLauncher();
        const createServerInstance = vi.spyOn(launcher as any, 'createServerInstance');
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.setNoDelay(true);
            // `CON` could still become `Content-`, the header check ignores case.
            client.write('CON');
            await delay(20);
            client.write('NECT localhost:5008 HTTP/1.1\r\nHost: localhost\r\n\r\n');

            await closed(client);
            expect(createServerInstance).not.toHaveBeenCalled();
        } finally {
            client.destroy();
        }
    });

    it('processes a JSON-RPC request whose first chunk is ambiguous', async () => {
        launcher = createLauncher();
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.setNoDelay(true);
            const response = new Promise<string>(resolve => client.once('data', data => resolve(data.toString())));
            const message = frame(initializeRequest);
            // `C` alone is too short to tell, so the launcher has to wait for more.
            client.write(message.slice(0, 1));
            await delay(20);
            client.write(message.slice(1));

            await expect(response).resolves.toContain('"id":1');
        } finally {
            client.destroy();
        }
    });

    it('does not create a server instance for a connection that sends nothing', async () => {
        launcher = createLauncher();
        const createServerInstance = vi.spyOn(launcher as any, 'createServerInstance');
        const accepted: net.Socket[] = [];
        const acceptConnection = (launcher as any).acceptConnection.bind(launcher);
        vi.spyOn(launcher as any, 'acceptConnection').mockImplementation((socket: unknown) => {
            accepted.push(socket as net.Socket);
            acceptConnection(socket);
        });
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        client.destroy();

        await vi.waitFor(() => expect(accepted).toHaveLength(1));
        await closed(accepted[0]);
        expect(createServerInstance).not.toHaveBeenCalled();
        expect(onConnection).not.toHaveBeenCalled();
    });

    it('survives a connection that is reset before it sends anything', async () => {
        launcher = createLauncher();
        const accepted: net.Socket[] = [];
        const acceptConnection = (launcher as any).acceptConnection.bind(launcher);
        vi.spyOn(launcher as any, 'acceptConnection').mockImplementation((socket: unknown) => {
            accepted.push(socket as net.Socket);
            acceptConnection(socket);
        });
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        await vi.waitFor(() => expect(accepted).toHaveLength(1));
        client.resetAndDestroy();

        await closed(accepted[0]);
        expect(onConnection).not.toHaveBeenCalled();
        const next = await connect();
        try {
            const response = new Promise<string>(resolve => next.once('data', data => resolve(data.toString())));
            next.write(frame(initializeRequest));
            await expect(response).resolves.toContain('"id":1');
        } finally {
            next.destroy();
        }
    });

    it('closes a connection that sends nothing within the handshake timeout', async () => {
        launcher = createLauncher();
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        (launcher as any).handshakeTimeout = 50;
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            await closed(client);
            expect(onConnection).not.toHaveBeenCalled();
        } finally {
            client.destroy();
        }
    });

    it('bounds an undecided prefix even when the classifier always returns incomplete', async () => {
        launcher = createLauncher();
        const classify = vi.spyOn(launcher as any, 'classifyStreamPrefix').mockReturnValue('incomplete');
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            client.write(Buffer.alloc(8191, 'C'));
            await vi.waitFor(() => expect(classify).toHaveBeenCalled());
            expect(client.destroyed).toBe(false);
            client.write(Buffer.alloc(1024, 'C'));
            await closed(client);
            expect(classify.mock.calls.at(-1)?.[0]).toHaveLength(8192);
            expect(onConnection).not.toHaveBeenCalled();
        } finally {
            client.destroy();
        }
    });

    it('preserves accepted message bytes beyond the classification limit', async () => {
        launcher = createLauncher();
        launcher.start({ port: serverPort });
        await launcher.listening;

        const request = JSON.parse(initializeRequest);
        request.params.applicationId = 'C'.repeat(16_384);
        await expect(sendAndReadResponse(frame(JSON.stringify(request)))).resolves.toContain('"id":1');
        expect(serverStub.initialize).toHaveBeenCalledWith(request.params);
    });

    it('times out an undecided stream even while it keeps sending data', async () => {
        launcher = createLauncher();
        (launcher as any).handshakeTimeout = 150;
        const classify = vi.spyOn(launcher as any, 'classifyStreamPrefix').mockReturnValue('incomplete');
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        const interval = setInterval(() => client.write('C'), 10);
        try {
            await closed(client);
            expect(classify.mock.calls.length).toBeGreaterThan(1);
            expect(onConnection).not.toHaveBeenCalled();
        } finally {
            clearInterval(interval);
            client.destroy();
        }
    });

    it('clears the classification deadline after accepting a connection', async () => {
        launcher = createLauncher();
        (launcher as any).handshakeTimeout = 100;
        launcher.start({ port: serverPort });
        await launcher.listening;

        const client = await connect();
        try {
            const response = new Promise<string>(resolve => client.once('data', data => resolve(data.toString())));
            client.write(frame(initializeRequest));
            await expect(response).resolves.toContain('"id":1');
            await delay(150);
            expect(client.destroyed).toBe(false);
        } finally {
            client.destroy();
        }
    });

    it('closes idle connections when it is shut down', async () => {
        launcher = createLauncher();
        const accepted: net.Socket[] = [];
        const acceptConnection = (launcher as any).acceptConnection.bind(launcher);
        vi.spyOn(launcher as any, 'acceptConnection').mockImplementation((socket: unknown) => {
            accepted.push(socket as net.Socket);
            acceptConnection(socket);
        });
        const onConnection = vi.fn();
        launcher.onConnection(onConnection);
        const stopped = Promise.resolve(launcher.start({ port: serverPort }));
        await launcher.listening;

        const client = await connect();
        try {
            await vi.waitFor(() => expect(accepted).toHaveLength(1));
            launcher.shutdown();

            await expect(stopped).resolves.toBeUndefined();
            await closed(client);
        } finally {
            client.destroy();
        }
        expect(onConnection).not.toHaveBeenCalled();
    });
});

describe('SocketServerLauncher.classifyStreamPrefix', () => {
    it.each([
        ['Content-Length: 42', 'accept'],
        ['Content-Type: application/vscode-jsonrpc', 'accept'],
        ['content-length: 42', 'accept'],
        ['Content-', 'accept'],
        ['C', 'incomplete'],
        ['cont', 'incomplete'],
        ['Content', 'incomplete'],
        ['POST / HTTP/1.1', 'reject'],
        ['CONNECT localhost:5008 HTTP/1.1', 'reject'],
        ['{"jsonrpc":"2.0"}', 'reject'],
        ['Content:', 'reject'],
        ['X', 'reject']
    ])('%s -> %s', (prefix, expected) => {
        expect((createLauncher() as any).classifyStreamPrefix(Buffer.from(prefix))).toBe(expected);
    });
});
