# Repository Policy Sections

## Selected Manifest Contract

Apply this section when the task changes or validates a selected application manifest.

- Keep the selected application manifest versionless.
- Keep `owner`, `release`, and `resources` as the current baseline fields.
- Each later gateway must accept every manifest that an earlier versionless gateway accepted.
- Keep each accepted field name, type, requirement, and function.
- A field added to an existing shape must be optional.
- A field added to an existing shape must have one canonical default.
- Normalize that default before manifest identity calculation.
- Add a resource kind only with one closed shape.
- Reject unknown fields and `schema_version`.

## Static Website Hosting

Apply this section to deployment or publication work for a browser frontend.

- Use GitHub Pages as the production host for each deployable browser frontend.
- Declare the browser frontend with a `github_pages` resource in `.mprlab/deploy/resources.yml`.
- Use `gh-pages` as the publication branch.
- The GitHub Pages repository can differ from the application repository.
- Keep API and service routes on hostnames that differ from the website hostname.
- Reserve the GitHub Pages domain and its `www` hostname for GitHub Pages.
- Treat a container as an artifact source only when its static output goes to GitHub Pages.
- Verify publication through the public website and `/.mprlab-release.json`.
- Run the Governor check after each selected manifest change and before each release, publish, or deploy operation.

## Manifest Environment Resolution

Use this contract for Gateway lifecycle operations that use a selected manifest.
Manifest processing is the only boundary that reads environment values for Gateway configuration.

- Let manifest values include environment variable references.
- Use the optional `environment_file` field for a relative or absolute environment file path specified in the manifest.
- Use the selected consuming repository as the root for relative paths.
- When the manifest has no `environment_file` field, use only process values.
- Reject a selected file that is missing or that you cannot read, even when process values are available.
- When the two sources have a value for a variable, use its process value.
- Use only the path specified by `environment_file` for an environment file.
- Do not use a default path or examine other paths for environment files.
- Do not make an environment file necessary because of a resource kind or lifecycle phase.
- Read environment values one time at the manifest boundary.
- During manifest processing, change environment variable references to their values.
- Validate the configuration before CI, builds, host contact, or provider effects.
- For each missing necessary reference value, reject the manifest with its variable name and manifest location.
- Keep private values out of error messages and public diagnostics.
- Give the validated configuration to subsequent operations.
- Do not read environment variables or environment files for configuration after manifest processing.
- Do not change environment references to values in downstream Go, Python, Ansible, or shell code.
- Supply deployment, publication, and signing credentials from the validated configuration.
- Keep private configuration values outside public artifacts, plans, receipts, state documents, and logs.
- Keep each selected application's validated configuration separate.
- Validate all selected manifests before application-set effects.
- Use only the selected resources and their specified dependency tree for readiness checks.

Environment files are optional inputs to manifest processing.
They are not a separate deployment specification or a necessary credential store.
Provider-native credential stores are provider inputs under their specified contracts.
They cannot supply Gateway configuration that the selected manifest does not include.

## Repository Guide Requirements

These guides retain repository-specific product or operational contracts.
Preserve those contracts during shared-governance updates. Apply current agent procedures from the core policy.

- Read and retain `.mprlab/AGENTS.APPLE.md` for its task-specific scope.

## Gateway Lifecycle Execution

Use the lifecycle commands and Gateway contract documented by this repository.
Keep release, publication, deployment, and live acceptance as separate results.
Use Gateway v9 conventions only when the repository has explicitly adopted that contract.
A governance refresh does not authorize a lifecycle or manifest migration.

## Native Preparation Authority

Use the native preparation and build commands documented by this repository.
Preserve application identity, dependency and toolchain requirements, signing inputs, and command results.
Apply a new shared native-preparation record contract only when explicitly adopted.
Use simulators, emulators, and automated browsers as sufficient device acceptance environments.

## Gateway Credential Inputs

Use manifest-owned credential resolution when the current selected manifest contract declares that responsibility.
For other operations, use only the credential sources documented by the current command.
Apply the general Credential Discovery gate in `POLICY.md` and the global sign-in preparation rules.

## Single Manifest Authority

Follow this repository's documented production deployment-specification authority and preserve its current manifest shape.
Keep local orchestration separate from production lifecycle inputs.
Use `.mprlab/deploy/resources.yml` as the sole specification only where the repository has already selected that contract.
A migration to another deployment contract requires a task that authorizes that change.
