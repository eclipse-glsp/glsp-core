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
import type { Integration } from './integration.base';
import type { IntegrationArgs, IntegrationOptions } from './integration.type';
import { PageIntegration } from './page/page.integration';
import { PageIntegrationOptions } from './page/page.options';
import { StandaloneIntegration } from './standalone/standalone.integration';
import { StandaloneIntegrationOptions } from './standalone/standalone.options';

/**
 * Creates the {@link Integration} for the given options.
 *
 * Options created by a `define*Integration()` helper carry the factory supplied by their package.
 *
 * @param args Playwright fixtures handed to the integration
 * @param options Integration options, or `undefined` for the default page integration
 * @returns The integration instance, not yet initialized or started
 */
export function createIntegration(args: IntegrationArgs, options?: IntegrationOptions): Integration {
    if (options === undefined) {
        return new PageIntegration(args);
    }

    if (options.integrationFactory) {
        return options.integrationFactory(args, options);
    }

    // Read before the guards below narrow `options`. In a program that contains only this
    // package the two built-in guards are exhaustive, so `options` would narrow to `never`,
    // even though options contributed by another package do reach the `throw` at runtime.
    const { type } = options;

    // The built-in integrations stay usable with hand-written option literals, since their
    // `integrationFactory` is optional.
    if (PageIntegrationOptions.is(options)) {
        return new PageIntegration(args, options);
    }
    if (StandaloneIntegrationOptions.is(options)) {
        return new StandaloneIntegration(args, options);
    }

    throw new Error(
        `Cannot create an integration for type "${type}": no 'integrationFactory' was provided.\n` +
            'Create the options with the helper of the corresponding integration package, e.g.\n' +
            "  import { defineTheiaIntegration } from '@eclipse-glsp/playwright-theia';\n" +
            '  const integrationOptions = defineTheiaIntegration({ url, widgetId });'
    );
}
