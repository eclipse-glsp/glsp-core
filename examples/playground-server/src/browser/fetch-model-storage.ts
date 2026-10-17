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
    GLSPServerError,
    GModelSerializer,
    isGModelElementSchema,
    Logger,
    ModelState,
    RequestModelAction,
    SaveModelAction,
    SOURCE_URI_ARG,
    SourceModelStorage
} from '@eclipse-glsp/server/browser';
import { inject, injectable } from 'inversify';

/**
 * Loads a serialized GModel by fetching its `sourceUri`. A relative URI resolves against the worker
 * script's location, i.e. the files served next to the worker bundle. Saving is not supported.
 */
@injectable()
export class FetchModelStorage implements SourceModelStorage {
    @inject(Logger)
    protected logger: Logger;

    @inject(GModelSerializer)
    protected modelSerializer: GModelSerializer;

    @inject(ModelState)
    protected modelState: ModelState;

    async loadSourceModel(action: RequestModelAction): Promise<void> {
        const sourceUri = action.options?.[SOURCE_URI_ARG];
        if (typeof sourceUri !== 'string') {
            throw new GLSPServerError(`Invalid RequestModelAction! Missing argument with key '${SOURCE_URI_ARG}'`);
        }
        const response = await fetch(sourceUri);
        if (!response.ok) {
            throw new GLSPServerError(`Could not load model from '${sourceUri}': ${response.status} ${response.statusText}`);
        }
        const schema = await response.json();
        if (!isGModelElementSchema(schema)) {
            throw new GLSPServerError(`Could not load model from '${sourceUri}': the content is not a serialized GModel`);
        }
        this.modelState.updateRoot(this.modelSerializer.createRoot(schema));
    }

    saveSourceModel(_action: SaveModelAction): void {
        this.logger.warn('Saving is not supported when the server runs in the browser');
    }
}
