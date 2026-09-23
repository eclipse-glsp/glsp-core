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
/**
 * Service identifier for {@link ServerFeatureDescription}s. Every loaded `ServerFeatureModule` contributes
 * exactly one description, so `container.getAll(ServerFeature)` lists all features of a client session.
 */
export const ServerFeature = Symbol('ServerFeature');

/**
 * Describes a server feature that has been loaded into a client session container.
 */
export interface ServerFeatureDescription {
    /** The stable feature key, e.g. `glsp.changeBounds`. */
    readonly featureKey: string;
    /**
     * `true` if this feature is reported as capability under its feature key (see `CapabilityFeatureModule`).
     * Loaded capability features are reported as enabled (`true`) unless a `CapabilityContribution` provides a more
     * specific value (e.g. options).
     */
    readonly capability: boolean;
}
