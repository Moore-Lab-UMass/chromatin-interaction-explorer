#!/usr/bin/env python3
"""Extract vis-network nodes and edges from a generated HTML file."""

import argparse
import json
import math
import re
from pathlib import Path


def normalize_json(value):
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, list):
        return [normalize_json(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_json(item) for key, item in value.items()}
    return value


def extract_dataset(source: Path) -> dict[str, list[dict]]:
    html = source.read_text()
    dataset: dict[str, list[dict]] = {}

    for name in ("nodes", "edges"):
        match = re.search(
            rf"{name} = new vis\.DataSet\((\[.*?\])\);",
            html,
            re.DOTALL,
        )
        if not match:
            raise ValueError(f"Could not find {name} in {source}")
        dataset[name] = normalize_json(json.loads(match.group(1)))

    return dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    dataset = extract_dataset(args.source)
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text(json.dumps(dataset, separators=(",", ":")))

    print(
        f"Wrote {len(dataset['nodes'])} nodes and "
        f"{len(dataset['edges'])} edges to {args.destination}"
    )


if __name__ == "__main__":
    main()
