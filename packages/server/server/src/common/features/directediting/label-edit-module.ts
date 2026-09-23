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
import { GLSPCapability, SessionCapabilities } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { inject, injectable, optional } from 'inversify';
import { ActionHandlerConstructor } from '../../actions/action-handler';
import { CapabilityContribution } from '../../capabilities/capability-contribution';
import { BindingTarget, applyBindingTarget, applyOptionalBindingTarget } from '../../di/binding-target';
import { InstanceMultiBinding, MultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { ContextEditValidators } from '../../di/service-identifiers';
import { OperationHandlerConstructor } from '../../operations/operation-handler';
import { OperationsModule } from '../../operations/operations-module';
import { ContextEditValidator } from './context-edit-validator';
import { ContextEditValidatorRegistry, DefaultContextEditValidatorRegistry } from './context-edit-validator-registry';
import { LabelEditValidator } from './label-edit-validator';
import { RequestEditValidationHandler } from './request-edit-validation-handler';

/**
 * Reports the {@link GLSPCapability.LabelEdit} capability with `validation: true` if a {@link LabelEditValidator} is bound.
 */
@injectable()
export class LabelEditCapabilityContribution implements CapabilityContribution {
    @inject(LabelEditValidator)
    @optional()
    protected labelEditValidator?: LabelEditValidator;

    contribute(): Partial<SessionCapabilities> {
        return { [GLSPCapability.LabelEdit]: this.labelEditValidator ? { validation: true } : true };
    }
}

/**
 * Feature module for label editing. Reported as {@link GLSPCapability.LabelEdit} capability.
 *
 * Abstract because the `ApplyLabelEditOperation` handler depends on the source model: to support this feature,
 * add a subclass that implements {@link LabelEditModule.bindApplyLabelEditOperationHandler} (e.g. the GModel variant
 * `GModelLabelEditModule`).
 *
 * Provides:
 * - {@link RequestEditValidationHandler}
 * - {@link ContextEditValidatorRegistry}, {@link ContextEditValidators} (empty)
 * - {@link LabelEditValidator} as optional binding
 * - {@link LabelEditCapabilityContribution}
 */
export abstract class LabelEditModule extends CapabilityFeatureModule {
    static readonly KEY = GLSPCapability.LabelEdit;

    override get featureKey(): GLSPCapability {
        return LabelEditModule.KEY;
    }

    override get requiredFeatures(): string[] {
        return [OperationsModule.KEY];
    }

    protected registerBindings(context: BindingContext): void {
        applyOptionalBindingTarget(context, LabelEditValidator, this.bindLabelEditValidator());
        applyBindingTarget(context, ContextEditValidatorRegistry, this.bindContextEditValidatorRegistry()).inSingletonScope();
        this.configureMultiBinding(new MultiBinding<ContextEditValidator>(ContextEditValidators), binding =>
            this.configureContextEditValidators(binding)
        );
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
        this.configureMultiBinding(new InstanceMultiBinding<OperationHandlerConstructor>(OperationHandlerConstructor), binding =>
            this.configureOperationHandlers(binding)
        );
        applyOptionalBindingTarget(context, CapabilityContribution, this.bindCapabilityContribution());
    }

    protected bindLabelEditValidator(): BindingTarget<LabelEditValidator> | undefined {
        return undefined;
    }

    protected bindContextEditValidatorRegistry(): BindingTarget<ContextEditValidatorRegistry> {
        return DefaultContextEditValidatorRegistry;
    }

    protected configureContextEditValidators(binding: MultiBinding<ContextEditValidator>): void {
        // empty as default
    }

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestEditValidationHandler);
    }

    protected configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
        binding.add(this.bindApplyLabelEditOperationHandler());
    }

    /** Returns the source-model-specific handler for `ApplyLabelEditOperation`s. */
    protected abstract bindApplyLabelEditOperationHandler(): OperationHandlerConstructor;

    protected bindCapabilityContribution(): BindingTarget<CapabilityContribution> | undefined {
        return LabelEditCapabilityContribution;
    }
}
