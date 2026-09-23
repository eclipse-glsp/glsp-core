# Eclipse GLSP - Protocol

The generic client-server communication protocol for the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp) and a json-rpc based default implementation.
In addition, this package provides shared common code and utility libraries for GLSP components.

This project is built with `pnpm` and is available from npm via [@eclipse-glsp/protocol](https://www.npmjs.com/package/@eclipse-glsp/protocol).

## Entry points

- `@eclipse-glsp/protocol`: the protocol definition and shared utilities. Has no dependency on `inversify` or `reflect-metadata`.
- `@eclipse-glsp/protocol/di`: the dependency injection utilities (`FeatureModule`, `BindingContext`, `LazyInjector`, ...).
  Requires the optional peer dependencies `inversify` and `reflect-metadata`. Also reexported by `@eclipse-glsp/client` and `@eclipse-glsp/server`.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).

![alt](https://www.eclipse.org/glsp/images/diagramanimated.gif)
