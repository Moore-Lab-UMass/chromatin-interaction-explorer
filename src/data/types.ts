import type { Edge, Node } from "vis-network";

export interface InteractionNode extends Node {
  id: string;
  title: string;
}

export interface InteractionEdge extends Edge {
  interaction_type?: "P-P" | "P-E" | "P-C" | string;
  from: string;
  to: string;
  gene1: string;
  gene2: string;
  gene1_bru_anti: number | null;
  gene1_bru_sense: number | null;
  gene2_bru_anti: number | null;
  gene2_bru_sense: number | null;
  tpm_p1: number | null;
  tpm_p2: number | null;
}

export interface InteractionDataset {
  nodes: InteractionNode[];
  edges: InteractionEdge[];
}
