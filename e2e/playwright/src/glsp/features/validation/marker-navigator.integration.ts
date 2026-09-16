/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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

import type { Integration } from '../../../integration';
import { hasProperty } from '../../../utils/ts.utils';
import type { GLSPSemanticApp } from '../../app';
import { MarkerNavigator } from './marker-navigator';

export class StandaloneMarkerNavigator extends MarkerNavigator {
    protected readonly forwardKey = 'Control+.';
    protected readonly backwardKey = 'Control+,';
}

/** Implemented by integrations that provide host-specific marker navigation. */
export interface MarkerNavigatorIntegration extends Integration {
    createMarkerNavigator(app: GLSPSemanticApp): MarkerNavigator;
}

export namespace MarkerNavigatorIntegration {
    export function is(integration: Integration): integration is MarkerNavigatorIntegration {
        return hasProperty<MarkerNavigatorIntegration>(integration, 'createMarkerNavigator');
    }
}

/**
 * Returns the {@link MarkerNavigator} for the active integration.
 *
 * Integrations must explicitly provide bindings because host applications can reserve these keys.
 *
 * @param integration Active integration
 * @param app App under test
 * @returns Navigator matching the active integration
 */
export function provideMarkerNavigator(integration: Integration, app: GLSPSemanticApp): MarkerNavigator {
    if (MarkerNavigatorIntegration.is(integration)) {
        return integration.createMarkerNavigator(app);
    }
    throw new Error(`Integration '${integration.type}' does not provide marker navigation`);
}
