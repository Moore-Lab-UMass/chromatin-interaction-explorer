"use client";

import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataSet } from "vis-data";
import { Network, type Options } from "vis-network";
import type { InteractionDataset } from "@/data/types";

const options: Options = {
  nodes: {
    borderWidthSelected: 5,
    color: {
      highlight: {
        background: "#ffca28",
        border: "#ff4081",
      },
    },
  },
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
  layout: {
    improvedLayout: false,
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
      iterations: 350,
      onlyDynamicEdges: false,
      updateInterval: 25,
    },
  },
};

interface NetworkGraphProps {
  dataset: InteractionDataset;
}

type PhysicsSolver =
  | "barnesHut"
  | "forceAtlas2Based"
  | "repulsion"
  | "hierarchicalRepulsion";

const physicsSolvers: PhysicsSolver[] = [
  "barnesHut",
  "forceAtlas2Based",
  "repulsion",
  "hierarchicalRepulsion",
];

export default function NetworkGraph({ dataset }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [progress, setProgress] = useState(0);
  const [stabilizing, setStabilizing] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [physicsSolver, setPhysicsSolver] =
    useState<PhysicsSolver>("barnesHut");
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !configRef.current) return;

    setProgress(0);
    setStabilizing(true);
    setGraphLoaded(false);
    setControlsOpen(false);
    setPhysicsEnabled(true);
    setPhysicsSolver("barnesHut");
    setSelectedCcre(null);
    configRef.current.replaceChildren();

    const stabilizationIterations = //1000
      dataset.nodes.length + dataset.edges.length > 3000 ? 200 : 350;
    const networkOptions: Options = {
      ...options,
      physics: {
        ...options.physics,
        stabilization: {
          ...options.physics?.stabilization,
          iterations: stabilizationIterations,
        },
      },
      configure: {
        container: configRef.current,
        enabled: true,
        filter: (option: string, path: string[]) =>
          (option === "physics" && path.length === 0) ||
          (path[0] === "physics" &&
            !(
              path.length === 1 &&
              (option === "enabled" || option === "solver")
            )),
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

  const selectCcre = (ccre: string | null) => {
    setSelectedCcre(ccre);

    const network = networkRef.current;
    if (!network) return;

    if (!ccre) {
      network.unselectAll();
      return;
    }

    setPhysicsEnabled(false);
    network.setOptions({ physics: { enabled: false } });
    network.selectNodes([ccre]);
    network.focus(ccre, {
      animation: {
        duration: 700,
        easingFunction: "easeInOutQuad",
      },
      scale: 1.2,
    });
  };

  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
      >
        <Autocomplete
          value={selectedCcre}
          options={dataset.nodes.map((node) => node.id)}
          onChange={(_event, value) => selectCcre(value)}
          disabled={!graphLoaded}
          sx={{ width: { xs: "100%", sm: 340 } }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search cCRE"
              placeholder="e.g. EH38E3126939"
              size="small"
            />
          )}
        />
        <Button
          variant="outlined"
          size="small"
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
          onClick={() => setControlsOpen((open) => !open)}
          disabled={!graphLoaded}
          aria-expanded={controlsOpen}
        >
          {controlsOpen ? "Hide physics controls" : "Show physics controls"}
        </Button>
      </Stack>

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
          physicsSolver={physicsSolver}
          onPhysicsEnabledChange={(enabled) => {
            setPhysicsEnabled(enabled);
            networkRef.current?.setOptions({
              physics: { enabled },
            });
          }}
          onPhysicsSolverChange={(solver) => {
            setPhysicsSolver(solver);
            networkRef.current?.setOptions({
              physics: { solver },
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
  physicsSolver: PhysicsSolver;
  onPhysicsEnabledChange: (enabled: boolean) => void;
  onPhysicsSolverChange: (solver: PhysicsSolver) => void;
}

function PhysicsControls({
  configRef,
  open,
  physicsEnabled,
  physicsSolver,
  onPhysicsEnabledChange,
  onPhysicsSolverChange,
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
        colorScheme: "light",
        p: 1,
        "& .vis-configuration-wrapper": {
          width: "100%",
        },
        "& .vis-configuration.vis-config-option-container, & .vis-configuration.vis-config-button":
          {
            left: 0,
            width: "100%",
            boxSizing: "border-box",
          },
        "& .vis-configuration.vis-config-item": {
          left: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
          minHeight: 32,
          height: "auto",
          boxSizing: "border-box",
          overflow: "visible",
        },
        "& .vis-configuration.vis-config-label": {
          flex: "0 0 120px",
          width: 120,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        "& input.vis-configuration.vis-config-range": {
          flex: "1 1 auto",
          width: "auto",
          minWidth: 80,
        },
        "& input.vis-configuration.vis-config-range::-webkit-slider-runnable-track, & input.vis-configuration.vis-config-range::-moz-range-track":
          {
            width: "100%",
          },
        "& input.vis-configuration.vis-config-rangeinput": {
          top: 0,
          flex: "0 0 56px",
          width: 56,
          boxSizing: "border-box",
          color: "#111",
          backgroundColor: "#fff",
        },
        "& select.vis-configuration.vis-config-select": {
          flex: "1 1 auto",
          width: "auto",
          minWidth: 0,
          color: "#111",
          backgroundColor: "#fff",
        },
        "& select.vis-configuration.vis-config-select option": {
          color: "#111",
          backgroundColor: "#fff",
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
      <Box sx={{ px: 1, my: 1 }}>
        <FormControl
          fullWidth
          size="small"
          sx={{
            "& .MuiInputLabel-root": {
              color: "#455a64",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#0277bd",
            },
            "& .MuiOutlinedInput-root": {
              color: "#111",
              backgroundColor: "#fff",
              "& fieldset": {
                borderColor: "#78909c",
              },
              "&:hover fieldset": {
                borderColor: "#455a64",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#0277bd",
              },
            },
            "& .MuiSelect-icon": {
              color: "#455a64",
            },
          }}
        >
          <InputLabel id="physics-solver-label">Solver</InputLabel>
          <Select
            labelId="physics-solver-label"
            label="Solver"
            value={physicsSolver}
            MenuProps={{
              PaperProps: {
                sx: {
                  color: "#111",
                  backgroundColor: "#fff",
                  "& .MuiMenuItem-root:hover": {
                    backgroundColor: "#eceff1",
                  },
                  "& .MuiMenuItem-root.Mui-selected": {
                    backgroundColor: "#e1f5fe",
                  },
                },
              },
            }}
            onChange={(event) =>
              onPhysicsSolverChange(event.target.value as PhysicsSolver)
            }
          >
            {physicsSolvers.map((solver) => (
              <MenuItem key={solver} value={solver}>
                {solver}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box ref={configRef} />
    </Paper>
  );
}
