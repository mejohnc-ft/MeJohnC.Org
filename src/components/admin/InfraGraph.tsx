import { useEffect, useRef, useState } from "react";
import type { InfraNode } from "@/lib/infrastructure-schemas";

interface InfraGraphProps {
  nodes: InfraNode[];
  onNodeClick?: (nodeId: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  provider: string;
  status: string;
  monthlyCost: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  netlify: "#14b8a6", // teal-500
  supabase: "#22c55e", // green-500
  github: "#6b7280", // gray-500
  cloudflare: "#f97316", // orange-500
  vercel: "#000000", // black
  aws: "#ea580c", // orange-600
  gcp: "#3b82f6", // blue-500
  azure: "#1e40af", // blue-800
  other: "#64748b", // slate-500
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", // green-500
  degraded: "#eab308", // yellow-500
  inactive: "#ef4444", // red-500
};

export function InfraGraph({ nodes, onNodeClick }: InfraGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphNodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animationFrameRef = useRef<number>();
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: { name: string; type: string; provider: string; cost: string };
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);

  // Initialize graph data
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;

    // Create graph nodes with positions
    const graphNodes: GraphNode[] = nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      const monthlyCost = node.monthly_cost ?? 0;
      const nodeRadius = Math.max(20, Math.min(50, 20 + monthlyCost * 2));

      return {
        id: node.id,
        name: node.name,
        provider: node.provider,
        status: node.status,
        monthlyCost,
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius: nodeRadius,
        color: PROVIDER_COLORS[node.provider] || PROVIDER_COLORS.other,
      };
    });

    // Create edges
    const edges: GraphEdge[] = [];
    nodes.forEach((node) => {
      (node.connected_to ?? []).forEach((targetId) => {
        if (nodes.find((n) => n.id === targetId)) {
          edges.push({ source: node.id, target: targetId });
        }
      });
    });

    graphNodesRef.current = graphNodes;
    edgesRef.current = edges;
  }, [nodes]);

  // Force simulation
  useEffect(() => {
    if (!canvasRef.current || graphNodesRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const simulate = () => {
      const graphNodes = graphNodesRef.current;
      const edges = edgesRef.current;

      // Apply forces
      graphNodes.forEach((node) => {
        // Gravity toward center
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          node.vx += (dx / dist) * 0.01;
          node.vy += (dy / dist) * 0.01;
        }

        // Repulsion from other nodes
        graphNodes.forEach((other) => {
          if (node === other) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < 200) {
            const force = 500 / (dist * dist);
            node.vx -= (dx / dist) * force;
            node.vy -= (dy / dist) * force;
          }
        });
      });

      // Spring forces on edges
      edges.forEach((edge) => {
        const source = graphNodes.find((n) => n.id === edge.source);
        const target = graphNodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idealDist = 150;
        if (dist > 0) {
          const force = (dist - idealDist) * 0.1;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Update positions with damping
      graphNodes.forEach((node) => {
        if (draggedNode && draggedNode.id === node.id) return;

        node.vx *= 0.8;
        node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;

        // Keep nodes within bounds
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 2;
      edges.forEach((edge) => {
        const source = graphNodes.find((n) => n.id === edge.source);
        const target = graphNodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      // Draw nodes
      graphNodes.forEach((node) => {
        // Node circle
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Status indicator
        const statusColor = STATUS_COLORS[node.status] || STATUS_COLORS.active;
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(
          node.x + node.radius * 0.6,
          node.y - node.radius * 0.6,
          6,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Node label
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const maxWidth = node.radius * 2;
        const label =
          node.name.length > 15
            ? node.name.substring(0, 12) + "..."
            : node.name;
        ctx.fillText(label, node.x, node.y + node.radius + 4, maxWidth);
      });

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draggedNode]);

  // Mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging && draggedNode) {
        draggedNode.x = x;
        draggedNode.y = y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        return;
      }

      // Check for hover
      const hoveredNode = graphNodesRef.current.find((node) => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) < node.radius;
      });

      if (hoveredNode) {
        canvas.style.cursor = "pointer";
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          content: {
            name: hoveredNode.name,
            type: nodes.find((n) => n.id === hoveredNode.id)?.type || "",
            provider: hoveredNode.provider,
            cost:
              hoveredNode.monthlyCost > 0
                ? `$${hoveredNode.monthlyCost.toFixed(2)}/mo`
                : "Free",
          },
        });
      } else {
        canvas.style.cursor = "default";
        setTooltip(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedNode = graphNodesRef.current.find((node) => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) < node.radius;
      });

      if (clickedNode) {
        setIsDragging(true);
        setDraggedNode(clickedNode);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && draggedNode) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if mouse is still over the same node (click vs drag)
        const dx = x - draggedNode.x;
        const dy = y - draggedNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5 && onNodeClick) {
          onNodeClick(draggedNode.id);
        }
      }

      setIsDragging(false);
      setDraggedNode(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, draggedNode, nodes, onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No infrastructure nodes to display
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={1200}
        height={400}
        className="w-full h-[400px] border border-border rounded-lg bg-transparent"
      />
      {tooltip?.visible && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          <div className="text-sm font-semibold text-foreground">
            {tooltip.content.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {tooltip.content.type} • {tooltip.content.provider}
          </div>
          <div className="text-xs text-muted-foreground">
            {tooltip.content.cost}
          </div>
        </div>
      )}
    </div>
  );
}
