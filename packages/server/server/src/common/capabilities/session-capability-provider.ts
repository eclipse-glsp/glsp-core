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
import { Args, GLSPCapability, SessionCapabilities } from '@eclipse-glsp/protocol';
import { injectable, multiInject, optional } from 'inversify';
import { ServerFeature, ServerFeatureDescription } from '../di/feature';
import { CapabilityContribution } from './capability-contribution';

export const SessionCapabilityProvider = Symbol('SessionCapabilityProvider');

/**
 * Resolves the capabilities of a client session. Bound in the client session container.
 */
export interface SessionCapabilityProvider {
    /**
     * Resolves the capabilities of the client session.
     *
     * @param args The client session args. Absent when resolving the static (connection-scoped) capabilities
     *             of a diagram type.
     */
    getCapabilities(args?: Args): Promise<SessionCapabilities>;
}

/**
 * Default {@link SessionCapabilityProvider} that derives the capabilities from the loaded server features:
 * 1. every GLSP-defined capability ({@link GLSPCapability}) is `false` by default,
 * 2. every loaded capability feature ({@link ServerFeature}, see `CapabilityFeatureModule`) is enabled (`true`),
 * 3. all {@link CapabilityContribution}s are shallow-merged on top, in binding order.
 *
 * As a consequence, removing a feature module from the diagram setup reports the corresponding capability as disabled.
 */
@injectable()
export class DefaultSessionCapabilityProvider implements SessionCapabilityProvider {
    @multiInject(ServerFeature)
    @optional()
    protected features: ServerFeatureDescription[] = [];

    @multiInject(CapabilityContribution)
    @optional()
    protected contributions: CapabilityContribution[] = [];

    async getCapabilities(args?: Args): Promise<SessionCapabilities> {
        const capabilities: SessionCapabilities = {};
        Object.values(GLSPCapability).forEach(key => (capabilities[key] = false));
        this.features.forEach(feature => {
            if (feature.capability) {
                (capabilities as Record<string, unknown>)[feature.featureKey] = true;
            }
        });
        const contributed = await Promise.all(this.contributions.map(contribution => contribution.contribute(args)));
        return contributed.reduce<SessionCapabilities>((merged, part) => ({ ...merged, ...part }), capabilities);
    }
}
