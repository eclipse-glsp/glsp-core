/********************************************************************************
 * Copyright (c) 2024-2026 EclipseSource and others.
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

import { METADATA_KEY, decorate, injectable } from 'inversify';
import { JsonrpcClientProxy } from '../client-server-protocol/jsonrpc/base-jsonrpc-glsp-client';

// DI and protocol modules can be loaded through multiple paths while sharing the same proxy class.
// Only decorate an undecorated class so a second load does not throw.
if (!Reflect.hasOwnMetadata(METADATA_KEY.PARAM_TYPES, JsonrpcClientProxy)) {
    decorate(injectable(), JsonrpcClientProxy);
}
