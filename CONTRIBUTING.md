# Contributing

Contributions are welcome, and the bar is the one the codebase already holds itself to. This
guide applies the [BeeverForge OSS contribution guidelines](https://github.com/BeeverForge/beeverforge-oss/blob/main/CONTRIBUTING.md)
to the panel's own tools and tests.

## Setting up: from a clone to a green suite

Use Node 24, npm 11.17 or later, and Git. Install dependencies from the lockfile using the
reviewed install scripts, then run the local checks:

```bash
git clone https://github.com/BeeverForge/beeverforge-panel.git
cd beeverforge-panel
npm run setup
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:policy
```

`npm run setup` runs `npm ci`, checks the install-script policy, and runs the scripts explicitly
approved in `package.json`. Do not bypass that policy to make an installation work.

The browser suite also needs Chromium, Python 3.12 or later and the BeeverForge core API. The
rig installs the core at the revision pinned in `contract/core-ref`; a separate core checkout
is not required. From the panel checkout:

```bash
npx playwright install chromium
npm run rig:install
npm run rig:serve       # terminal 1
npm run rig:seed        # once, after the rig is serving
npm start               # terminal 2
npm run e2e             # terminal 3
```

On Windows the rig runs the core API in WSL; Node, the panel and the browser run on Windows.
On Linux and macOS the rig runs directly. The rig needs Python with `venv`, pip and Git; installing
the core also needs access to its Python dependencies. Playwright may need additional system
dependencies on Linux. The rig uses synthetic data and its own registry and home directory; see
the [test bed](README.md#the-test-bed) for what it does.

CI runs the platform and browser checks on Linux and Windows, and ShellCheck for the rig on
Linux. Run `npm run lint:sh` when ShellCheck is available. Report any checks you could not run;
do not treat a unit-test pass as proof of the browser or live-service behaviour.

## Reading the system first

Before changing behaviour, find the test that states the property you intend to change. Read the
relevant source and these maps:

| Document | What it covers |
|---|---|
| [README.md](README.md) | Setup, the test bed, live updates and source layout |
| [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) | Product intent and design direction |
| [COMPARISON.md](COMPARISON.md) | Comparison with the default panel |
| [docs/](docs/) | Panel-specific documentation |

## The house rules, short

- **Run typecheck and lint before the tests.** Investigate failures rather than rerunning them
  until they pass. Order-dependent failures can reveal state leaks.
- **Prove a new guard can fail.** Deliberately break the property it checks, confirm the test goes
  red, and restore the change before finishing. Do not leave a mutation in the working tree.
- **A guard reads the thing, not text about the thing.** Exercise behaviour or parse the actual
  data where possible. A text search that also matches a comment can pass while the property is
  broken.
- **Failures speak by name.** User-facing failures should explain the cause and a remedy, rather
  than silently doing nothing or exposing a raw error.
- **Comments say why.** Keep the reasoning and relevant measurements behind a non-obvious
  decision; avoid comments that merely repeat the code.

Tests must not depend on a contributor's credentials or private local data. Optional external
services should not make test collection fail on a clean machine. Use synthetic fixtures and
make missing prerequisites explicit.

## Pull requests

Keep pull requests small and focused. Target `main`, and use the
[pull request template](.github/pull_request_template.md) to describe the behaviour, why it
changed, what fails without the change, and the checks you ran. State what you measured, not
just which files changed.

Name each new runtime dependency and why the panel needs it in the template's **New runtime
dependencies** section. CI checks this. Explain any unrun tests or outstanding manual or
live-service validation in the pull request.

## Licensing

This project is Apache-2.0 ([LICENSE](LICENSE)). Under Apache-2.0 §5, unless you explicitly say
otherwise, a contribution submitted for inclusion is under the same terms. There is no
contributor licence agreement to sign. You retain copyright in your contribution.

Copyright notices and the [NOTICE](NOTICE) file travel with the code under Apache-2.0. The code
may be forked and redistributed, but the licence does not grant rights to the BeeverForge name,
logo or marks.
