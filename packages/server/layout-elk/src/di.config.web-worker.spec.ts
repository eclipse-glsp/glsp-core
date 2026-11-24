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
import { DefaultModelState, ModelState } from '@eclipse-glsp/server';
import { Container, ContainerModule } from 'inversify';
import { afterEach, describe, expect, it } from 'vitest';
import { ElkLayoutModule } from './di.config';
import { ElkFactory } from './glsp-elk-layout-engine';

/*
 * elkjs checks whether it runs in a dedicated web worker (`self` present, `document` absent) only once, when the first
 * ELK instance loads its worker code. This test must create the first ELK instance of its module scope, so it has a file
 * of its own; vitest isolates the modules of each test file.
 */

describe('ElkLayoutModule in a web worker', () => {
    const globalScope = globalThis as { self?: { onmessage?: unknown } };

    afterEach(() => {
        delete globalScope.self;
    });

    it('creates an ELK instance that lays out graphs without taking over the message handler of the worker', async () => {
        const onmessage = (): void => {};
        globalScope.self = { onmessage };
        const container = new Container();
        container.load(
            new ContainerModule(bind => bind(ModelState).toConstantValue(new DefaultModelState())),
            new ElkLayoutModule({ algorithms: ['layered'], isWebWorker: true })
        );

        const elk = container.get<ElkFactory>(ElkFactory)();
        const graph = await elk.layout({ id: 'graph', children: [{ id: 'node', width: 50, height: 30 }] });

        expect(graph.children![0]).toMatchObject({ x: 12, y: 12 });
        expect(globalScope.self.onmessage).toBe(onmessage);
    });
});
