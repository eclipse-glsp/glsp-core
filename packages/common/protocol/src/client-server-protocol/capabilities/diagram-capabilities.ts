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
import { Capability, CapabilityKey } from './capability';
import { GLSPCapability } from './glsp-capability';
import { LabelEditCapabilityOptions } from './label-edit-capability';
import { LayoutCapabilityOptions } from './layout-capability';
import { ValidationCapabilityOptions } from './validation-capability';

/**
 * The option types of the {@link GLSPCapability}s that support options. All other GLSP capabilities are plain booleans.
 */
export interface GLSPCapabilityOptions {
    [GLSPCapability.LabelEdit]: LabelEditCapabilityOptions;
    [GLSPCapability.Validation]: ValidationCapabilityOptions;
    [GLSPCapability.Layout]: LayoutCapabilityOptions;
}

/**
 * The capabilities of the server for one diagram type, keyed by {@link GLSPCapability} or custom (adopter) key.
 *
 * - Every key is a {@link CapabilityKey}: the `glsp.` prefix is reserved for GLSP, adopters use their own prefix.
 * - Receivers must ignore unknown keys.
 * - An absent key means "unknown" and should be interpreted with {@link Capability.isEnabled} (legacy default: enabled).
 */
export type DiagramCapabilities = {
    [K in GLSPCapability]?: Capability<K extends keyof GLSPCapabilityOptions ? GLSPCapabilityOptions[K] : never>;
} & { [key: CapabilityKey]: unknown };
