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
import type { Locator, Page } from '@playwright/test';
import { SVGMetadataUtils } from '../glsp/graph';
import type { IntegrationArgs, IntegrationType } from './integration.type';

/**
 * Base class for all integrations. It provides lifecycle methods and
 * can assert the existence of the SVG Metadata API in the GLSP-Client.
 */
export abstract class Integration {
    abstract readonly page: Page;

    constructor(
        protected readonly args: IntegrationArgs,
        readonly type: IntegrationType
    ) {}

    /**
     * Prefixes the provided selector and returns the new {@link Locator}.
     * This functionality can be used to change the root selector depending on the underyling integration.
     *
     * @param selector Selector which should be prefixed
     * @returns Prefixed locator
     */
    prefixRootSelector(selector: string): Locator {
        return this.page.locator(selector);
    }

    /**
     * Executed after the constructor to execute async commands
     */
    async initialize(): Promise<void> {
        // Nothing to do
    }

    /**
     * Prepares the test execution. It runs the lifecycle methods
     * to reach the starting point of the test case by launching the GLSP-Client-Integration
     * (e.g., running the Electron Application, loading the page, opening Theia).
     *
     * **Lifecycle**
     *
     * This method is executed before any test case and consists
     * of the following lifecycle.
     *
     * 1. BeforeLaunch
     * 1. Launch
     * 1. AfterLaunch
     *
     * @returns Page object of the launched application
     */
    async start(): Promise<Page> {
        await this.beforeLaunch();
        await this.launch();
        await this.afterLaunch();

        return this.page;
    }

    /**
     * Clean up the integration
     */
    async close(): Promise<void> {
        // Nothing to do
    }

    /**
     * Executed before launching the integration
     */
    protected async beforeLaunch(): Promise<void> {
        // Nothing to do
    }

    /**
     * Launches the integration
     */
    protected async launch(): Promise<void> {
        // Nothing to do
    }

    /**
     * Executed after launching the integration
     */
    protected async afterLaunch(): Promise<void> {
        // Nothing to do
    }

    /**
     * Asserts the existence of the SVG Metadata API
     */
    async assertMetadataAPI(): Promise<void> {
        return this.prefixRootSelector(SVGMetadataUtils.apiAttr).waitFor({
            state: 'attached'
        });
    }
}
