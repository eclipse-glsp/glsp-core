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

import { Animation, SModelRootImpl } from 'sprotty';

/*
 * Backport of the fix for https://github.com/eclipse-sprotty/sprotty/issues/573.
 * Remove once GLSP consumes a sprotty release that contains it.
 *
 * Sprotty's `Animation.start` ends the loop only when `t === 1`, but floating-point rounding can make the eased value
 * reach 1 one frame earlier. `tween(1)` then runs twice, e.g. `FadeAnimation` removes an already removed element and
 * throws, which leaves the command stack blocked. The override below is a copy of the original loop that also stops
 * once the eased value reaches 1. It is installed on the prototype, so it applies to every animation.
 */
abstract class FinalFrameSafeAnimation extends Animation {
    override start(): Promise<SModelRootImpl> {
        // in case start() is called multiple times, we need to reset the stopped flag
        this.stopped = false;
        return new Promise<SModelRootImpl>(resolve => {
            let start: number | undefined = undefined;
            let frames = 0;
            // The syncer always passes the frame timestamp, the default only satisfies its optional parameter type
            const lambda = (time = 0): void => {
                frames++;
                let dtime: number;
                if (start === undefined) {
                    start = time;
                    dtime = 0;
                } else {
                    dtime = time - start;
                }
                const t = Math.min(1, dtime / this.context.duration);
                const eased = this.ease(t);
                const current = this.tween(eased, this.context);
                this.context.modelChanged.update(current);
                // Floating-point rounding can make the eased value reach 1 while t is still slightly below 1.
                // Stop in that case too, otherwise the next frame would apply the end state a second time.
                if (t === 1 || eased === 1) {
                    this.context.logger.log(this, (frames * 1000) / this.context.duration + ' fps');
                    resolve(current);
                } else if (this.stopped) {
                    this.context.logger.log(this, 'Animation stopped at ' + t * 100 + '%');
                    resolve(current);
                } else {
                    this.context.syncer.onNextFrame(lambda);
                }
            };
            if (this.context.syncer.isAvailable()) {
                this.context.syncer.onNextFrame(lambda);
            } else {
                const finalModel = this.tween(1, this.context);
                resolve(finalModel);
            }
        });
    }
}

Animation.prototype.start = FinalFrameSafeAnimation.prototype.start;
