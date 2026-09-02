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

import type { Integration, IntegrationType } from '../integration';
import type { GLSPServer } from '../glsp-server';

type RecordKey = string | number | symbol;

export interface DynamicVariableOptions<TKey extends RecordKey, TValue> {
    defaultValue?: TValue;
    value?: Partial<Record<TKey, TValue | undefined>>;
}

export interface DynamicVariable<TKey extends RecordKey, TValue> {
    getOrThrow(key: TKey): TValue;
}

export abstract class BaseDynamicVariable<TKey extends RecordKey, TValue> {
    protected readonly value: Partial<Record<TKey, TValue | undefined>>;
    protected readonly defaultValue?: TValue;

    constructor(protected readonly options: DynamicVariableOptions<TKey, TValue>) {
        this.defaultValue = options?.defaultValue;
        this.value = options?.value ?? {};
    }

    getOrThrow(key: TKey): TValue {
        const value = this.value[key] ?? this.defaultValue;
        if (value === undefined) {
            throw new Error(`No value found for key ${String(key)}`);
        }
        return value;
    }
}

/**
 * @deprecated Prefer an integration capability that provides the integration-specific behavior.
 */
export class IntegrationVariable<TValue> extends BaseDynamicVariable<IntegrationType, TValue> {
    protected integration?: Integration;

    constructor(options: DynamicVariableOptions<IntegrationType, TValue> & { integration?: Integration }) {
        super(options);
        this.integration = options.integration;
    }

    get(): TValue {
        if (this.integration === undefined) {
            throw new Error('No integration set');
        }

        return super.getOrThrow(this.integration.type);
    }

    setIntegration(integration: Integration): void {
        this.integration = integration;
    }
}

export class ServerVariable<TValue> extends BaseDynamicVariable<string, TValue> {
    protected server?: GLSPServer;

    constructor(options: DynamicVariableOptions<string, TValue> & { server?: GLSPServer }) {
        super(options);
        this.server = options.server;
    }

    get(): TValue {
        if (this.server === undefined) {
            throw new Error('No GLSP server set');
        }

        return super.getOrThrow(this.server.type);
    }

    setServer(server: GLSPServer): void {
        this.server = server;
    }
}
