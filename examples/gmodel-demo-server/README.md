# Eclipse GLSP - GModel Demo Server

Server side of the `gmodel-demo` example language (`.gm` files, diagram type `gmodel-demo`).
A `.gm` file is a serialized GModel that uses only the default types (`graph`, `node`, `edge`, `label`, `port`, `comp`, ...), so each file can show a single rendering or interaction feature in isolation.

- `GModelDemoDiagramModule` maps the default types and allows every interaction on them. It offers no element creation. The source model storage is passed in, so each host can choose how files are loaded.
- `ReadOnlyGModelStorage` (`/node`) loads files from disk but never writes them back.

The package is workspace-private and is hosted by the [playground server](../playground-server). The client side is [`gmodel-demo-glsp`](../gmodel-demo-glsp).
