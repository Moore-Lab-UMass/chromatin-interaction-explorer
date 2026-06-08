import type { InteractionDataset } from "./types";

export const datasetCatalog = {
  "MCF-7": {
    chr1: () =>
      import("./MCF-7/chr1.json").then(
        (module) => module.default as InteractionDataset,
      ),
  },
} as const;

export type CellLine = keyof typeof datasetCatalog;
export type Chromosome<T extends CellLine = CellLine> =
  keyof (typeof datasetCatalog)[T] & string;

export const cellLines = Object.keys(datasetCatalog) as CellLine[];

export function getChromosomes(cellLine: CellLine): string[] {
  return Object.keys(datasetCatalog[cellLine]);
}

export async function loadDataset(
  cellLine: CellLine,
  chromosome: string,
): Promise<InteractionDataset> {
  const loaders = datasetCatalog[cellLine] as Record<
    string,
    () => Promise<InteractionDataset>
  >;
  const loader = loaders[chromosome];

  if (!loader) {
    throw new Error(`No dataset found for ${cellLine} ${chromosome}`);
  }

  return loader();
}
