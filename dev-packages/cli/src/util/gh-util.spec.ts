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
import { summarizeChecks } from './gh-util';

describe('gh-util', () => {
    describe('summarizeChecks', () => {
        it('classifies check runs and commit statuses', () => {
            const summary = summarizeChecks([
                { __typename: 'CheckRun', name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS' },
                { __typename: 'CheckRun', name: 'skipped', status: 'COMPLETED', conclusion: 'SKIPPED' },
                { __typename: 'CheckRun', name: 'e2e', status: 'IN_PROGRESS', conclusion: '' },
                { __typename: 'CheckRun', name: 'lint', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://ci/lint' },
                { __typename: 'StatusContext', context: 'eca', state: 'PENDING' },
                { __typename: 'StatusContext', context: 'legacy', state: 'ERROR', targetUrl: 'https://ci/legacy' }
            ]);
            expect(summary.total).toBe(6);
            expect(summary.pending).toEqual(['e2e', 'eca']);
            expect(summary.failed).toEqual([
                { name: 'lint', url: 'https://ci/lint' },
                { name: 'legacy', url: 'https://ci/legacy' }
            ]);
        });

        it('reports an empty rollup as zero checks', () => {
            expect(summarizeChecks([])).toEqual({ total: 0, pending: [], failed: [] });
        });
    });
});
