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
import { CapabilityKey, GLSPCapability } from '@eclipse-glsp/protocol';
import { BindingContext } from '@eclipse-glsp/protocol/lib/di';
import { Container } from 'inversify';
import { describe, expect, it } from 'vitest';
import { CapabilityContribution } from '../capabilities/capability-contribution';
import { DefaultSessionCapabilityProvider, SessionCapabilityProvider } from '../capabilities/session-capability-provider';
import { CapabilityFeatureModule } from './capability-feature-module';
import { ServerFeature, ServerFeatureDescription } from './feature';
import { ServerFeatureModule } from './server-feature-module';

class PopupTestModule extends CapabilityFeatureModule {
    override get featureKey(): GLSPCapability {
        return GLSPCapability.Popup;
    }

    protected registerBindings(_context: BindingContext): void {}
}

class PopupTestSubModule extends PopupTestModule {}

class CustomTestModule extends ServerFeatureModule {
    override get featureKey(): string {
        return 'acme.custom';
    }

    override get requiredFeatures(): string[] {
        return [GLSPCapability.Popup];
    }

    protected registerBindings(_context: BindingContext): void {}
}

class AcmeCapabilityTestModule extends CapabilityFeatureModule {
    override get featureKey(): CapabilityKey {
        return 'acme.capability';
    }

    protected registerBindings(_context: BindingContext): void {}
}

class InvalidTestModule extends ServerFeatureModule {
    override get featureKey(): string {
        return '';
    }

    protected registerBindings(_context: BindingContext): void {}
}

describe('ServerFeatureModule', () => {
    it('should derive a shared feature id from the feature key', () => {
        expect(new PopupTestModule().featureId).toBe(Symbol.for('glsp.popup'));
        expect(new PopupTestSubModule().featureId).toBe(new PopupTestModule().featureId);
    });

    it('should fail on an invalid feature key', () => {
        expect(() => new InvalidTestModule()).toThrow(/non-empty constant string/);
    });

    it('should publish its feature description', () => {
        const container = new Container();
        container.load(new PopupTestModule(), new CustomTestModule());
        const descriptions = container.getAll<ServerFeatureDescription>(ServerFeature);
        expect(descriptions).toEqual([
            { featureKey: 'glsp.popup', capability: true },
            { featureKey: 'acme.custom', capability: false }
        ]);
    });

    it('should fail loading if a required feature is not loaded', () => {
        const container = new Container();
        expect(() => container.load(new CustomTestModule())).toThrow(
            "Could not load feature module 'acme.custom'. Required modules are not loaded: glsp.popup"
        );
        container.load(new PopupTestModule());
        expect(() => container.load(new CustomTestModule())).not.toThrow();
    });
});

describe('DefaultSessionCapabilityProvider', () => {
    function createProvider(...contributions: CapabilityContribution[]): SessionCapabilityProvider {
        const container = new Container();
        container.load(new PopupTestModule());
        contributions.forEach(contribution => container.bind(CapabilityContribution).toConstantValue(contribution));
        container.bind(SessionCapabilityProvider).to(DefaultSessionCapabilityProvider);
        return container.get<SessionCapabilityProvider>(SessionCapabilityProvider);
    }

    it('should report loaded custom capability features but no infrastructure features', async () => {
        const container = new Container();
        container.load(new PopupTestModule(), new CustomTestModule(), new AcmeCapabilityTestModule());
        container.bind(SessionCapabilityProvider).to(DefaultSessionCapabilityProvider);
        const capabilities = await container.get<SessionCapabilityProvider>(SessionCapabilityProvider).getCapabilities();
        expect(capabilities['acme.capability']).toBe(true);
        expect(capabilities).not.toHaveProperty('acme.custom');
    });

    it('should report loaded features as enabled and all other GLSP capabilities as disabled', async () => {
        const capabilities = await createProvider().getCapabilities();
        expect(capabilities[GLSPCapability.Popup]).toBe(true);
        expect(capabilities[GLSPCapability.ChangeBounds]).toBe(false);
        expect(capabilities[GLSPCapability.Layout]).toBe(false);
    });

    it('should merge contributions in binding order and pass the session args', async () => {
        const capabilities = await createProvider(
            { contribute: () => ({ [GLSPCapability.Popup]: false, 'acme.custom': 1 }) },
            { contribute: async args => ({ 'acme.custom': args?.value }) }
        ).getCapabilities({ value: 2 });
        expect(capabilities[GLSPCapability.Popup]).toBe(false);
        expect(capabilities['acme.custom']).toBe(2);
    });
});
