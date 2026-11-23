# GitHub deployment

- Commit and push source code, assets, and documentation to `master`.
- Keep generated `dist/` out of `master`.
- Publish only the built site and deployment metadata to `gh-pages`.
- Preserve this `AGENTS.md` when publishing a new build.
- Publish development builds to `dev/` using `npm run deploy:dev`. Keep the stable build in the root of `gh-pages`.
- Update the stable build only on explicit request using `npm run deploy:stable`. Preserve `dev/` during stable releases.
