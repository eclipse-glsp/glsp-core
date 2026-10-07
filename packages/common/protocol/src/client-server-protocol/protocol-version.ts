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

/**
 * The version of the GLSP protocol implemented by this package. It is the authoritative value that
 * clients and servers exchange during `initialize`.
 *
 * The protocol version follows semantic versioning independently of the package versions:
 * - MAJOR: breaking wire changes, e.g. a removed or renamed action, request or property,
 *   a new required property, or changed semantics of an existing message.
 * - MINOR: backwards-compatible additions, e.g. new actions or optional properties.
 * - PATCH: clarifications of the specification that do not affect the wire format.
 *
 * Peers with the same MAJOR version are compatible. See {@link ProtocolVersion.checkCompatibility}.
 */
export const GLSP_PROTOCOL_VERSION = '3.0.0';

/**
 * The result of a protocol version compatibility check.
 * A compatible result carries a `warning` if the versions differ in MINOR.
 */
export type ProtocolCompatibility = { compatible: true; warning?: string } | { compatible: false; message: string };

/** A parsed `MAJOR.MINOR.PATCH` GLSP protocol version. */
interface ParsedProtocolVersion {
    major: number;
    minor: number;
    patch: number;
}

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Parses a strict `MAJOR.MINOR.PATCH` version string.
 * Pre-release or build suffixes are not part of the protocol versioning scheme and are rejected.
 */
function parse(version: unknown): ParsedProtocolVersion | undefined {
    if (typeof version !== 'string') {
        return undefined;
    }
    const match = VERSION_PATTERN.exec(version);
    return match ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) } : undefined;
}

/** Returns the range of protocol versions that are compatible with the given version, e.g. `>=3.0.0 <4.0.0`. */
function supportedRange(version: ParsedProtocolVersion): string {
    return `>=${version.major}.0.0 <${version.major + 1}.0.0`;
}

export namespace ProtocolVersion {
    /**
     * Checks whether a client and a server implementing the given protocol versions can communicate.
     *
     * Versions with the same MAJOR are compatible, regardless of which side is newer. A MINOR difference yields a
     * warning because features of the newer version may be unavailable. A PATCH difference is compatible without a
     * warning. Different MAJOR versions and malformed versions are incompatible. The supported range in error messages
     * always refers to the server.
     */
    export function checkCompatibility(clientVersion: unknown, serverVersion: unknown): ProtocolCompatibility {
        const client = parse(clientVersion);
        const server = parse(serverVersion);
        if (!server) {
            return { compatible: false, message: `Invalid server protocol version '${serverVersion}'. Expected MAJOR.MINOR.PATCH.` };
        }
        if (!client) {
            return {
                compatible: false,
                message:
                    `Invalid client protocol version '${clientVersion}'. Expected MAJOR.MINOR.PATCH ` +
                    `(server supports: ${supportedRange(server)}).`
            };
        }
        if (client.major !== server.major) {
            return {
                compatible: false,
                message:
                    `Client protocol version ${clientVersion} is not compatible with server protocol version ${serverVersion} ` +
                    `(server supports: ${supportedRange(server)}).`
            };
        }
        // PATCH differences do not affect the wire format and are therefore accepted silently.
        if (client.minor !== server.minor) {
            return {
                compatible: true,
                warning:
                    `Client protocol version ${clientVersion} differs from server protocol version ${serverVersion}. ` +
                    'The versions are compatible, but features of the newer version may be unavailable.'
            };
        }
        return { compatible: true };
    }

    /**
     * Validates the given client and server protocol versions with {@link checkCompatibility}.
     * @param onWarning Invoked with the warning if the versions are compatible but differ in MINOR.
     * @throws An error that names both versions and the supported range if the versions are incompatible.
     */
    export function validate(clientVersion: unknown, serverVersion: unknown, onWarning?: (warning: string) => void): void {
        const result = checkCompatibility(clientVersion, serverVersion);
        if (!result.compatible) {
            throw new Error(result.message);
        }
        if (result.warning) {
            onWarning?.(result.warning);
        }
    }
}
