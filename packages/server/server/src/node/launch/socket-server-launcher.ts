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
import { Disposable, Emitter } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import * as net from 'net';
import * as jsonrpc from 'vscode-jsonrpc/node';
import { JsonRpcGLSPServerLauncher } from '../../common/launch/jsonrpc-server-launcher';
import { Logger } from '../../common/utils/logger';

/** Common prefix of `Content-Length` and `Content-Type`, the only headers of the base protocol, lowercased. */
const BASE_PROTOCOL_HEADER_PREFIX = 'content-';

/** Maximum number of bytes inspected before a pending stream must be classified. */
const MAX_STREAM_PREFIX_LENGTH = 8192;

@injectable()
export class SocketServerLauncher extends JsonRpcGLSPServerLauncher<net.TcpSocketConnectOpts> {
    @inject(Logger) protected override logger: Logger;

    protected netServer?: net.Server;

    protected onConnectionEmitter = new Emitter<net.Socket>();

    /** Accepted sockets that have not been handed to a server instance yet. */
    protected pendingSockets = new Set<net.Socket>();

    /**
     * How long, in milliseconds, an accepted socket may remain pending before it is closed, regardless of incoming
     * data. No server instance owns the socket until the stream has been classified.
     */
    protected handshakeTimeout = 30_000;

    /**
     * Fires after the JSON-RPC connection and server instance have been created for an accepted GLSP client.
     * Rejected peers and connections that close or time out before classification do not fire this event.
     *
     * A listener must not consume the socket. Subscribe before {@link start} to observe the first connection; the
     * subscription outlives an individual launch and is disposed by the caller.
     */
    readonly onConnection = this.onConnectionEmitter.event;

    protected override getServerSocket(): net.Server | undefined {
        return this.netServer;
    }

    protected override registerDisposables(): void {
        super.registerDisposables();
        this.toDispose.push(
            Disposable.create(() => {
                this.netServer?.close();
                // `close` waits for open sockets, and pending ones have no server instance that would destroy them.
                this.pendingSockets.forEach(socket => socket.destroy());
                this.pendingSockets.clear();
            })
        );
    }

    protected run(opts: net.TcpSocketConnectOpts): Promise<void> {
        this.resetListening();
        const netServer = net.createServer(socket => this.acceptConnection(socket));
        this.netServer = netServer;

        netServer.listen(opts.port, opts.host);
        netServer.on('listening', () => this.handleListening(netServer));
        netServer.on('error', error => this.handleError(error));
        return new Promise((resolve, reject) => {
            netServer.on('close', () => resolve(undefined));
            netServer.on('error', error => reject(error));
        });
    }

    /**
     * Classifies a socket the server accepted before handing it to a server instance.
     *
     * @param socket The accepted socket.
     */
    protected acceptConnection(socket: net.Socket): void {
        this.pendingSockets.add(socket);
        const buffer = Buffer.alloc(MAX_STREAM_PREFIX_LENGTH);
        let length = 0;
        const onData = (chunk: Buffer): void => {
            const previousLength = length;
            length += chunk.copy(buffer, length, 0, MAX_STREAM_PREFIX_LENGTH - length);
            const prefix = buffer.subarray(0, length);
            const verdict = this.classifyStreamPrefix(prefix);
            if (verdict === 'incomplete' && length < MAX_STREAM_PREFIX_LENGTH) {
                return;
            }
            release();
            if (verdict === 'accept') {
                // Replay the whole chunk, including bytes beyond the classification limit.
                this.openConnection(socket, Buffer.concat([buffer.subarray(0, previousLength), chunk]));
            } else {
                this.rejectConnection(socket);
            }
        };
        // Until the reader and writer register theirs, an unhandled socket error would crash the process.
        const onError = (error: Error): void =>
            this.logger.debug(`Client connection from ${socket.remoteAddress}:${socket.remotePort} failed: ${error.message}`);
        const onTimeout = (): void => {
            this.logger.warn(
                `Closing client connection from ${socket.remoteAddress}:${socket.remotePort}: stream classification timed out.`
            );
            socket.destroy();
        };
        const release = (): void => {
            socket.off('data', onData).off('error', onError).off('close', release);
            clearTimeout(timeout);
            this.pendingSockets.delete(socket);
        };
        // Bound the entire classification phase, not just inactivity between chunks.
        const timeout = setTimeout(onTimeout, this.handshakeTimeout);
        socket.on('data', onData).on('error', onError).on('close', release);
    }

    /**
     * Decides whether the peer is a GLSP client. The default accepts only a base protocol header (ignoring case), so an
     * HTTP request is never read as a JSON-RPC message.
     *
     * An override receives at most 8 KiB. If it still returns `incomplete` at that limit, the connection is rejected.
     * Bytes following an accepted prefix are preserved for the JSON-RPC reader.
     *
     * @param prefix The bytes received so far, capped at 8 KiB.
     * @returns `incomplete` while `prefix` is too short to tell.
     */
    protected classifyStreamPrefix(prefix: Buffer): 'accept' | 'reject' | 'incomplete' {
        const start = prefix.subarray(0, BASE_PROTOCOL_HEADER_PREFIX.length).toString('ascii').toLowerCase();
        if (start.length < BASE_PROTOCOL_HEADER_PREFIX.length) {
            return BASE_PROTOCOL_HEADER_PREFIX.startsWith(start) ? 'incomplete' : 'reject';
        }
        return start === BASE_PROTOCOL_HEADER_PREFIX ? 'accept' : 'reject';
    }

    /**
     * Builds the JSON-RPC connection and server instance for an accepted GLSP client. The bytes consumed while
     * classifying the stream are put back, so the client is unaffected.
     *
     * @param socket The accepted socket.
     * @param prefix The bytes read so far, see {@link classifyStreamPrefix}.
     */
    protected openConnection(socket: net.Socket, prefix: Buffer): void {
        // Paused so the put-back bytes wait for the reader: adding its `data` listener does not resume a paused stream.
        socket.pause();
        socket.unshift(prefix);
        this.createServerInstance(this.createConnection(socket));
        this.onConnectionEmitter.fire(socket);
        socket.resume();
    }

    /**
     * Closes a connection whose peer is not a GLSP client.
     *
     * @param socket The accepted socket.
     */
    protected rejectConnection(socket: net.Socket): void {
        this.logger.warn(
            `Rejecting client connection from ${socket.remoteAddress}:${socket.remotePort}: ` +
                'the stream does not start with a JSON-RPC base protocol header.'
        );
        socket.destroy();
    }

    /**
     * Reports the server as ready and resolves {@link listening}.
     *
     * @param server The server that reported itself as listening.
     */
    protected handleListening(server: net.Server): void {
        const addressInfo = this.settleListening(server);
        if (!addressInfo) {
            return;
        }
        this.logger.info(`The GLSP server is ready to accept new client requests on port: ${addressInfo.port}`);
        // Print a message to the output stream that indicates that the start is completed.
        // This indicates to the client that the server process is ready (in an embedded scenario).
        console.log(this.startupCompleteMessage.concat(addressInfo.port.toString()));
    }

    protected createConnection(socket: net.Socket): jsonrpc.MessageConnection {
        return jsonrpc.createMessageConnection(new jsonrpc.SocketMessageReader(socket), new jsonrpc.SocketMessageWriter(socket), console);
    }
}
