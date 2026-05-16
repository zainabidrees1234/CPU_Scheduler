# Interactive-CPU-Scheduling-Simulator 

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-fehm3qwe)

## Deployment

This project is configured to deploy as a static Vite build, which makes it suitable for GitHub Pages, Netlify, Vercel, and drag-and-drop static hosting.

### Build

```bash
npm install
npm run build
```

The production files are generated in `dist/`.

### GitHub Pages

1. Push the repository to GitHub.
2. Run `npm run build`.
3. Publish the contents of `dist/` to GitHub Pages.

The project uses a relative base path, so the generated build works correctly when hosted from a repository subpath on GitHub Pages.

### Drag-and-drop hosting

If you want a no-setup deployment, drag the `dist/` folder into a static hosting service that accepts folder uploads. The app does not require a backend.
