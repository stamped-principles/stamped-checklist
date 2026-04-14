# Checklist for STAMPED Principles

An interactive checklist for compliance to STAMPED principles.

## Editing the checklist

The checklist questions and sections are defined in [`src/checklist.json`](src/checklist.json).
To update the checklist content, edit that file and then regenerate the companion `src/data.js` file used by the site:

```bash
npm run build
```

Commit both the updated `src/checklist.json` and the regenerated `src/data.js`.
