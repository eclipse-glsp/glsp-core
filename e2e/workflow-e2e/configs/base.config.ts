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
import type { GLSPPlaywrightOptions } from '@eclipse-glsp/playwright';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Playwright settings shared by every package that runs the reusable Workflow suites.
 *
 * Spread this into the package's own configuration and add the package specific `testDir`,
 * `projects` and `webServer` entries.
 *
 * Deliberately free of CI-platform specifics: reporters beyond the HTML one depend on where the
 * suite runs, so a consumer adds them in its own configuration rather than inheriting — and does
 * not have to install their packages to use this config.
 */
export const baseConfig: PlaywrightTestConfig<GLSPPlaywrightOptions> = {
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [['html', { open: 'never' }]],
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry',
        // Emulate `prefers-reduced-motion` so decorative entrance animations and transitions are
        // disabled during tests.
        contextOptions: { reducedMotion: 'reduce' }
    }
};
