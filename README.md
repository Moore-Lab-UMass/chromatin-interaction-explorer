# Protein-Protein Interaction Explorer

Next.js, MUI, and TypeScript app for exploring `vis-network` interaction
graphs by cell line and chromosome.

## Run locally

```bash
yarn install
yarn dev
```

Open `http://localhost:3000`.

## Add another dataset

1. Extract nodes and edges from a generated HTML graph:

   ```bash
   python3 scripts/extract_graph_data.py input.html src/data/CELL-LINE/chrN.json
   ```

2. Add the dataset loader to `src/data/catalog.ts`:

   ```ts
   "CELL-LINE": {
     chrN: () =>
       import("./CELL-LINE/chrN.json").then(
         (module) => module.default as InteractionDataset,
       ),
   },
   ```

The cell-line and chromosome dropdowns are generated automatically from this
catalog.
