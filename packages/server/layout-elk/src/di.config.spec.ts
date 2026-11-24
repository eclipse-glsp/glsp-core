/********************************************************************************
 * Copyright (c) 2022-2026 STMicroelectronics and others.
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
import { BindingTarget, GEdge, GGraph, GNode, LayoutEngine, Logger, LoggerFactory, ModelState, NullLogger } from '@eclipse-glsp/server';
import { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { Container, ContainerModule, injectable, interfaces } from 'inversify';
import { describe, expect, it } from 'vitest';
import { configureELKLayoutModule, ElkLayoutModule, ElkModuleOptions } from './di.config';
import { DefaultElementFilter, ElementFilter } from './element-filter';
import { ElkFactory, GlspElkLayoutEngine } from './glsp-elk-layout-engine';
import { AbstractLayoutConfigurator, FallbackLayoutConfigurator, LayoutConfigurator } from './layout-configurator';
import { createModelState, RecordingLogger } from './test/layout-engine';

/** A configurator type of its own, to tell whether the module bound it. */
@injectable()
class CustomLayoutConfigurator extends AbstractLayoutConfigurator {}

/** An element filter type of its own, to tell whether the module bound it. */
@injectable()
class CustomElementFilter extends DefaultElementFilter {}

/** Loads the given ELK layout module and bindings into a new container with an empty model state. */
function createContainer(elkModule: ContainerModule, bindings?: interfaces.ContainerModuleCallBack): Container {
    const modelState = createModelState();
    const container = new Container();
    container.load(
        new ContainerModule((bind, unbind, isBound, rebind, ...rest) => {
            bind(ModelState).toConstantValue(modelState);
            bindings?.(bind, unbind, isBound, rebind, ...rest);
        }),
        elkModule
    );
    return container;
}

/** An {@link ElkLayoutModule} for the `layered` algorithm with the given options. */
function elkModule(options: Partial<ElkModuleOptions> = {}): ElkLayoutModule {
    return new ElkLayoutModule({ algorithms: ['layered'], ...options });
}

/** Includes every element, so that the engine itself, and not the filter, warns about an edge with a missing end. */
@injectable()
class AcceptAllElementFilter implements ElementFilter {
    apply(): boolean {
        return true;
    }
}

/**
 * Lays out a graph with an edge whose target does not exist, which the engine warns about if the module uses the
 * {@link AcceptAllElementFilter}.
 */
async function layoutDanglingEdge(container: Container): Promise<void> {
    const node = GNode.builder().id('node').size(50, 30).build();
    const edge = GEdge.builder().id('edge').sourceId('node').targetId('missing').build();
    container.get<ModelState>(ModelState).updateRoot(GGraph.builder().id('graph').addChildren(node, edge).build());
    await container.get<LayoutEngine>(LayoutEngine).computeLayout!();
}

/** An ELK stand-in that returns the graph unchanged and records the IDs of the graphs it was asked to lay out. */
class FakeElk {
    readonly graphIds: string[] = [];

    async layout(graph: ElkNode): Promise<ElkNode> {
        this.graphIds.push(graph.id);
        return graph;
    }
}

/** Replaces the element filter, the layout configurator and the ELK instance through the hooks of the module. */
class CustomElkLayoutModule extends ElkLayoutModule {
    readonly elk = new FakeElk();

    protected override bindElementFilter(): BindingTarget<ElementFilter> {
        return AcceptAllElementFilter;
    }

    protected override bindLayoutConfigurator(): BindingTarget<LayoutConfigurator> {
        return CustomLayoutConfigurator;
    }

    protected override createElk(): ELK {
        return this.elk as unknown as ELK;
    }
}

describe('test configureELKLayoutModule', () => {
    it('configure with minimal options', () => {
        const algorithm = 'layered';
        const container = createContainer(configureELKLayoutModule({ algorithms: [algorithm] }));
        const filter = container.get<ElementFilter>(ElementFilter);
        expect(filter).toBeInstanceOf(DefaultElementFilter);
        const configurator = container.get<LayoutConfigurator>(LayoutConfigurator);
        expect(configurator).toBeInstanceOf(FallbackLayoutConfigurator);
        const graphOptions = configurator.apply(new GGraph());
        expect(graphOptions).toBeDefined();
        expect(graphOptions!['elk.algorithm']).toBe(algorithm);
    });

    it('configure with additional default layout options', () => {
        const algorithm = 'layered';
        const defaultLayoutOptions = {
            'elk.direction': 'LEFT',
            'elk.edgeRouting': 'POLYLINE'
        };
        const container = createContainer(configureELKLayoutModule({ algorithms: [algorithm], defaultLayoutOptions }));
        const configurator = container.get<LayoutConfigurator>(LayoutConfigurator);
        const graphOptions = configurator.apply(new GGraph());
        expect(graphOptions).toBeDefined();
        expect(graphOptions).toMatchObject(defaultLayoutOptions);
    });

    it('configure with custom layout configurator', () => {
        const algorithm = 'layered';
        const container = createContainer(
            configureELKLayoutModule({ algorithms: [algorithm], layoutConfigurator: CustomLayoutConfigurator })
        );
        const configurator = container.get<LayoutConfigurator>(LayoutConfigurator);
        expect(configurator).toBeInstanceOf(CustomLayoutConfigurator);
    });

    it('configure with custom element filter', () => {
        const algorithm = 'layered';
        const container = createContainer(configureELKLayoutModule({ algorithms: [algorithm], elementFilter: CustomElementFilter }));
        const filter = container.get<ElementFilter>(ElementFilter);
        expect(filter).toBeInstanceOf(CustomElementFilter);
    });
});

describe('ElkLayoutModule', () => {
    describe('bindings', () => {
        it('binds the layout engine to the singleton GlspElkLayoutEngine', () => {
            const container = createContainer(elkModule());

            const engine = container.get<LayoutEngine>(LayoutEngine);

            expect(engine).toBeInstanceOf(GlspElkLayoutEngine);
            expect(container.get<LayoutEngine>(LayoutEngine)).toBe(engine);
            expect(container.get(GlspElkLayoutEngine)).toBe(engine);
        });
    });

    describe('hooks', () => {
        it('lets a subclass replace the element filter, the layout configurator and the ELK instance', async () => {
            const module = new CustomElkLayoutModule({ algorithms: ['layered'] });
            const container = createContainer(module);
            container.get<ModelState>(ModelState).updateRoot(GGraph.builder().id('graph').build());

            await container.get<LayoutEngine>(LayoutEngine).computeLayout!();

            expect(container.get(ElementFilter)).toBeInstanceOf(AcceptAllElementFilter);
            expect(container.get(LayoutConfigurator)).toBeInstanceOf(CustomLayoutConfigurator);
            expect(module.elk.graphIds).toEqual(['graph']);
        });
    });

    describe('logging', () => {
        const options = { elementFilter: AcceptAllElementFilter };

        it('logs the messages of the engine with a logger named after the engine', async () => {
            const loggers = new Map<string, RecordingLogger>();
            const container = createContainer(elkModule(options), bind => {
                bind(LoggerFactory).toFactory(() => (caller: string) => {
                    const logger = new RecordingLogger();
                    logger.caller = caller;
                    loggers.set(caller, logger);
                    return logger;
                });
            });

            await layoutDanglingEdge(container);

            expect([...loggers.keys()]).toEqual(['GlspElkLayoutEngine']);
            expect(loggers.get('GlspElkLayoutEngine')!.warnings).toEqual([
                "Edge 'edge' is not laid out, because its end 'missing' does not exist in the model"
            ]);
        });

        it('falls back to a NullLogger and a LoggerFactory if none are bound', async () => {
            const container = createContainer(elkModule(options));

            await layoutDanglingEdge(container);

            expect(container.get(Logger)).toBeInstanceOf(NullLogger);
            expect(container.get<LoggerFactory>(LoggerFactory)('caller').caller).toBe('caller');
        });

        it('keeps an existing Logger binding', async () => {
            const logger = new RecordingLogger();
            const container = createContainer(elkModule(options), bind => {
                bind(Logger).toConstantValue(logger);
            });

            await layoutDanglingEdge(container);

            expect(container.get(Logger)).toBe(logger);
            expect(logger.caller).toBe('GlspElkLayoutEngine');
            expect(logger.warnings).toEqual(["Edge 'edge' is not laid out, because its end 'missing' does not exist in the model"]);
        });
    });

    describe('ELK factory', () => {
        it('passes the algorithms to the ELK instance', async () => {
            // elkjs registers all algorithms if none are given. It keeps them in a global registry, so this file
            // must not register `mrtree` or `force` anywhere else.
            const container = createContainer(new ElkLayoutModule({ algorithms: ['mrtree'] }));

            const algorithms = await container.get<ElkFactory>(ElkFactory)().knownLayoutAlgorithms();

            const ids = algorithms.map(algorithm => algorithm.id);
            expect(ids).toContain('org.eclipse.elk.mrtree');
            expect(ids).not.toContain('org.eclipse.elk.force');
        });

        it('passes the default layout options to the ELK instance', async () => {
            const container = createContainer(elkModule({ defaultLayoutOptions: { 'elk.direction': 'DOWN' } }));
            const elk = container.get<ElkFactory>(ElkFactory)();

            const graph = await elk.layout({
                id: 'graph',
                children: [
                    { id: 'source', width: 50, height: 30 },
                    { id: 'target', width: 50, height: 30 }
                ],
                edges: [{ id: 'edge', sources: ['source'], targets: ['target'] }]
            });

            const [source, target] = graph.children!;
            expect(target.x).toBe(source.x);
            expect(target.y).toBeGreaterThanOrEqual(source.y! + 30);
        });

        describe('in a web worker', () => {
            const globalScope = globalThis as { document?: unknown };

            it('removes the document after creating an ELK instance, if there was none', () => {
                expect('document' in globalScope).toBe(false);
                const container = createContainer(elkModule({ isWebWorker: true }));

                container.get<ElkFactory>(ElkFactory)();

                expect('document' in globalScope).toBe(false);
            });

            it('restores the document after creating an ELK instance, if there was one', () => {
                const document = {};
                globalScope.document = document;
                try {
                    const container = createContainer(elkModule({ isWebWorker: true }));

                    container.get<ElkFactory>(ElkFactory)();

                    expect(globalScope.document).toBe(document);
                } finally {
                    delete globalScope.document;
                }
            });
        });
    });
});
