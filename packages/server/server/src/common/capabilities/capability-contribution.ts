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
import { Args, MaybePromise, SessionCapabilities } from '@eclipse-glsp/protocol';

export const CapabilityContribution = Symbol('CapabilityContribution');

/**
 * Contributes a slice of the {@link SessionCapabilities} of a client session.
 *
 * Contributions are multi-bound in the client session container (typically one per feature module that has capability
 * options) and are collected by the {@link SessionCapabilityProvider}. They are shallow-merged in binding order,
 * i.e. later contributions win on key collision, so adopter modules that are loaded after the defaults can override
 * GLSP capabilities. Custom capabilities must use a dot-namespaced key (e.g. `myCompany.simulation`).
 */
export interface CapabilityContribution {
    /**
     * Contributes (partial) session capabilities.
     *
     * @param args The client session args. Only set when resolving the capabilities of an actual client session,
     *             absent when resolving the static (connection-scoped) capabilities of a diagram type.
     */
    contribute(args?: Args): MaybePromise<Partial<SessionCapabilities>>;
}
