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
import { CapabilityKey } from '@eclipse-glsp/protocol';
import { ServerFeatureDescription } from './feature';
import { ServerFeatureModule } from './server-feature-module';

/**
 * A {@link ServerFeatureModule} that is reported as capability to the client, using its feature key as capability key:
 * the capability is enabled (`true`) if the module is loaded and disabled (`false` for GLSP capabilities, absent
 * for custom capabilities) if it is not.
 *
 * The feature key is a {@link CapabilityKey}: GLSP capability features use a `GLSPCapability` (`glsp.` prefix), adopters
 * extend this class with a key in their own namespace (e.g. `myCompany.simulation`) to report a custom capability. Capabilities with options
 * or session-dependent values additionally bind a `CapabilityContribution`, which takes precedence over the
 * default `true`.
 */
export abstract class CapabilityFeatureModule extends ServerFeatureModule {
    abstract override get featureKey(): CapabilityKey;

    protected override createFeatureDescription(): ServerFeatureDescription {
        return { featureKey: this.featureKey, capability: true };
    }
}
