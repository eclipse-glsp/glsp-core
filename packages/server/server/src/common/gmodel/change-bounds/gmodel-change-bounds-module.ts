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
import { ChangeBoundsModule } from '../../features/change-bounds/change-bounds-module';
import { OperationHandlerConstructor } from '../../operations/operation-handler';
import { GModelChangeBoundsOperationHandler } from './change-bounds-operation-handler';

/** {@link ChangeBoundsModule} that uses the {@link GModelChangeBoundsOperationHandler}. */
export class GModelChangeBoundsModule extends ChangeBoundsModule {
    protected override bindChangeBoundsOperationHandler(): OperationHandlerConstructor {
        return GModelChangeBoundsOperationHandler;
    }
}
