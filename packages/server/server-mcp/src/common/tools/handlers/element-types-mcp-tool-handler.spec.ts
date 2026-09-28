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
import {
    ActionDispatchScope,
    BindingTarget,
    ClientSessionManager,
    CreateNodeOperation,
    DiagramConfiguration,
    DiagramModules,
    GModelCreateNodeOperationHandler,
    GModelSourceModelModule,
    GNode,
    InjectionContainer,
    Logger,
    NullLogger,
    OperationHandlerConstructor,
    RequestModelAction,
    SaveModelAction,
    ServerLayoutKind,
    SourceModelStorage,
    createGModelDiagramSetup
} from '@eclipse-glsp/server';
import { Container, ContainerModule, injectable } from 'inversify';
import { describe, expect, it } from 'vitest';
import { DefaultElementTypesProvider, ElementTypesProvider } from '../../resources/services/element-types-provider';
import { McpToolResult } from '../../server/mcp-handler-shared';
import { ElementTypesInput, ElementTypesMcpToolHandler, ElementTypesOutput } from './element-types-mcp-tool-handler';

const DIAGRAM_TYPE = 'test-diagram';

@injectable()
class StubSourceModelStorage implements SourceModelStorage {
    loadSourceModel(_action: RequestModelAction): void {}
    saveSourceModel(_action: SaveModelAction): void {}
}

class TestModelModule extends GModelSourceModelModule {
    get diagramType(): string {
        return DIAGRAM_TYPE;
    }

    protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return StubSourceModelStorage;
    }

    protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        const configuration: DiagramConfiguration = {
            typeMapping: new Map(),
            shapeTypeHints: [],
            edgeTypeHints: [],
            layoutKind: ServerLayoutKind.NONE,
            needsClientLayout: false,
            animatedUpdate: false
        };
        return { constantValue: configuration };
    }
}

@injectable()
class TestCreateNodeOperationHandler extends GModelCreateNodeOperationHandler {
    elementTypeIds = ['test:node'];
    label = 'Test Node';

    createNode(_operation: CreateNodeOperation): GNode | undefined {
        return undefined;
    }
}

describe('ElementTypesMcpToolHandler', () => {
    it('should harvest the element types of the default GModel setup', async () => {
        const testModule = new ContainerModule(bind => {
            bind(OperationHandlerConstructor).toConstantValue([TestCreateNodeOperationHandler]);
            bind(ElementTypesProvider).to(DefaultElementTypesProvider).inSingletonScope();
        });
        const setup = createGModelDiagramSetup(new TestModelModule(), { add: [testModule] });
        const serverContainer = new Container();
        serverContainer.bind(Logger).toConstantValue(new NullLogger());
        serverContainer
            .bind(ActionDispatchScope)
            .toConstantValue({ enter: <R>(callback: () => R) => callback(), isReentrant: () => false });
        serverContainer.bind(InjectionContainer).toConstantValue(serverContainer);
        serverContainer.bind(DiagramModules).toConstantValue(new Map([[DIAGRAM_TYPE, setup.modules]]));
        serverContainer.bind(ClientSessionManager).toConstantValue({} as ClientSessionManager);

        const handler = serverContainer.resolve(ElementTypesMcpToolHandler);
        const result = await (handler as unknown as { createResult: (params: ElementTypesInput) => McpToolResult }).createResult({
            diagramType: DIAGRAM_TYPE
        });

        expect(result.isError).toBeFalsy();
        const output = result.structuredContent as ElementTypesOutput;
        expect(output.nodeTypes).toEqual([{ id: 'test:node', label: 'Test Node' }]);
    });
});
