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
import { DiagramCapabilities } from './diagram-capabilities';

/**
 * Connection-scoped server capabilities, transmitted as part of the `InitializeResult`.
 * They are static per diagram type and allow a client to know what each diagram type supports before opening a session.
 */
export interface ServerCapabilities {
    /** The (static) capabilities of each diagram type that is supported by the server. */
    diagramTypes?: { [diagramType: string]: DiagramCapabilities };
    /**
     * Reserved for future use: indicates that the server may push `CapabilitiesChangedAction`s
     * to update session capabilities after initialization.
     * @alpha
     */
    dynamicCapabilities?: Capability;
    [key: CapabilityKey]: unknown;
}
