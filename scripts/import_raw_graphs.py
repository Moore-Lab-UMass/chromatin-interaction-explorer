#!/usr/bin/env python3
"""Import every raw vis-network HTML graph and regenerate the data catalog."""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from extract_graph_data import extract_dataset


FILE_PATTERN = re.compile(
    r"(?P<cell_line>.+)-"
    r"(?P<chromosome>chr(?:[1-9]|1\d|2[0-2]|X))"
    r"(?:\.P-P-E-C)?-graph\.html"
)
CHROMOSOMES = [f"chr{number}" for number in range(1, 23)] + ["chrX"]


def catalog_source(catalog: dict[str, list[str]]) -> str:
    cell_lines = ",\n".join(f'  "{cell_line}"' for cell_line in catalog)
    chromosomes = ",\n".join(f'  "{chromosome}"' for chromosome in CHROMOSOMES)
    return f'''import type {{ InteractionDataset }} from "./types";

export const cellLines = [
{cell_lines},
] as const;

const chromosomes = [
{chromosomes},
] as const;

export type CellLine = (typeof cellLines)[number];
export type Chromosome = (typeof chromosomes)[number];

export function getChromosomes(_cellLine: CellLine): string[] {{
  return [...chromosomes];
}}

export async function loadDataset(
  cellLine: CellLine,
  chromosome: string,
): Promise<InteractionDataset> {{
  if (!chromosomes.includes(chromosome as Chromosome)) {{
    throw new Error(`No dataset found for ${{cellLine}} ${{chromosome}}`);
  }}

  const response = await fetch(
    `/data/${{encodeURIComponent(cellLine)}}/${{chromosome}}.json`,
  );

  if (!response.ok) {{
    throw new Error(`Unable to load ${{cellLine}} ${{chromosome}}`);
  }}

  return (await response.json()) as InteractionDataset;
}}
'''

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("raw_html_updated"))
    parser.add_argument("--destination", type=Path, default=Path("public/data"))
    parser.add_argument("--catalog", type=Path, default=Path("src/data/catalog.ts"))
    args = parser.parse_args()

    sources: dict[str, dict[str, Path]] = defaultdict(dict)
    for source in sorted(args.source.glob("*.html")):
        match = FILE_PATTERN.fullmatch(source.name)
        if not match:
            raise ValueError(f"Unexpected graph filename: {source.name}")
        sources[match["cell_line"]][match["chromosome"]] = source

    for cell_line, chromosomes in sources.items():
        missing = set(CHROMOSOMES) - set(chromosomes)
        if missing:
            raise ValueError(f"{cell_line} is missing: {', '.join(sorted(missing))}")

    catalog: dict[str, list[str]] = {}
    for cell_line in sorted(sources):
        catalog[cell_line] = CHROMOSOMES
        for chromosome in CHROMOSOMES:
            dataset = extract_dataset(sources[cell_line][chromosome])
            destination = args.destination / cell_line / f"{chromosome}.json"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(json.dumps(dataset, separators=(",", ":")))
            print(
                f"Wrote {cell_line}/{chromosome}: "
                f"{len(dataset['nodes'])} nodes, {len(dataset['edges'])} edges"
            )

    args.catalog.parent.mkdir(parents=True, exist_ok=True)
    args.catalog.write_text(catalog_source(catalog))
    print(f"Imported {len(sources)} cell lines and {sum(map(len, sources.values()))} graphs")


if __name__ == "__main__":
    main()
