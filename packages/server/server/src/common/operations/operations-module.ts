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
import { distinctAdd } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionHandlerConstructor } from '../actions/action-handler';
import { BindingTarget, applyBindingTarget } from '../di/binding-target';
import { InstanceMultiBinding, MultiBinding } from '../di/multi-binding';
import { ServerFeatureModule } from '../di/server-feature-module';
import { Operations } from '../di/service-identifiers';
import { BaseDiagramModule } from '../di/base-diagram-module';
import { ClientSessionInitializer } from '../session/client-session-initializer';
import { CompoundOperationHandler } from './compound-operation-handler';
import { OperationActionHandler } from './operation-action-handler';
import { OperationHandlerConstructor, OperationHandlerFactory } from './operation-handler';
import { OperationHandlerRegistry, OperationHandlerRegistryInitializer } from './operation-handler-registry';

/**
 * Provides the operation infrastructure. Required by all features that contribute operation handlers.
 *
 * Provides:
 * - {@link OperationHandlerConstructor} contributions ({@link CompoundOperationHandler})
 * - {@link OperationHandlerFactory}, {@link OperationHandlerRegistry}, {@link OperationHandlerRegistryInitializer}
 * - {@link Operations}, {@link OperationActionHandler}
 */
export class OperationsModule extends ServerFeatureModule {
    static readonly KEY = 'glsp.operations';

    override get featureKey(): string {
        return OperationsModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [BaseDiagramModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
        applyBindingTarget(context, OperationHandlerRegistry, this.bindOperationHandlerRegistry()).inSingletonScope();
        applyBindingTarget(context, OperationHandlerFactory, this.bindOperationHandlerFactory());
        applyBindingTarget(context, Operations, this.bindOperations()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
        this.configureMultiBinding(new MultiBinding<ClientSessionInitializer>(ClientSessionInitializer), binding =>
            this.configureClientSessionInitializers(binding)
        );
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(CompoundOperationHandler);
    }

    protected bindOperationHandlerRegistry(): BindingTarget<OperationHandlerRegistry> {
        return OperationHandlerRegistry;
    }

    protected bindOperationHandlerFactory(): BindingTarget<OperationHandlerFactory> {
        return { dynamicValue: ctx => constructor => ctx.container.resolve(constructor) };
    }

    /**
     * The operation kinds handled by the {@link OperationActionHandler}. Derived from the initialized
     * {@link OperationHandlerRegistry}, which is populated by the {@link OperationHandlerRegistryInitializer}
     * before any other client session initializer runs.
     */
    protected bindOperations(): BindingTarget<string[]> {
        return {
            dynamicValue: ctx => {
                const operationKinds: string[] = [];
                ctx.container
                    .get<OperationHandlerRegistry>(OperationHandlerRegistry)
                    .getAll()
                    .forEach(handler => distinctAdd(operationKinds, handler.operationType));
                return operationKinds;
            }
        };
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(OperationActionHandler);
    }

    protected configureClientSessionInitializers(binding: MultiBinding<ClientSessionInitializer>): void {
        binding.add(OperationHandlerRegistryInitializer);
    }
}
