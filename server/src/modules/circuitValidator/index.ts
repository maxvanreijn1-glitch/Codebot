/**
 * Circuit Validator Module
 *
 * Analyses a CircuitGraph and returns a list of warnings/errors that describe
 * potential problems with the wiring (missing resistors, floating pins, short
 * circuits, over-current conditions, …).
 */

import { CircuitGraph, CircuitNode, CircuitEdge } from '../circuitParser';

// ── types ─────────────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** The node ID(s) involved, if any */
  components?: string[];
  /** Suggested remediation */
  fix?: string;
}

export interface ValidationResult {
  valid: boolean; // true only when there are no 'error'-level issues
  issues: ValidationIssue[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function splitEndpoint(ep: string): { nodeId: string; pin: string } {
  const idx = ep.indexOf(':');
  return idx === -1
    ? { nodeId: ep, pin: '' }
    : { nodeId: ep.slice(0, idx), pin: ep.slice(idx + 1) };
}

/** Return all node IDs that a given node is connected to (via any wire). */
function neighbours(nodeId: string, edges: CircuitEdge[]): string[] {
  const result: string[] = [];
  edges.forEach((e) => {
    const f = splitEndpoint(e.from).nodeId;
    const t = splitEndpoint(e.to).nodeId;
    if (f === nodeId) result.push(t);
    if (t === nodeId) result.push(f);
  });
  return result;
}

/** Return all edges that touch a given node. */
function edgesOf(nodeId: string, edges: CircuitEdge[]): CircuitEdge[] {
  return edges.filter((e) => {
    const f = splitEndpoint(e.from).nodeId;
    const t = splitEndpoint(e.to).nodeId;
    return f === nodeId || t === nodeId;
  });
}

// ── rule implementations ──────────────────────────────────────────────────────

function checkMissingResistors(
  byId: Map<string, CircuitNode>,
  edges: CircuitEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  byId.forEach((node, id) => {
    if (!node.type.startsWith('led-')) return;

    // Find neighbours of the LED
    const nb = neighbours(id, edges);
    const hasResistor = nb.some((nid) => byId.get(nid)?.type.startsWith('resistor'));

    if (!hasResistor) {
      issues.push({
        severity: 'error',
        code: 'MISSING_RESISTOR',
        message: `"${node.label}" has no current-limiting resistor. The LED may be damaged.`,
        components: [id],
        fix: 'Add a 220 Ω resistor in series between the Arduino pin and the LED anode.',
      });
    }
  });

  return issues;
}

function checkFloatingPins(
  byId: Map<string, CircuitNode>,
  edges: CircuitEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  byId.forEach((node, id) => {
    // Skip virtual power nodes
    if (node.type === 'power_vcc' || node.type === 'power_gnd') return;

    const connected = edgesOf(id, edges);
    if (connected.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'FLOATING_COMPONENT',
        message: `"${node.label}" is not connected to anything.`,
        components: [id],
        fix: 'Connect this component to the circuit or remove it.',
      });
      return;
    }

    // For LEDs and resistors ensure they have at least 2 connections
    if (
      (node.type.startsWith('led-') || node.type.startsWith('resistor')) &&
      connected.length < 2
    ) {
      issues.push({
        severity: 'warning',
        code: 'PARTIAL_CONNECTION',
        message: `"${node.label}" appears to have only one connection — it may be floating.`,
        components: [id],
        fix: 'Ensure both ends of this component are wired.',
      });
    }
  });

  return issues;
}

function checkShortCircuits(
  byId: Map<string, CircuitNode>,
  edges: CircuitEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const vccNodes = [...byId.values()]
    .filter((n) => n.type === 'power_vcc')
    .map((n) => n.id);
  const gndNodes = [...byId.values()]
    .filter((n) => n.type === 'power_gnd')
    .map((n) => n.id);

  // If any single edge directly connects VCC to GND → short circuit
  edges.forEach((edge) => {
    const { nodeId: fromId } = splitEndpoint(edge.from);
    const { nodeId: toId } = splitEndpoint(edge.to);

    const fromIsVcc = vccNodes.includes(fromId);
    const fromIsGnd = gndNodes.includes(fromId);
    const toIsVcc = vccNodes.includes(toId);
    const toIsGnd = gndNodes.includes(toId);

    if ((fromIsVcc && toIsGnd) || (fromIsGnd && toIsVcc)) {
      issues.push({
        severity: 'error',
        code: 'SHORT_CIRCUIT',
        message: 'VCC and GND are directly connected — this will short-circuit the board.',
        components: [fromId, toId],
        fix: 'Remove the direct wire between VCC and GND.',
      });
    }
  });

  return issues;
}

function checkOvercurrent(
  byId: Map<string, CircuitNode>,
  edges: CircuitEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Arduino digital pins source/sink max ~40 mA; typical safe operating current ≤ 20 mA
  // Count LEDs per Arduino output pin
  const pinLedCount = new Map<string, number>();

  edges.forEach((edge) => {
    const { nodeId: fromId, pin: fromPin } = splitEndpoint(edge.from);
    const { nodeId: toId } = splitEndpoint(edge.to);

    const fromNode = byId.get(fromId);
    const toNode = byId.get(toId);

    if (!fromNode || !toNode) return;

    if (
      (fromNode.type.startsWith('arduino') && fromPin.startsWith('D')) &&
      (toNode.type.startsWith('resistor') || toNode.type.startsWith('led-'))
    ) {
      const key = `${fromId}:${fromPin}`;
      pinLedCount.set(key, (pinLedCount.get(key) ?? 0) + 1);
    }
  });

  pinLedCount.forEach((count, key) => {
    if (count > 1) {
      issues.push({
        severity: 'warning',
        code: 'OVERCURRENT_RISK',
        message: `Pin ${key} drives ${count} components which may exceed the safe current limit (20 mA).`,
        fix: 'Use a transistor or dedicated driver IC to drive multiple loads from one pin.',
      });
    }
  });

  return issues;
}

function checkPowerConnections(
  byId: Map<string, CircuitNode>,
  edges: CircuitEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const gndNodes = new Set(
    [...byId.values()].filter((n) => n.type === 'power_gnd').map((n) => n.id),
  );

  const TYPES_REQUIRING_GND = ['led-', 'lcd', 'oled', 'dht', 'servo', 'buzzer'];

  byId.forEach((node, id) => {
    if (node.type === 'power_vcc' || node.type === 'power_gnd') return;
    if (node.type.startsWith('arduino')) return;

    const nb = neighbours(id, edges);
    const hasGnd = nb.some((nid) => gndNodes.has(nid));
    const requiresGnd = TYPES_REQUIRING_GND.some((prefix) => node.type.startsWith(prefix));

    if (!hasGnd && requiresGnd) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_GND',
        message: `"${node.label}" does not appear to have a GND connection.`,
        components: [id],
        fix: 'Connect the GND/cathode pin of this component to the circuit ground.',
      });
    }
  });

  return issues;
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Validate a CircuitGraph and return a list of issues (errors, warnings, info).
 */
export function validateCircuit(graph: CircuitGraph): ValidationResult {
  const { components, connections } = graph;
  const byId = new Map<string, CircuitNode>();
  components.forEach((c) => byId.set(c.id, c));

  const issues: ValidationIssue[] = [
    ...checkShortCircuits(byId, connections),
    ...checkMissingResistors(byId, connections),
    ...checkFloatingPins(byId, connections),
    ...checkOvercurrent(byId, connections),
    ...checkPowerConnections(byId, connections),
  ];

  if (issues.length === 0) {
    issues.push({
      severity: 'info',
      code: 'CIRCUIT_OK',
      message: 'No issues detected. Circuit looks good!',
    });
  }

  const valid = !issues.some((i) => i.severity === 'error');
  return { valid, issues };
}
