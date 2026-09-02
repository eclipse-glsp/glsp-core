/********************************************************************************
 * Copyright (c) 2023-2026 Business Informatics Group (TU Wien) and others.
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
import type { Capability, Clickable } from '../../../extension';
import type { PNode } from '../../graph';
import type { ConstructorA } from '../../../types';
import { ResizeHandles } from './resize-handle.po';

/**
 * Elements can be resized by using the resize handles.
 */
export interface ResizeHandleCapability<TResizeHandles extends ResizeHandles = ResizeHandles> {
    /**
     * Access the page object of the resize handles of the element.
     *
     * @returns Page object of the resize handles
     */
    resizeHandles(): TResizeHandles;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link ResizeHandleCapability}.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link ResizeHandleCapability}
 */
export function useResizeHandleCapability<TBase extends ConstructorA<PNode & Clickable>>(
    Base: TBase
): Capability<TBase, ResizeHandleCapability> {
    abstract class Mixin extends Base implements ResizeHandleCapability {
        resizeHandles(): ResizeHandles {
            return new ResizeHandles(this);
        }
    }

    return Mixin;
}
