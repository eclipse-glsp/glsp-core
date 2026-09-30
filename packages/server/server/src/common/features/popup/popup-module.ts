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
import { FeatureKey, GLSPCapability } from '@eclipse-glsp/protocol';
import { GLSPServerFeature } from '../../server-feature-keys';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { ActionHandlerConstructor } from '../../actions/action-handler';
import { BindingTarget, applyBindingTarget } from '../../di/binding-target';
import { InstanceMultiBinding } from '../../di/multi-binding';
import { CapabilityFeatureModule } from '../../di/capability-feature-module';
import { PopupModelFactory } from './popup-model-factory';
import { RequestPopupModelActionHandler } from './request-popup-model-action-handler';

/**
 * Feature module for hover popups. Reported as {@link GLSPCapability.Popup} capability.
 *
 * Abstract because popups require a diagram-language-specific {@link PopupModelFactory}: to support popups,
 * add a concrete subclass that implements {@link PopupModule.bindPopupModelFactory} to the diagram setup.
 *
 * Provides:
 * - {@link RequestPopupModelActionHandler}
 * - {@link PopupModelFactory}
 */
export abstract class PopupModule extends CapabilityFeatureModule {
    override get featureKey(): GLSPCapability {
        return GLSPServerFeature.Popup;
    }

    override get requiredFeatures(): FeatureKey[] {
        return [GLSPServerFeature.SourceModel];
    }

    protected registerBindings(context: BindingContext): void {
        applyBindingTarget(context, PopupModelFactory, this.bindPopupModelFactory()).inSingletonScope();
        this.configureMultiBinding(new InstanceMultiBinding<ActionHandlerConstructor>(ActionHandlerConstructor), binding =>
            this.configureActionHandlers(binding)
        );
    }

    protected abstract bindPopupModelFactory(): BindingTarget<PopupModelFactory>;

    protected configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
        binding.add(RequestPopupModelActionHandler);
    }
}
