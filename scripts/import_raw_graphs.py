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
    lines = [
        'import type { InteractionDataset } from "./types";',
        "",
        "export const datasetCatalog = {",
    ]

    for cell_line, chromosomes in catalog.items():
        lines.append(f'  "{cell_line}": {{')
        for chromosome in chromosomes:
            lines.extend(
                [
                    f"    {chromosome}: () =>",
                    f'      import("./{cell_line}/{chromosome}.json").then(',
                    "        (module) => module.default as InteractionDataset,",
                    "      ),",
                ]
            )
        lines.append("  },")

    lines.extend(
        [
            "} as const;",
            "",
            "export type CellLine = keyof typeof datasetCatalog;",
            "export type Chromosome<T extends CellLine = CellLine> =",
            "  keyof (typeof datasetCatalog)[T] & string;",
            "",
            "export const cellLines = Object.keys(datasetCatalog) as CellLine[];",
            "",
            "export function getChromosomes(cellLine: CellLine): string[] {",
            "  return Object.keys(datasetCatalog[cellLine]);",
            "}",
            "",
            "export async function loadDataset(",
            "  cellLine: CellLine,",
            "  chromosome: string,",
            "): Promise<InteractionDataset> {",
            "  const loaders = datasetCatalog[cellLine] as Record<",
            "    string,",
            "    () => Promise<InteractionDataset>",
            "  >;",
            "  const loader = loaders[chromosome];",
            "",
            "  if (!loader) {",
            "    throw new Error(`No dataset found for ${cellLine} ${chromosome}`);",
            "  }",
            "",
            "  return loader();",
            "}",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("raw_html_updated"))
    parser.add_argument("--destination", type=Path, default=Path("src/data"))
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

    (args.destination / "catalog.ts").write_text(catalog_source(catalog))
    print(f"Imported {len(sources)} cell lines and {sum(map(len, sources.values()))} graphs")


if __name__ == "__main__":
    main()
