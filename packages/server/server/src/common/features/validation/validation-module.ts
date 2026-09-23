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
import { ActionHandlerConstructor } from '../../actions/action-handler';
import { BindingTarget, applyOptionalBindingTarget } from '../../di/binding-target';
import { InstanceMultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { BaseDiagramModule } from '../../di/base-diagram-module';
import { ModelValidator } from './model-validator';
import { RequestMarkersHandler } from './request-markers-handler';

/**
 * Feature module for model validation. Reported as {@link GLSPCapability.Validation} capability.
 *
 * Provides:
 * - {@link RequestMarkersHandler}
 * - {@link ModelValidator} as optional binding
 */
export class ValidationModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.Validation;

    override get featureKey(): GLSPCapability {
        return ValidationModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [BaseDiagramModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyOptionalBindingTarget(context, ModelValidator, this.bindModelValidator());
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
    }

    protected bindModelValidator(): BindingTarget<ModelValidator> | undefined {
        return undefined;
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestMarkersHandler);
    }
}
