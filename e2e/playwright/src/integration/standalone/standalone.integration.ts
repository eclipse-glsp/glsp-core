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
import { SVGMetadataUtils } from '../../glsp/graph';
import type { GLSPSemanticApp } from '../../glsp/app';
import { MarkerNavigatorIntegration, StandaloneMarkerNavigator } from '../../glsp/features/validation/marker-navigator.integration';
import type { MarkerNavigator } from '../../glsp/features/validation/marker-navigator';
// Imported directly instead of via the `../../test` barrel: that barrel also pulls in
// `test/test.ts`, which imports the integration barrel and would close a runtime import cycle.
import { expect } from '../../test/assertions';
import { Integration } from '../integration.base';
import type { IntegrationArgs } from '../integration.type';
import type { StandaloneIntegrationConfig, StandaloneIntegrationOptions } from './standalone.options';

/**
 * The {@link StandaloneIntegration} provides the glue code for working
 * with the standalone version of the GLSP-Client.
 */
export class StandaloneIntegration extends Integration implements MarkerNavigatorIntegration {
    override page = this.args.page;

    constructor(
        args: IntegrationArgs,
        protected readonly options: StandaloneIntegrationOptions
    ) {
        super(args, 'Standalone');
    }

    createMarkerNavigator(app: GLSPSemanticApp): MarkerNavigator {
        return new StandaloneMarkerNavigator(app);
    }

    /**
     * Launches the browser and goes to the provided URL.
     *
     * See {@link StandaloneIntegrationOptions} for more options.
     */
    protected override async launch(): Promise<void> {
        await this.page.goto(this.options.url);
        await this.assertMetadataAPI();
        await expect(this.page.locator(`${SVGMetadataUtils.typeAttrOf('graph')} svg.sprotty-graph > g`)).toBeVisible();
    }
}

/**
 * Creates {@link StandaloneIntegrationOptions} for use as the `integrationOptions` test option.
 *
 * @param config URL of the standalone GLSP-Client
 * @returns Options carrying the factory for the {@link StandaloneIntegration}
 */
export function defineStandaloneIntegration(config: StandaloneIntegrationConfig): StandaloneIntegrationOptions {
    return {
        ...config,
        type: 'Standalone',
        integrationFactory: (args, options) => new StandaloneIntegration(args, options)
    };
}
