"use client";

import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataSet } from "vis-data";
import { Network, type Options } from "vis-network";
import type {
  InteractionDataset,
  InteractionEdge,
  InteractionNode,
} from "@/data/types";

const nodeColorsByType: Record<string, string> = {
  protein_coding: "#E7EEF9",
  lncRNA: "#2592AB",
  enhancer: "#E08D3A",
  CTCF: "#12304C",
};

const otherNodeColor = "#F8C774";

const legendItems = [
  { label: "Protein coding", color: nodeColorsByType.protein_coding },
  { label: "lncRNA", color: nodeColorsByType.lncRNA },
  { label: "Enhancers", color: nodeColorsByType.enhancer },
  { label: "CTCF", color: nodeColorsByType.CTCF },
  { label: "Other", color: otherNodeColor },
];

const interactionLabelSx = {
  m: 0,
  minHeight: 24,
  color: "#111",
  "& .MuiFormControlLabel-label": {
    color: "#111",
    fontSize: "0.75rem",
    lineHeight: 1.66,
  },
  "& .MuiFormControlLabel-label.Mui-disabled": { color: "#111" },
} as const;

const interactionCheckboxSx = {
  p: 0.5,
  color: "#111",
  "&.Mui-checked": { color: "#111" },
  "&.Mui-disabled": { color: "rgba(17, 17, 17, 0.55)" },
  "& .MuiSvgIcon-root": { fontSize: 16 },
} as const;
function applyNodeTypeColor(node: InteractionNode): InteractionNode {
  const types =
    node.title
      .match(/(?:^|\n)Type: ([^\n]+)/)?.[1]
      .split(",")
      .map((type) => type.trim()) ?? [];
  const preferredType =
    ["protein_coding", "lncRNA"].find((type) => types.includes(type)) ??
    types.find((type) => type in nodeColorsByType);
  const color = preferredType
    ? nodeColorsByType[preferredType]
    : otherNodeColor;

  return { ...node, color };
}

function filterInteractions(
  dataset: InteractionDataset,
  showPE: boolean,
  showPC: boolean,
): InteractionDataset {
  const edges = dataset.edges.filter((edge) => {
    if (edge.interaction_type === "P-P") return true;
    if (edge.interaction_type === "P-E") return showPE;
    if (edge.interaction_type === "P-C") return showPC;
    return true;
  });
  const connectedNodeIds = new Set(
    edges.flatMap((edge) => [edge.from, edge.to]),
  );

  return {
    nodes: dataset.nodes.filter((node) => connectedNodeIds.has(node.id)),
    edges,
  };
}
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
    solver: "forceAtlas2Based",
    timestep: 1,
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
      enabled: false,
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
  const settleTimerRef = useRef<number | null>(null);
  const nodesRef = useRef<DataSet<InteractionNode> | null>(null);
  const edgesRef = useRef<DataSet<InteractionEdge> | null>(null);
  const [progress, setProgress] = useState(0);
  const [stabilizing, setStabilizing] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [interactionLegendOpen, setInteractionLegendOpen] = useState(true);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [physicsSolver, setPhysicsSolver] =
    useState<PhysicsSolver>("forceAtlas2Based");
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);
  const [showPE, setShowPE] = useState(false);
  const [showPC, setShowPC] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !configRef.current) return;

    setProgress(0);
    setStabilizing(true);
    setGraphLoaded(false);
    setControlsOpen(false);
    setLegendOpen(true);
    setInteractionLegendOpen(true);
    setPhysicsEnabled(true);
    setPhysicsSolver("forceAtlas2Based");
    setSelectedCcre(null);
    setShowPE(false);
    setShowPC(false);
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

    const initialDataset = filterInteractions(dataset, false, false);
    const nodes = new DataSet(initialDataset.nodes.map(applyNodeTypeColor));
    const edges = new DataSet(initialDataset.edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      networkOptions,
    );
    networkRef.current = network;
    setStabilizing(false);
    setGraphLoaded(true);

    network.on("stabilizationProgress", ({ iterations, total }) => {
      setProgress(Math.round((iterations / total) * 100));
    });

    network.once("stabilized", () => {
      network.setOptions({ physics: { enabled: false } });
      setPhysicsEnabled(false);
      setProgress(100);
      setStabilizing(false);
      setGraphLoaded(true);
    });

    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      network.destroy();
      networkRef.current = null;
      nodesRef.current = null;
      edgesRef.current = null;
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

  const updateInteractionVisibility = (nextPE: boolean, nextPC: boolean) => {
    setShowPE(nextPE);
    setShowPC(nextPC);

    const network = networkRef.current;
    if (!network) return;

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }

    const stopPhysics = () => {
      if (networkRef.current !== network) return;
      network.setOptions({ physics: { enabled: false } });
      setPhysicsEnabled(false);
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };

    network.off("stabilized");
    network.once("stabilized", stopPhysics);
    settleTimerRef.current = window.setTimeout(stopPhysics, 6000);
    network.setOptions({ physics: { enabled: true } });
    setPhysicsEnabled(true);

    const filtered = filterInteractions(dataset, nextPE, nextPC);
    nodesRef.current?.clear();
    nodesRef.current?.add(filtered.nodes.map(applyNodeTypeColor));
    edgesRef.current?.clear();
    edgesRef.current?.add(filtered.edges);
  };

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
        <Stack direction="row" spacing={1} alignItems="center">
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
          <FormControlLabel
            sx={{ flexShrink: 0 }}
            control={
              <Switch
                checked={physicsEnabled}
                disabled={!graphLoaded}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setPhysicsEnabled(enabled);
                  networkRef.current?.setOptions({
                    physics: { enabled },
                  });
                }}
              />
            }
            label="Animation"
          />
        </Stack>
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
        <Stack
          spacing={1}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            alignItems: "flex-start",
          }}
        >
          <GraphLegend
            open={legendOpen}
            onToggle={() => setLegendOpen((open) => !open)}
          />
          <InteractionLegend
            open={interactionLegendOpen}
            onToggle={() => setInteractionLegendOpen((open) => !open)}
            disabled={!graphLoaded}
            showPE={showPE}
            showPC={showPC}
            onShowPEChange={(checked) =>
              updateInteractionVisibility(checked, showPC)
            }
            onShowPCChange={(checked) =>
              updateInteractionVisibility(showPE, checked)
            }
          />
        </Stack>
      </Box>

        <PhysicsControls
          configRef={configRef}
          open={controlsOpen}
          physicsSolver={physicsSolver}
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

interface InteractionLegendProps {
  open: boolean;
  onToggle: () => void;
  disabled: boolean;
  showPE: boolean;
  showPC: boolean;
  onShowPEChange: (checked: boolean) => void;
  onShowPCChange: (checked: boolean) => void;
}

function InteractionLegend({
  open,
  onToggle,
  disabled,
  showPE,
  showPC,
  onShowPEChange,
  onShowPCChange,
}: InteractionLegendProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: 240,
        bgcolor: "rgba(255, 255, 255, 0.92)",
        color: "#111",
        overflow: "hidden",
      }}
    >
      <Button
        size="small"
        onClick={onToggle}
        aria-expanded={open}
        sx={{
          width: "100%",
          justifyContent: "flex-start",
          color: "#111",
          px: 1.25,
          pr: 7,
          py: 0.5,
          position: "relative",
          textTransform: "none",
        }}
      >
        <Typography variant="caption" component="span" sx={{ color: "#111" }}>
          Interaction Type
        </Typography>
        <Stack
          component="span"
          sx={{
            position: "absolute",
            top: 8,
            right: 12,
            color: "#111",
          }}
        >
          <Box
            component="span"
            sx={{
              width: 7,
              height: 7,
              borderRight: "1px solid currentColor",
              borderBottom: "1px solid currentColor",
              transform: open ? "rotate(225deg)" : "rotate(45deg)",
            }}
          />
        </Stack>
      </Button>
      <Collapse in={open}>
        <Stack sx={{ px: 1.25, pb: 1 }}>
          <FormControlLabel
            sx={interactionLabelSx}
            control={
              <Checkbox
                checked
                disabled
                size="small"
                sx={interactionCheckboxSx}
              />
            }
            label="P-P interactions (always on)"
          />
          <FormControlLabel
            sx={interactionLabelSx}
            control={
              <Checkbox
                checked={showPE}
                disabled={disabled}
                size="small"
                sx={interactionCheckboxSx}
                onChange={(event) => onShowPEChange(event.target.checked)}
              />
            }
            label="P-E interactions"
          />
          <FormControlLabel
            sx={interactionLabelSx}
            control={
              <Checkbox
                checked={showPC}
                disabled={disabled}
                size="small"
                sx={interactionCheckboxSx}
                onChange={(event) => onShowPCChange(event.target.checked)}
              />
            }
            label="P-C interactions"
          />
        </Stack>
      </Collapse>
    </Paper>
  );
}
interface GraphLegendProps {
  open: boolean;
  onToggle: () => void;
}

function GraphLegend({ open, onToggle }: GraphLegendProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: 240,
        bgcolor: "rgba(255, 255, 255, 0.92)",
        color: "#111",
        overflow: "hidden",
      }}
    >
      <Button
        size="small"
        onClick={onToggle}
        aria-expanded={open}
        sx={{
          width: "100%",
          justifyContent: "flex-start",
          color: "#111",
          px: 1.25,
          pr: 7,
          py: 0.5,
          position: "relative",
          textTransform: "none",
        }}
      >
        <Typography variant="caption" component="span" sx={{ color: "#111" }}>
          Gene Type
        </Typography>
        <Stack
          component="span"
          sx={{
            position: "absolute",
            top: 8,
            right: 12,
            color: "#111",
          }}
        >
          <Box
            component="span"
            sx={{
              width: 7,
              height: 7,
              borderRight: "1px solid currentColor",
              borderBottom: "1px solid currentColor",
              transform: open ? "rotate(225deg)" : "rotate(45deg)",
            }}
          />
        </Stack>
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.75} sx={{ px: 1.25, pb: 1 }}>
          {legendItems.map((item) => (
            <Stack
              key={item.label}
              direction="row"
              spacing={0.75}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: item.color,
                  border: "1px solid rgba(0, 0, 0, 0.35)",
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ color: "#111" }}>
                {item.label.replaceAll("_"," ")}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

interface PhysicsControlsProps {
  configRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  physicsSolver: PhysicsSolver;
  onPhysicsSolverChange: (solver: PhysicsSolver) => void;
}

function PhysicsControls({
  configRef,
  open,
  physicsSolver,
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
