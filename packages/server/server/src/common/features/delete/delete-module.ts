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
import { GLSPCapability } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { InstanceMultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { OperationHandlerConstructor } from '../../operations/operation-handler';
import { OperationsModule } from '../../operations/operations-module';

/**
 * Feature module for deleting elements. Reported as {@link GLSPCapability.Delete} capability.
 *
 * Abstract because the `DeleteElementOperation` handler depends on the source model: to support this feature, add a subclass
 * that implements {@link DeleteModule.bindDeleteOperationHandler} (e.g. the GModel variant `GModelDeleteModule`).
 */
export abstract class DeleteModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.Delete;

    override get featureKey(): GLSPCapability {
        return DeleteModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(this.bindDeleteOperationHandler());
    }

    /** Returns the source-model-specific handler for `DeleteElementOperation`s. */
    protected abstract bindDeleteOperationHandler(): OperationHandlerConstructor;
}
