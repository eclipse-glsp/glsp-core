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
/** Options of the `GLSPCapability.Layout` capability. */
export interface LayoutCapabilityOptions {
    /**
     * The layout kind of the diagram (mirrors the server-side `ServerLayoutKind`).
     * - `automatic`: the server lays out the diagram on every model update.
     * - `manual`: the server only lays out the diagram on explicit request (`LayoutOperation`).
     * - `none`: the server does not lay out the diagram.
     */
    kind: 'automatic' | 'manual' | 'none';
    /** `true` if the server expects the client to compute bounds (`RequestBoundsAction`/`ComputedBoundsAction`). */
    needsClientLayout?: boolean;
    /** `true` if model updates sent by the server should be animated by the client. */
    animatedUpdate?: boolean;
}
