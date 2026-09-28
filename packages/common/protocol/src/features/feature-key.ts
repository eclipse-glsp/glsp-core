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
 * The stable, namespaced key of a feature, e.g. `glsp.changeBoundsTool`.
 *
 * The `glsp.` prefix is reserved for GLSP (see {@link GLSPFeatureKey}), adopters use
 * their own namespace (e.g. `myCompany.simulation`). Keys are plain strings, so a feature can be referenced (e.g. removed
 * from a container configuration) without importing its implementation.
 *
 * Client and server use the same key for the two halves of one feature (e.g. `glsp.labelEdit`). This is also the key
 * under which the server reports the feature as capability (see `CapabilityKey`).
 *
 * Each layer defines its keys in one root registry object (e.g. `GLSPCapability`, `GLSPServerFeature`, `GLSPClientFeature`):
 * ```typescript
 * export const MyFeature = { Simulation: 'myCompany.simulation' } as const satisfies Record<string, FeatureKey>;
 * ```
 */
export type FeatureKey = `${string}.${string}`;

/**
 * The key of a feature that is defined by GLSP, i.e. a {@link FeatureKey} in the reserved `glsp.` namespace.
 * GLSP registries use `satisfies Record<string, GLSPFeatureKey>` so that the namespace is checked at compile time.
 */
export type GLSPFeatureKey = `glsp.${string}`;

export namespace FeatureKey {
    /**
     * Checks whether the given value is a {@link FeatureKey}, i.e. a string with a namespace separator.
     */
    export function is(value: unknown): value is FeatureKey {
        return typeof value === 'string' && value.indexOf('.') > 0 && value.indexOf('.') < value.length - 1;
    }

    /**
     * Returns the feature id (i.e. the service identifier bound by a `FeatureModule`) for the given key.
     *
     * The id is derived with `Symbol.for`, so modules and definitions that are created independently (e.g. a default
     * module and an adopter replacement) share the same id without having to import each other. `Symbol.for` is
     * process-global, which is safe because feature ids only have to be unique within one container.
     */
    export function toId(key: FeatureKey): symbol {
        return Symbol.for(key);
    }
}
