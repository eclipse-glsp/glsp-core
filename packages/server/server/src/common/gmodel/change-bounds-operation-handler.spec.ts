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
import { GGraph, GNode, GPort, getDefaultMapping } from '@eclipse-glsp/graph';
import { ChangeBoundsOperation } from '@eclipse-glsp/protocol';
import { Container } from 'inversify';
import { describe, expect, it } from 'vitest';
import { DiagramConfiguration } from '../diagram/diagram-configuration';
import { GModelIndex } from '../features/model/gmodel-index';
import { DefaultGModelSerializer, GModelSerializer } from '../features/model/gmodel-serializer';
import { DefaultModelState, ModelState } from '../features/model/model-state';
import { StubDiagramConfiguration } from '../test/mock-util';
import { GModelChangeBoundsOperationHandler } from './change-bounds-operation-handler';

function createHandler(root: GGraph): { handler: GModelChangeBoundsOperationHandler; modelState: ModelState } {
    const diagramConfiguration = new StubDiagramConfiguration();
    diagramConfiguration.typeMapping = getDefaultMapping();
    const modelState = new DefaultModelState();
    Object.defineProperty(modelState, 'index', { value: new GModelIndex() });
    modelState.updateRoot(root);

    const container = new Container();
    container.bind(DiagramConfiguration).toConstantValue(diagramConfiguration);
    container.bind(ModelState).toConstantValue(modelState);
    container.bind(GModelSerializer).to(DefaultGModelSerializer);
    container.bind(GModelChangeBoundsOperationHandler).toSelf();
    return { handler: container.get(GModelChangeBoundsOperationHandler), modelState };
}

describe('GModelChangeBoundsOperationHandler', () => {
    it('applies the bounds of a port as given, also outside of its node', async () => {
        const port = GPort.builder().id('port').position(0, 0).size(10, 10).build();
        const node = GNode.builder().id('node').position(0, 0).size(50, 30).add(port).build();
        const { handler, modelState } = createHandler(GGraph.builder().id('graph').add(node).build());

        const command = await handler.execute(
            ChangeBoundsOperation.create([{ elementId: 'port', newPosition: { x: -5, y: 10 }, newSize: { width: 12, height: 8 } }])
        );
        await command!.execute();

        const changedPort = modelState.index.findByClass('port', GPort)!;
        expect(changedPort.position).toEqual({ x: -5, y: 10 });
        expect(changedPort.size).toEqual({ width: 12, height: 8 });
    });
});
