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
 * The key of a capability. Every key is namespaced with a `.`: the `glsp.` prefix is reserved for GLSP
 * (see `GLSPCapability`), adopters use their own prefix (e.g. `myCompany.simulation`).
 */
export type CapabilityKey = `${string}.${string}`;

/**
 * A capability that is either enabled/disabled (`boolean`) or enabled with additional options (`O`).
 * Modeled after LSP's `boolean | XyzOptions` pattern (e.g. `renameProvider?: boolean | RenameOptions`).
 *
 * Capabilities without options resolve to plain `boolean`.
 */
export type Capability<O = never> = [O] extends [never] ? boolean : boolean | O;

export namespace Capability {
    /**
     * Checks whether the given capability is enabled.
     * An absent (`undefined`) capability resolves to `legacyDefault`. The default is `true` because a peer that does
     * not report capabilities at all (i.e. a server that predates the capability protocol) supports every feature.
     *
     * @param capability The capability value as received from the peer.
     * @param legacyDefault The value to use if the capability is absent.
     */
    export function isEnabled(capability: Capability<object> | undefined, legacyDefault = true): boolean {
        return capability === undefined ? legacyDefault : capability !== false;
    }

    /**
     * Returns the options of the given capability, or `undefined` if the capability is absent, disabled, or
     * enabled without options (i.e. `true`).
     */
    export function options<O extends object>(capability: Capability<O> | undefined): O | undefined {
        return typeof capability === 'object' && capability !== null ? capability : undefined;
    }
}
