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
import { describe, expect, it } from 'vitest';
import { GLSPCapability } from '../client-server-protocol/capabilities/glsp-capability';
import { CapabilitiesChangedAction } from './capabilities';
/**
 * Tests for the utility functions declared in the namespaces of the protocol
 * action definitions.
 */
describe('Capability actions', () => {
    describe('CapabilitiesChangedAction', () => {
        describe('is', () => {
            it('should return true for an object having the correct type and a value for all required interface properties', () => {
                const action: CapabilitiesChangedAction = {
                    kind: CapabilitiesChangedAction.KIND,
                    capabilities: { [GLSPCapability.Delete]: false }
                };
                expect(CapabilitiesChangedAction.is(action)).toBe(true);
            });
            it('should return false for `undefined`', () => {
                expect(CapabilitiesChangedAction.is(undefined)).toBe(false);
            });
            it('should return false for an object that does not have all required interface properties', () => {
                expect(CapabilitiesChangedAction.is({ kind: CapabilitiesChangedAction.KIND })).toBe(false);
                expect(CapabilitiesChangedAction.is({ kind: 'notTheRightOne', capabilities: {} })).toBe(false);
            });
        });

        describe('create', () => {
            it('should return an object conforming to the interface with matching properties for the given required arguments', () => {
                const capabilities = { [GLSPCapability.Delete]: false, 'acme.simulation': true };
                const expected: CapabilitiesChangedAction = { kind: CapabilitiesChangedAction.KIND, capabilities };
                expect(CapabilitiesChangedAction.create(capabilities)).toEqual(expected);
            });
        });
    });
});
