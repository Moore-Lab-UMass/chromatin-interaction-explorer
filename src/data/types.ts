import type { Edge, Node } from "vis-network";

export interface InteractionNode extends Node {
  id: string;
  title: string;
}

export interface InteractionEdge extends Edge {
  from: string;
  to: string;
  interaction_id: string;
  gene1: string;
  gene2: string;
  gene1_bru_minus: number | null;
  gene1_bru_plus: number | null;
  gene2_bru_minus: number | null;
  gene2_bru_plus: number | null;
}

export interface InteractionDataset {
  nodes: InteractionNode[];
  edges: InteractionEdge[];
}
