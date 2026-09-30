/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
import { Args } from '@eclipse-glsp/protocol';
import { interfaces } from 'inversify';

export const ClientSessionInitializer = Symbol('ClientSessionInitializer');

/**
 * Client session initializers are services the are used to configure the client session container after its initialization.
 * The {@link ClientSessionFactory} is expected to retrieve and invoke all client session listeners from the container in the
 *  {@link ClientSessionFactory.create} method.
 */
export interface ClientSessionInitializer {
    /**
     * Optional execution priority. Initializers with a higher priority are executed first (default: `0`).
     * Initializers with the same priority are executed in binding order.
     */
    readonly priority?: number;
    initialize(args?: Args): void;
}

/**
 * Retrieves all {@link ClientSessionInitializer}s from the given (fully loaded) client session container
 * and executes them ordered by their {@link ClientSessionInitializer.priority}.
 *
 * @param container The client session container.
 * @param args The (optional) client session args.
 */
export function runClientSessionInitializers(container: interfaces.Container, args?: Args): void {
    const initializers = container.isBound(ClientSessionInitializer)
        ? container.getAll<ClientSessionInitializer>(ClientSessionInitializer)
        : [];
    initializers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).forEach(initializer => initializer.initialize(args));
}
