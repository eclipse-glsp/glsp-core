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
import { SessionCapabilities } from '../client-server-protocol/capabilities/session-capabilities';
import { hasObjectProp } from '../utils/type-util';
import { Action } from './base-protocol';

/**
 * Sent from the server to the client to update the capabilities of a client session after its initialization
 * (e.g. when a session is switched to readonly mode). Only sent to clients that registered the action kind as client
 * action kind of the session (see `InitializeClientSessionParameters.clientActionKinds`).
 * The corresponding namespace declares the action kind as constant and offers helper functions for type guard checks
 * and creating new `CapabilitiesChangedAction`s.
 * @alpha
 */
export interface CapabilitiesChangedAction extends Action {
    kind: typeof CapabilitiesChangedAction.KIND;
    /**
     * Partial delta of the session capabilities: present keys replace the previous values, `false` disables a
     * capability. Absent keys keep their previous value.
     */
    capabilities: SessionCapabilities;
}

export namespace CapabilitiesChangedAction {
    export const KIND = 'capabilitiesChanged';

    export function is(object: unknown): object is CapabilitiesChangedAction {
        return Action.hasKind(object, KIND) && hasObjectProp(object, 'capabilities');
    }

    export function create(capabilities: SessionCapabilities): CapabilitiesChangedAction {
        return { kind: KIND, capabilities };
    }
}
