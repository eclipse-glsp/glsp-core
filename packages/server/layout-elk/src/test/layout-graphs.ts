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
import { GEdge, GGraph, GModelElement, GNode, GPort } from '@eclipse-glsp/server';

/*
 * Small graphical models for the layout engine specs.
 */

/** A node at the origin with a fixed size of 50x30. */
export function node(id: string, ...children: GModelElement[]): GNode {
    return GNode.builder()
        .id(id)
        .position(0, 0)
        .size(50, 30)
        .addChildren(...children)
        .build();
}

/** A 300x200 node at (200,200) with the given children, larger than the layered algorithm needs for them. */
export function container(id: string, ...children: GModelElement[]): GNode {
    return GNode.builder()
        .id(id)
        .position(200, 200)
        .size(300, 200)
        .addChildren(...children)
        .build();
}

/** A 10x10 port at the origin. */
export function port(id: string, ...children: GModelElement[]): GPort {
    return GPort.builder()
        .id(id)
        .position(0, 0)
        .size(10, 10)
        .addChildren(...children)
        .build();
}

/** An edge between the elements with the given IDs. */
export function edge(id: string, sourceId: string, targetId: string): GEdge {
    return GEdge.builder().id(id).sourceId(sourceId).targetId(targetId).build();
}

/** A graph with the ID `graph` and the given children. */
export function graph(...children: GModelElement[]): GGraph {
    return GGraph.builder()
        .id('graph')
        .addChildren(...children)
        .build();
}
