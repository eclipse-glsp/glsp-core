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

import { describe, expect, it, vi } from 'vitest';
import { GLSP_PROTOCOL_VERSION, ProtocolVersion } from './protocol-version';

describe('ProtocolVersion', () => {
    describe('checkCompatibility', () => {
        it.each([
            { client: '2.0.0', server: '2.0.0', compatible: true, warning: false },
            { client: '2.1.0', server: '2.0.0', compatible: true, warning: true },
            { client: '2.0.0', server: '2.1.0', compatible: true, warning: true },
            { client: '2.0.1', server: '2.0.0', compatible: true, warning: false },
            { client: '2.0.0', server: '2.0.1', compatible: true, warning: false },
            { client: '1.0.0', server: '2.0.0', compatible: false, warning: false },
            { client: '3.0.0', server: '2.0.0', compatible: false, warning: false },
            { client: 'abc', server: '2.0.0', compatible: false, warning: false },
            { client: '', server: '2.0.0', compatible: false, warning: false },
            { client: '2.0.0', server: undefined, compatible: false, warning: false }
        ])('client $client / server $server → compatible: $compatible, warning: $warning', ({ client, server, compatible, warning }) => {
            const result = ProtocolVersion.checkCompatibility(client, server);
            expect(result.compatible).toBe(compatible);
            expect(result.compatible && !!result.warning).toBe(warning);
        });

        it.each(['', 'abc', '2', '2.0', '2.0.0.0', '02.0.0', '2.0.0-next', 'v2.0.0', ' 2.0.0', undefined, 2])(
            'should reject the malformed client version %j',
            version => {
                expect(ProtocolVersion.checkCompatibility(version, '2.0.0').compatible).toBe(false);
            }
        );

        it('should accept the current protocol version', () => {
            expect(ProtocolVersion.checkCompatibility(GLSP_PROTOCOL_VERSION, GLSP_PROTOCOL_VERSION)).toEqual({ compatible: true });
        });

        it('should parse multi-digit versions', () => {
            expect(ProtocolVersion.checkCompatibility('2.10.3', '2.10.0')).toEqual({ compatible: true });
        });

        it('should name both versions and the supported range for a MAJOR mismatch', () => {
            const result = ProtocolVersion.checkCompatibility('1.0.0', '2.0.0');
            expect(result).toEqual({
                compatible: false,
                message:
                    'Client protocol version 1.0.0 is not compatible with server protocol version 2.0.0 (server supports: >=2.0.0 <3.0.0).'
            });
        });

        it('should name both versions in the warning', () => {
            const result = ProtocolVersion.checkCompatibility('2.1.0', '2.0.0');
            expect(result.compatible && result.warning).toContain(
                'Client protocol version 2.1.0 differs from server protocol version 2.0.0'
            );
        });
    });

    describe('validate', () => {
        it('should throw for incompatible versions', () => {
            expect(() => ProtocolVersion.validate('1.0.0', '2.0.0')).toThrow(/server supports: >=2.0.0 <3.0.0/);
        });
        it('should report a warning for compatible versions that differ', () => {
            const onWarning = vi.fn();
            ProtocolVersion.validate('2.1.0', '2.0.0', onWarning);
            expect(onWarning).toHaveBeenCalledOnce();
        });
        it('should not report a warning for equal versions', () => {
            const onWarning = vi.fn();
            ProtocolVersion.validate(GLSP_PROTOCOL_VERSION, GLSP_PROTOCOL_VERSION, onWarning);
            expect(onWarning).not.toHaveBeenCalled();
        });
    });
});
