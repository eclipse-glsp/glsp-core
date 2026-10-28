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
import { GEdge, GGraph, GLabel, GModelElement, GNode, GPort, LayoutOperation } from '@eclipse-glsp/server';
import { LayoutOptions } from 'elkjs';
import { describe, expect, it } from 'vitest';
import { AbstractLayoutConfigurator } from './layout-configurator';

/** Options that tell which hook computed them and which elements were selected, if any. */
function optionsFor(kind: string, operation?: LayoutOperation): LayoutOptions {
    return operation?.elementIds?.length ? { kind, selected: operation.elementIds.join(',') } : { kind };
}

class TestLayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph, operation?: LayoutOperation): LayoutOptions {
        return optionsFor('graph', operation);
    }

    protected override nodeOptions(node: GNode, operation?: LayoutOperation): LayoutOptions {
        return optionsFor('node', operation);
    }

    protected override edgeOptions(edge: GEdge, operation?: LayoutOperation): LayoutOptions {
        return optionsFor('edge', operation);
    }

    protected override labelOptions(label: GLabel, operation?: LayoutOperation): LayoutOptions {
        return optionsFor('label', operation);
    }

    protected override portOptions(port: GPort, operation?: LayoutOperation): LayoutOptions {
        return optionsFor('port', operation);
    }
}

describe('AbstractLayoutConfigurator', () => {
    const configurator = new TestLayoutConfigurator();
    const elementsByKind: [string, GModelElement][] = [
        ['graph', new GGraph()],
        ['node', new GNode()],
        ['edge', new GEdge()],
        ['label', new GLabel()],
        ['port', new GPort()]
    ];

    it.each(elementsByKind)('returns the %s options', (kind, element) => {
        expect(configurator.apply(element)).toEqual({ kind });
    });

    it.each(elementsByKind)('passes the layout operation to the %s options', (kind, element) => {
        const operation = LayoutOperation.create(['node1', 'node2']);

        expect(configurator.apply(element, operation)).toEqual({ kind, selected: 'node1,node2' });
    });
});
