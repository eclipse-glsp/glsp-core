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
import { Capability } from './capability';

describe('Capability', () => {
    it('isEnabled - should treat absent capabilities as legacy default', () => {
        expect(Capability.isEnabled(undefined)).toBe(true);
        expect(Capability.isEnabled(undefined, false)).toBe(false);
        expect(Capability.isEnabled(false)).toBe(false);
        expect(Capability.isEnabled(true)).toBe(true);
        expect(Capability.isEnabled({ validation: true })).toBe(true);
    });

    it('options - should only return options objects', () => {
        expect(Capability.options({ validation: true })).toEqual({ validation: true });
        expect(Capability.options<object>(true)).toBeUndefined();
        expect(Capability.options<object>(undefined)).toBeUndefined();
    });
});
