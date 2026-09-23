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
import { Action } from '../../action-protocol/base-protocol';
import { SessionCapabilities } from './session-capabilities';

/**
 * Reserved for future use: sent from the server to the client to update the capabilities of a session
 * after initialization (e.g. when switching a session to readonly mode). Not yet dispatched by any GLSP server.
 * A server announces support via `ServerCapabilities.dynamicCapabilities`.
 * @alpha
 */
export interface CapabilitiesChangedAction extends Action {
    kind: typeof CapabilitiesChangedAction.KIND;
    /** Partial delta: present keys replace the previous values, `false` disables a capability. */
    capabilities: SessionCapabilities;
}

export namespace CapabilitiesChangedAction {
    export const KIND = 'capabilitiesChanged';
}
