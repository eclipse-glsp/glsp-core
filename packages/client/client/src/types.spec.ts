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
import { SPROTTY_TYPES } from '@eclipse-glsp/sprotty';
import { describe, expect, it } from 'vitest';
import { TYPES } from './types';

describe('TYPES', () => {
    const sprottyKeys = Object.keys(SPROTTY_TYPES).filter(key => key !== 'SvgExporter') as (keyof typeof TYPES &
        keyof typeof SPROTTY_TYPES)[];

    it.each(sprottyKeys)('should map %s to the sprotty symbol', key => {
        expect(TYPES[key]).toBe(SPROTTY_TYPES[key]);
    });

    it('should not contain the sprotty SvgExporter identifier', () => {
        expect(TYPES).not.toHaveProperty('SvgExporter');
    });
});
