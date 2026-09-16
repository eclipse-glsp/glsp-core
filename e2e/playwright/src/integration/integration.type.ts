/********************************************************************************
 * Copyright (c) 2023-2026 Business Informatics Group (TU Wien) and others.
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
import type { Browser, Page } from '@playwright/test';
import type { Integration } from './integration.base';

declare global {
    namespace GLSPPlaywright {
        /**
         * Open registry of integration options, extended by integration packages through
         * declaration merging:
         *
         * ```ts
         * declare global {
         *     namespace GLSPPlaywright {
         *         interface IntegrationOptionsMap {
         *             Theia: TheiaIntegrationOptions;
         *         }
         *     }
         * }
         * ```
         * See the integration concept documentation for the extension contract and rationale.
         */
        interface IntegrationOptionsMap {}
    }
}

export type IntegrationOptionsMap = GLSPPlaywright.IntegrationOptionsMap;

/**
 * Discriminator of every contributed integration, e.g. `'Standalone'` or `'Theia'`.
 */
export type IntegrationType = Extract<keyof IntegrationOptionsMap, string>;

/**
 * Discriminated union of the options of every contributed integration.
 */
export type IntegrationOptions = IntegrationOptionsMap[IntegrationType];

/**
 * Creates the {@link Integration} for a concrete set of options.
 *
 * Options carry this factory so integrations can plug into the fixture without a global registry.
 */
export type IntegrationFactory<TOptions extends BaseIntegrationOptions = BaseIntegrationOptions> = (
    args: IntegrationArgs,
    options: TOptions
) => Integration;

export interface BaseIntegrationOptions {
    type: IntegrationType;
    /**
     * Factory used by the `integration` fixture to instantiate the integration.
     *
     * The built-in `Page` and `Standalone` integrations are also resolved without it, so it stays
     * optional here. Every integration contributed by another package must provide one, which its
     * `define*Integration()` helper does automatically, for example `defineTheiaIntegration()`.
     */
    integrationFactory?: IntegrationFactory<any>;
}

export interface IntegrationArgs {
    page: Page;
    playwright: typeof import('playwright-core');
    browser: Browser;
}
