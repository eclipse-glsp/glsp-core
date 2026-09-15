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
import glspVitestConfig, { defineConfig } from '@eclipse-glsp/vitest-config';

// One named test project per workspace group instead of a single flat suite:
// `vitest --project <name>` scopes a run to one group, while a bare `vitest run --coverage`
// still runs everything with one merged report (coverage and reporters are root-level
// options that aggregate across projects). The shared base's flat `include` must not stay
// on the root config: `extends: true` merges arrays, so every project would match every spec.
const rootTest = { ...(glspVitestConfig.test ?? {}) };
delete rootTest.include;

// `reflect-metadata` is required by the inversify-based DI specs (matching the former
// .mocharc); the dev tooling suite has no DI and runs without it.
export default defineConfig({
    test: {
        ...rootTest,
        projects: [
            {
                extends: true,
                test: { name: 'common', setupFiles: ['reflect-metadata'], include: ['packages/common/*/src/**/*.spec.{ts,tsx}'] }
            },
            {
                extends: true,
                test: { name: 'client', setupFiles: ['reflect-metadata'], include: ['packages/client/*/src/**/*.spec.{ts,tsx}'] }
            },
            {
                extends: true,
                test: { name: 'server', setupFiles: ['reflect-metadata'], include: ['packages/server/*/src/**/*.spec.{ts,tsx}'] }
            },
            { extends: true, test: { name: 'dev', include: ['dev-packages/*/src/**/*.spec.{ts,tsx}'] } }
        ]
    }
});
