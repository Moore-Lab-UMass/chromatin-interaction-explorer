"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { DataSet } from "vis-data";
import { Network, type Options } from "vis-network";
import type { InteractionDataset } from "@/data/types";

const options: Options = {
  edges: {
    color: {
      inherit: true,
    },
    smooth: {
      enabled: true,
      type: "dynamic",
      roundness: 0.5,
    },
  },
  interaction: {
    dragNodes: true,
    hideEdgesOnDrag: false,
    hideNodesOnDrag: false,
    hover: true,
    tooltipDelay: 200,
  },
  physics: {
    barnesHut: {
      avoidOverlap: 0,
      centralGravity: 0.3,
      damping: 0.09,
      gravitationalConstant: -80000,
      springConstant: 0.01,
      springLength: 200,
    },
    enabled: true,
    stabilization: {
      enabled: true,
      fit: true,
      iterations: 1000,
      onlyDynamicEdges: false,
      updateInterval: 50,
    },
  },
};

interface NetworkGraphProps {
  dataset: InteractionDataset;
}

export default function NetworkGraph({ dataset }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [progress, setProgress] = useState(0);
  const [stabilizing, setStabilizing] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !configRef.current) return;

    setProgress(0);
    setStabilizing(true);
    setGraphLoaded(false);
    setControlsOpen(false);
    setPhysicsEnabled(true);
    configRef.current.replaceChildren();

    const networkOptions: Options = {
      ...options,
      configure: {
        container: configRef.current,
        enabled: true,
        filter: (option: string, path: string[]) =>
          (option === "physics" && path.length === 0) ||
          (path[0] === "physics" &&
            !(option === "enabled" && path.length === 1)),
        showButton: true,
      },
    };

    const network = new Network(
      containerRef.current,
      {
        nodes: new DataSet(dataset.nodes),
        edges: new DataSet(dataset.edges),
      },
      networkOptions,
    );
    networkRef.current = network;

    network.on("stabilizationProgress", ({ iterations, total }) => {
      setProgress(Math.round((iterations / total) * 100));
    });

    network.once("stabilizationIterationsDone", () => {
      setProgress(100);
      setStabilizing(false);
      setGraphLoaded(true);
    });

    return () => {
      network.destroy();
      networkRef.current = null;
      setGraphLoaded(false);
      configRef.current?.replaceChildren();
    };
  }, [dataset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      networkRef.current?.redraw();
      networkRef.current?.fit({ animation: false });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [controlsOpen]);

  return (
    <Stack spacing={1}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setControlsOpen((open) => !open)}
          disabled={!graphLoaded}
          aria-expanded={controlsOpen}
        >
          {controlsOpen ? "Hide physics controls" : "Show physics controls"}
        </Button>
      </Box>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
      <Box
        sx={{
          position: "relative",
          height: { xs: 620, md: "calc(100vh - 190px)" },
          minHeight: 620,
          minWidth: 0,
          flex: 1,
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            height: "100%",
            bgcolor: "#1a1a2e",
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        />
        {stabilizing && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(16, 16, 31, 0.82)",
              borderRadius: 2,
            }}
          >
            <Box sx={{ width: "min(500px, 80%)" }}>
              <Typography align="center" sx={{ mb: 1 }}>
                Stabilizing network... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          </Box>
        )}
      </Box>

        <PhysicsControls
          configRef={configRef}
          open={controlsOpen}
          physicsEnabled={physicsEnabled}
          onPhysicsEnabledChange={(enabled) => {
            setPhysicsEnabled(enabled);
            networkRef.current?.setOptions({
              physics: { enabled },
            });
          }}
        />
      </Stack>
    </Stack>
  );
}

interface PhysicsControlsProps {
  configRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  physicsEnabled: boolean;
  onPhysicsEnabledChange: (enabled: boolean) => void;
}

function PhysicsControls({
  configRef,
  open,
  physicsEnabled,
  onPhysicsEnabledChange,
}: PhysicsControlsProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: "100%", lg: 400 },
        height: { xs: 600, lg: "calc(100vh - 190px)" },
        flexShrink: 0,
        display: open ? "block" : "none",
        minHeight: 600,
        overflow: "auto",
        bgcolor: "#fff",
        color: "#111",
        p: 1,
        "& .vis-configuration": {
          width: "100%",
        },
      }}
    >
      <Typography variant="h6" sx={{ color: "#111", px: 1, pt: 0.5 }}>
        Physics controls
      </Typography>
      <FormControlLabel
        sx={{ px: 1 }}
        control={
          <Checkbox
            checked={physicsEnabled}
            onChange={(event) => onPhysicsEnabledChange(event.target.checked)}
            sx={{
              color: "#455a64",
              "&.Mui-checked": {
                color: "#0277bd",
              },
              "&:hover": {
                bgcolor: "rgba(2, 119, 189, 0.08)",
              },
              "&.Mui-focusVisible": {
                outline: "2px solid #0277bd",
                outlineOffset: 2,
              },
            }}
          />
        }
        label="Enabled"
      />
      <Box ref={configRef} />
    </Paper>
  );
}
