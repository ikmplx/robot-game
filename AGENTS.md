# GitHub deployment

- Keep the source code and its Git history local.
- Publish only the built site and deployment metadata to `gh-pages`, the only branch on GitHub.
- Do not push `master`, `main`, or any other source branch to GitHub.
- Preserve this `AGENTS.md` when publishing a new build.
- Publish development builds to `dev/` using `npm run deploy:dev`. Keep the stable build in the root of `gh-pages`.
- Update the stable build only on explicit request using `npm run deploy:stable`. Preserve `dev/` during stable releases.
