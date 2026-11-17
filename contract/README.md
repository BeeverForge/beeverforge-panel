# The core's API contract, as this panel reads it

The panel is built against one commit of the core, [BeeverForge/beeverforge-oss](https://github.com/BeeverForge/beeverforge-oss),
named in `core-ref`. The two files here are that commit's own, copied byte for byte:

| file | in the core |
|---|---|
| `openapi.json` | `docs/reference/openapi.json`: every route, its parameters and its answer |
| `events.schema.json` | `docs/reference/events.schema.json`: every frame the streams send |

`src/api/generated/` is generated from them (`npm run gen:types`), and the rig installs the core at
the same commit (`npm run rig:install`), so the types, the rig and the contract always come from
one version of the core.

To move to a newer core:

```bash
npm run contract:pull -- <commit, tag or branch of the core>   # rewrites the two files and core-ref
npm run gen:types
npm run typecheck
```

Edit nothing here by hand: a change to the contract is made in the core, then pulled.
