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
import { Args, CapabilitiesChangedAction, GLSPCapability, SessionCapabilities } from '@eclipse-glsp/protocol';
import { inject, injectable, multiInject, optional } from 'inversify';
import { ActionDispatcher } from '../actions/action-dispatcher';
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

    /**
     * Updates the capabilities of the client session after its initialization (e.g. when switching the session to
     * readonly mode) and notifies the client with a {@link CapabilitiesChangedAction}. Subsequent
     * {@link SessionCapabilityProvider.getCapabilities} calls include the update.
     *
     * Note that the action is only forwarded if the client registered a handler for
     * {@link CapabilitiesChangedAction.KIND} (i.e. it is part of the client action kinds of the session).
     *
     * @param delta The changed capabilities: present keys replace the previous values, `false` disables a capability.
     */
    updateCapabilities(delta: SessionCapabilities): Promise<void>;
}

/**
 * Default {@link SessionCapabilityProvider} that derives the capabilities from the loaded server features:
 * 1. every GLSP-defined capability ({@link GLSPCapability}) is `false` by default,
 * 2. every loaded capability feature ({@link ServerFeature}, see `CapabilityFeatureModule`) is enabled (`true`),
 * 3. all {@link CapabilityContribution}s are shallow-merged on top, in binding order,
 * 4. all updates (see {@link SessionCapabilityProvider.updateCapabilities}) are shallow-merged on top.
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

    @inject(ActionDispatcher)
    protected actionDispatcher: ActionDispatcher;

    /** The accumulated updates of {@link DefaultSessionCapabilityProvider.updateCapabilities}. */
    protected updates: SessionCapabilities = {};

    async getCapabilities(args?: Args): Promise<SessionCapabilities> {
        const capabilities: SessionCapabilities = {};
        Object.values(GLSPCapability).forEach(key => (capabilities[key] = false));
        this.features.forEach(feature => {
            if (feature.capability) {
                (capabilities as Record<string, unknown>)[feature.featureKey] = true;
            }
        });
        const contributed = await Promise.all(this.contributions.map(contribution => contribution.contribute(args)));
        const merged = contributed.reduce<SessionCapabilities>((result, part) => ({ ...result, ...part }), capabilities);
        return { ...merged, ...this.updates };
    }

    async updateCapabilities(delta: SessionCapabilities): Promise<void> {
        this.updates = { ...this.updates, ...delta };
        await this.actionDispatcher.dispatch(CapabilitiesChangedAction.create(delta));
    }
}
