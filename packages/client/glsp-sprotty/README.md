# Eclipse GLSP - Sprotty

The [Eclipse Sprotty](https://github.com/eclipse/sprotty) integration layer of the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp) client.

The package re-exports the parts of the `sprotty` and `sprotty-protocol` API that GLSP builds on and augments them where GLSP needs different behavior: base DI modules and feature modules, overrides for action handling, layouting and SVG views, and the shared type definitions.
It is the single place where the Sprotty dependency is pinned, so [`@eclipse-glsp/client`](https://www.npmjs.com/package/@eclipse-glsp/client) and downstream diagram editors consume Sprotty through this package instead of depending on it directly.

This package is an implementation detail of the GLSP client. Adopters usually depend on [`@eclipse-glsp/client`](../client), which re-exports everything needed to implement a diagram editor.

## Building

This project is built with `pnpm` and is available from npm via [@eclipse-glsp/sprotty](https://www.npmjs.com/package/@eclipse-glsp/sprotty).

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).
