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

@injectable()
export class SocketServerLauncher extends JsonRpcGLSPServerLauncher<net.TcpSocketConnectOpts> {
    @inject(Logger) protected override logger: Logger;

    protected netServer?: net.Server;

    protected onConnectionEmitter = new Emitter<net.Socket>();

    /** Accepted sockets that have not been handed to a server instance yet. */
    protected pendingSockets = new Set<net.Socket>();

    /**
     * How long, in milliseconds, an accepted socket may stay silent before it is closed. Until the peer sends its
     * first bytes no server instance owns the socket, so this keeps an idle peer from holding it open indefinitely.
     */
    protected handshakeTimeout = 30_000;

    /**
     * Fires for every socket the server accepts, before the JSON-RPC connection is built on it.
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
     * Takes up a socket the server accepted. Observers are notified before the socket is read from.
     *
     * @param socket The accepted socket.
     */
    protected acceptConnection(socket: net.Socket): void {
        this.onConnectionEmitter.fire(socket);
        this.pendingSockets.add(socket);
        const chunks: Buffer[] = [];
        const onData = (chunk: Buffer): void => {
            chunks.push(chunk);
            const prefix = Buffer.concat(chunks);
            const verdict = this.classifyStreamPrefix(prefix);
            if (verdict === 'incomplete') {
                return;
            }
            release();
            if (verdict === 'accept') {
                this.openConnection(socket, prefix);
            } else {
                this.rejectConnection(socket);
            }
        };
        // Until the reader and writer register theirs, an unhandled socket error would crash the process.
        const onError = (error: Error): void =>
            this.logger.debug(`Client connection from ${socket.remoteAddress}:${socket.remotePort} failed: ${error.message}`);
        const onTimeout = (): void => {
            this.logger.warn(`Closing client connection from ${socket.remoteAddress}:${socket.remotePort}: no data received.`);
            socket.destroy();
        };
        const release = (): void => {
            socket.off('data', onData).off('error', onError).off('timeout', onTimeout).off('close', release);
            socket.setTimeout(0);
            this.pendingSockets.delete(socket);
        };
        // Wait for the first bytes, so a connection that is not a GLSP client never creates a server instance.
        socket.on('data', onData).on('error', onError).on('timeout', onTimeout).on('close', release);
        socket.setTimeout(this.handshakeTimeout);
    }

    /**
     * Decides whether the peer is a GLSP client. The default accepts only a base protocol header (ignoring case), so an
     * HTTP request is never read as a JSON-RPC message.
     *
     * An override must decide within a bounded prefix, since the launcher buffers without limit until it does.
     *
     * @param prefix All bytes the peer has sent so far.
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
