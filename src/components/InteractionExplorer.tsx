"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  cellLines,
  getChromosomes,
  loadDataset,
  type CellLine,
} from "@/data/catalog";
import type { InteractionDataset } from "@/data/types";
import NetworkGraph from "./NetworkGraph";

export default function InteractionExplorer() {
  const [cellLine, setCellLine] = useState<CellLine>("HCT116");
  const [chromosome, setChromosome] = useState("chr15");
  const [dataset, setDataset] = useState<InteractionDataset | null>(null);
  const [error, setError] = useState("");

  const chromosomes = getChromosomes(cellLine);

  useEffect(() => {
    let active = true;
    setDataset(null);
    setError("");

    loadDataset(cellLine, chromosome)
      .then((result) => {
        if (active) setDataset(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load dataset");
        }
      });

    return () => {
      active = false;
    };
  }, [cellLine, chromosome]);

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Hubble Interaction Explorer
          </Typography>
          <Typography color="text.secondary">
            Explore interaction networks by cell line and chromosome.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="cell-line-label">Cell line</InputLabel>
              <Select
                labelId="cell-line-label"
                label="Cell line"
                value={cellLine}
                onChange={(event) => {
                  const nextCellLine = event.target.value as CellLine;
                  setCellLine(nextCellLine);
                  setChromosome(getChromosomes(nextCellLine)[0]);
                }}
              >
                {cellLines.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="chromosome-label">Chromosome</InputLabel>
              <Select
                labelId="chromosome-label"
                label="Chromosome"
                value={chromosome}
                onChange={(event) => setChromosome(event.target.value)}
              >
                {chromosomes.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {dataset && (
              <Stack direction="row" spacing={3} alignItems="center" sx={{ ml: { sm: "auto" } }}>
                <Typography color="text.secondary">
                  <strong>{dataset.nodes.length.toLocaleString()}</strong> nodes
                </Typography>
                <Typography color="text.secondary">
                  <strong>{dataset.edges.length.toLocaleString()}</strong> edges
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}
        {!dataset && !error ? (
          <Box sx={{ height: 620, display: "grid", placeItems: "center" }}>
            <CircularProgress aria-label="Loading interaction data" />
          </Box>
        ) : (
          dataset && <NetworkGraph dataset={dataset} />
        )}
      </Stack>
    </Container>
  );
}
