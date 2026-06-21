# GitHub and GitHub Pages Deployment Guide

The commands below assume the folder is named `Sol-Oottam-v0.9.0`. Replace `YOUR-USERNAME` and repository names with your own values.

## Before uploading

1. Open the final folder and confirm that `index.html` is at its top level.
2. Run `node tests/content_test.cjs` and `python3 tests/smoke_test.py`.
3. Open the game locally and complete the manual checks most relevant to your device.
4. Search the folder for secrets. There must be no API key, password, raw participant export or identifiable participant information.
5. Do not upload CSV/JSON files exported from real participant sessions. The `.gitignore` blocks the standard export names, but you must still check the staged files.

## Option A — GitHub website upload

1. Sign in to GitHub.
2. Create a new repository, for example `sol-oottam`.
3. Choose Public only if publication is acceptable for your project; otherwise use Private and confirm whether your required Pages plan/settings support it.
4. Do not initialise the repository with conflicting sample files if you plan to upload this whole prepared folder.
5. On an empty repository page, choose **uploading an existing file**. In an existing repository, select **Add file → Upload files**.
6. Drag the contents *inside* `Sol-Oottam-v0.9.0` into the upload area. Do not create an extra enclosing folder; `index.html` must remain at the repository root.
7. Enter a commit message such as `Add Sol Oottam v0.9.0 evaluation candidate`.
8. Commit to the `main` branch.
9. Open the repository file list and verify that `index.html`, `styles.css`, `words.js` and `app.js` are visible at the top level.

## Option B — Git command line

Open a terminal inside the final project folder:

```bash
git init
git branch -M main
git add .
git status
```

Read the `git status` output before committing. Confirm that no participant data or secrets are staged.

```bash
git commit -m "Add Sol Oottam v0.9.0 evaluation candidate"
git remote add origin https://github.com/YOUR-USERNAME/sol-oottam.git
git push -u origin main
```

When GitHub requires authentication, use the browser/device flow or a personal access token rather than your account password.

## Publish with GitHub Pages

1. Open the repository on GitHub.
2. Select **Settings**.
3. Select **Pages** under **Code and automation**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`.
6. Save the setting.
7. Wait for the deployment workflow to finish, then open the Pages URL shown by GitHub.
8. Hard-refresh the page and verify all four local files load without 404 errors.
9. Test Level 1, local persistence, mobile layout and microphone permission on the published HTTPS URL.

## After each update

```bash
git add .
git status
git commit -m "Describe the tested change"
git push
```

Keep version tags for stable milestones:

```bash
git tag -a v0.9.0 -m "Evaluation candidate"
git push origin v0.9.0
```

Do not tag `v1.0.0` until content review, device testing and the approved evaluation stage are complete.

## Common deployment problems

- **Blank or unstyled page:** verify exact lowercase file names and that all four core files are in the same root folder.
- **404 at the Pages URL:** confirm the selected branch/folder and wait for the Pages deployment to complete.
- **Microphone unavailable:** use the HTTPS Pages URL, grant browser permission and test in a browser that exposes Tamil speech recognition. The manual fallback should remain usable.
- **Old version still visible:** hard-refresh, clear site data or check the latest Pages workflow result.
- **Progress appears reset:** browser local storage is origin-specific; `localhost`, the GitHub Pages URL and another domain each have separate progress.
- **Private information in a commit:** stop and follow GitHub’s sensitive-data removal procedure; deleting the current file alone does not remove it from history.
