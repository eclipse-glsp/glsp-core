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
import type { Capability } from '../../../extension';
import type { PModelElement } from '../../graph';
import type { ConstructorA } from '../../../types';
import { Marker } from './marker.po';

/**
 * A marker represents the validation result for a single model element.
 *
 * [Learn more about markers](https://www.eclipse.org/glsp/documentation/protocol/).
 */
export interface MarkerCapability<TMarker extends Marker = Marker> {
    /**
     * Access the page object of the marker of the element.
     *
     * @returns Page object of the marker
     */
    marker(): TMarker;
}

/**
 * The default [Extension-Provider](https://github.com/eclipse-glsp/glsp-core/blob/main/e2e/playwright/docs/concepts/extension.md)
 * for the {@link MarkerCapability}.
 *
 * @param Base Base class that should be extended
 * @returns Extended base class with the {@link MarkerCapability}
 */
export function useMarkerCapability<TBase extends ConstructorA<PModelElement>>(Base: TBase): Capability<TBase, MarkerCapability> {
    abstract class Mixin extends Base implements MarkerCapability {
        marker(): Marker {
            return new Marker({ locator: this.locator, isParentLocator: true });
        }
    }

    return Mixin;
}
