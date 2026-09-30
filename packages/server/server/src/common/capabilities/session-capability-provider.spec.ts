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
import { CapabilitiesChangedAction, GLSPCapability } from '@eclipse-glsp/protocol';
import { Container } from 'inversify';
import { describe, expect, it, vi } from 'vitest';
import { ActionDispatcher } from '../actions/action-dispatcher';
import { ServerFeature } from '../di/feature';
import { ClientActionKinds } from '../di/service-identifiers';
import * as mock from '../test/mock-util';
import { DefaultSessionCapabilityProvider } from './session-capability-provider';

describe('DefaultSessionCapabilityProvider', () => {
    function createProvider(clientActionKinds?: string[]): {
        provider: DefaultSessionCapabilityProvider;
        actionDispatcher: ActionDispatcher;
    } {
        const container = new Container();
        const actionDispatcher = new mock.StubActionDispatcher();
        container.bind(ActionDispatcher).toConstantValue(actionDispatcher);
        container.bind(ServerFeature).toConstantValue({ featureKey: GLSPCapability.Delete, capability: true });
        if (clientActionKinds) {
            container.bind(ClientActionKinds).toConstantValue(new Set(clientActionKinds));
        }
        return { provider: container.resolve(DefaultSessionCapabilityProvider), actionDispatcher };
    }

    it('updateCapabilities - should notify a client that handles the action and include the update', async () => {
        const { provider, actionDispatcher } = createProvider([CapabilitiesChangedAction.KIND]);
        const dispatchSpy = vi.spyOn(actionDispatcher, 'dispatch');
        const delta = { [GLSPCapability.Delete]: false };
        await provider.updateCapabilities(delta);
        expect(dispatchSpy).toHaveBeenCalledWith(CapabilitiesChangedAction.create(delta));
        expect((await provider.getCapabilities())[GLSPCapability.Delete]).toBe(false);
    });

    it('updateCapabilities - should not dispatch the action if the client does not handle it', async () => {
        const { provider, actionDispatcher } = createProvider([]);
        const dispatchSpy = vi.spyOn(actionDispatcher, 'dispatch');
        await provider.updateCapabilities({ [GLSPCapability.Delete]: false });
        expect(dispatchSpy).not.toHaveBeenCalled();
        expect((await provider.getCapabilities())[GLSPCapability.Delete]).toBe(false);
    });
});
