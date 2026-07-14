import type { InteractionDataset } from "./types";

export const cellLines = [
  "Caco-2",
  "HCT116",
  "HepG2",
  "K562",
  "MCF-7",
  "MCF",
] as const;

const chromosomes = [
  "chr1",
  "chr2",
  "chr3",
  "chr4",
  "chr5",
  "chr6",
  "chr7",
  "chr8",
  "chr9",
  "chr10",
  "chr11",
  "chr12",
  "chr13",
  "chr14",
  "chr15",
  "chr16",
  "chr17",
  "chr18",
  "chr19",
  "chr20",
  "chr21",
  "chr22",
  "chrX",
] as const;

export type CellLine = (typeof cellLines)[number];
export type Chromosome = (typeof chromosomes)[number];

export function getChromosomes(_cellLine: CellLine): string[] {
  return [...chromosomes];
}

export async function loadDataset(
  cellLine: CellLine,
  chromosome: string,
): Promise<InteractionDataset> {
  if (!chromosomes.includes(chromosome as Chromosome)) {
    throw new Error(`No dataset found for ${cellLine} ${chromosome}`);
  }

  const response = await fetch(
    `/data/${encodeURIComponent(cellLine)}/${chromosome}.json`,
  );

  if (!response.ok) {
    throw new Error(`Unable to load ${cellLine} ${chromosome}`);
  }

  return (await response.json()) as InteractionDataset;
}