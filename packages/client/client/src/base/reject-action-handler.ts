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
import { Action, IActionHandler, ILogger, RejectAction, TYPES } from '@eclipse-glsp/sprotty';
import { inject, injectable } from 'inversify';

/**
 * Handles {@link RejectAction}s that could not be matched to a pending request.
 * This happens if the rejection arrives after the request has already been settled (e.g. a late rejection
 * of a timed-out request) or if the rejection has been sent without a preceding request.
 * Rejections of pending requests never reach this handler, they reject the corresponding request promise instead.
 *
 * The requesting party has already given up on such a request, so the default implementation only logs the rejection
 * instead of notifying the user.
 */
@injectable()
export class RejectActionHandler implements IActionHandler {
    @inject(TYPES.ILogger)
    protected logger: ILogger;

    handle(action: Action): void {
        if (RejectAction.is(action)) {
            this.handleRejectAction(action);
        }
    }

    protected handleRejectAction(action: RejectAction): void {
        this.logger.warn(this, 'Received rejection without pending request:', action.message, action.detail);
    }
}
