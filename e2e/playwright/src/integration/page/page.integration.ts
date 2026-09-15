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
import { Integration } from '../integration.base';
import type { IntegrationArgs } from '../integration.type';
import type { PageIntegrationConfig, PageIntegrationOptions } from './page.options';

/**
 * The {@link PageIntegration} provides an unchanged experience of Playwright.
 */
export class PageIntegration extends Integration implements MarkerNavigatorIntegration {
    override page = this.args.page;

    constructor(
        args: IntegrationArgs,
        protected readonly options?: PageIntegrationOptions
    ) {
        super(args, 'Page');
    }

    createMarkerNavigator(app: GLSPSemanticApp): MarkerNavigator {
        return new StandaloneMarkerNavigator(app);
    }

    /**
     * Launches the browser and *optionally* goes to the provided URL.
     *
     * See {@link PageIntegrationOptions} for more options.
     */
    protected override async launch(): Promise<void> {
        if (this.options) {
            await this.page.goto(this.options.url);
            await this.assertMetadataAPI();
            await this.page.waitForSelector(`${SVGMetadataUtils.typeAttrOf('graph')} svg.sprotty-graph > g`);
        }
    }
}

/**
 * Creates {@link PageIntegrationOptions} for use as the `integrationOptions` test option.
 *
 * @param config URL of the page to open
 * @returns Options carrying the factory for the {@link PageIntegration}
 */
export function definePageIntegration(config: PageIntegrationConfig): PageIntegrationOptions {
    return {
        ...config,
        type: 'Page',
        integrationFactory: (args, options) => new PageIntegration(args, options)
    };
}
