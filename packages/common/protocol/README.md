# Eclipse GLSP - Protocol

The generic client-server communication protocol for the [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp) and a json-rpc based default implementation.
In addition, this package provides shared common code and utility libraries for GLSP components.

This project is built with `pnpm` and is available from npm via [@eclipse-glsp/protocol](https://www.npmjs.com/package/@eclipse-glsp/protocol).

## Entry points

- `@eclipse-glsp/protocol`: the protocol definition and shared utilities. Has no dependency on `inversify` or `reflect-metadata`.
- `@eclipse-glsp/protocol/di`: the dependency injection utilities (`FeatureModule`, `BindingContext`, `LazyInjector`, ...).
  Requires the optional peer dependencies `inversify` and `reflect-metadata`. Also reexported by `@eclipse-glsp/client` and `@eclipse-glsp/server`.

## Protocol versioning

Clients and servers exchange their GLSP protocol version during `initialize`.
The protocol has its own [semantic version](https://semver.org/), `GLSP_PROTOCOL_VERSION`, which is independent of the package versions.

| Component | Incremented for                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| MAJOR     | Breaking wire changes: removed or renamed actions, requests or properties, new required properties, changed semantics |
| MINOR     | Backwards-compatible additions: new actions, optional properties or capabilities                                      |
| PATCH     | Clarifications of the specification that do not affect the wire format                                                |

Both sides check compatibility with `ProtocolVersion.checkCompatibility`.
The server validates the version sent by the client, and the client validates the version returned by the server.

| Client vs. server                           | Result                                                            |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Equal versions                              | Compatible                                                        |
| Same MAJOR, different MINOR                 | Compatible, both sides log a warning                              |
| Same MAJOR and MINOR, different PATCH       | Compatible                                                        |
| Different MAJOR                             | Initialization fails, naming both versions and the server's range |
| Malformed version (not `MAJOR.MINOR.PATCH`) | Initialization fails                                              |

A compatible difference is accepted regardless of which side is newer.
Features that only one side supports are negotiated via capabilities, not via the protocol version.

### Release process

- Every PR that changes the protocol bumps `GLSP_PROTOCOL_VERSION` in `src/client-server-protocol/protocol-version.ts` according to the table above.
- The value in this package is authoritative. `GLSPClient.protocolVersion` and the Node `DefaultGLSPServer.PROTOCOL_VERSION` derive from it.
- The Java server (`DefaultGLSPServer.PROTOCOL_VERSION` in [glsp-server](https://github.com/eclipse-glsp/glsp-server)) is expected to mirror the constant and the compatibility rules, and has to be updated after every bump.

## More information

For more information, please visit the [Eclipse GLSP Umbrella repository](https://github.com/eclipse-glsp/glsp) and the [Eclipse GLSP Website](https://www.eclipse.org/glsp/).
If you have questions, please raise them in the [discussions](https://github.com/eclipse-glsp/glsp/discussions) and have a look at our [communication and support options](https://www.eclipse.org/glsp/contact/).

![alt](https://www.eclipse.org/glsp/images/diagramanimated.gif)
