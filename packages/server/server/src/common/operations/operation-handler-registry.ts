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
import { Args, CreateOperation, MaybeArray, Operation, asArray } from '@eclipse-glsp/protocol';
import { inject, injectable, multiInject, optional } from 'inversify';
import { ClientSessionInitializer } from '../session/client-session-initializer';
import { Registry } from '../utils/registry';
import { CreateOperationHandler } from './create-operation-handler';
import { OperationHandler, OperationHandlerConstructor, OperationHandlerFactory } from './operation-handler';

@injectable()
export class OperationHandlerRegistry extends Registry<string, OperationHandler> {
    registerHandler(handler: OperationHandler): boolean {
        if (CreateOperationHandler.is(handler)) {
            handler.elementTypeIds.forEach(typeId => this.register(`${handler.operationType}_${typeId}`, handler));
            return true;
        } else {
            return this.register(handler.operationType, handler);
        }
    }

    getOperationHandler(operation: Operation): OperationHandler | undefined {
        return CreateOperation.is(operation) ? this.get(`${operation.kind}_${operation.elementTypeId}`) : this.get(operation.kind);
    }
}

@injectable()
export class OperationHandlerRegistryInitializer implements ClientSessionInitializer {
    /**
     * The operation handler registry has to be populated before any other initializer runs. In particular,
     * the {@link ActionHandlerRegistryInitializer} instantiates the `OperationActionHandler` whose action kinds are
     * derived from the registered operation handlers.
     */
    static readonly PRIORITY = 1000;

    readonly priority = OperationHandlerRegistryInitializer.PRIORITY;

    @inject(OperationHandlerFactory)
    protected factory: OperationHandlerFactory;

    /**
     * Each module contributes its own (array) binding for {@link OperationHandlerConstructor}
     * (see {@link InstanceMultiBinding}), so the injected value is a list of contributions that is flattened on use.
     */
    @multiInject(OperationHandlerConstructor)
    @optional()
    protected handlerConstructors: MaybeArray<OperationHandlerConstructor>[] = [];

    @inject(OperationHandlerRegistry)
    protected registry: OperationHandlerRegistry;

    initialize(_args?: Args): void {
        const constructors = new Set(this.handlerConstructors.flatMap(contribution => asArray(contribution)));
        const handlers = [...constructors].map(constructor => this.factory(constructor));
        handlers.forEach(handler => this.registry.registerHandler(handler));
    }
}
