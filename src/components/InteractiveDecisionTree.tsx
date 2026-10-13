import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Crosshair,
  GitBranch,
  Info,
  Maximize2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { TreeNodeData } from "../types";

interface FlatNode {
  id: string;
  node: TreeNodeData;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  isLeaf: boolean;
  isHighProfit: boolean;
  c0: number;
  c1: number;
  c1Pct: number;
}

interface Connector {
  id: string;
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
  ym: number;
  isLeft: boolean;
  label: string;
}

const NODE_W = 210;
const NODE_H_SPLIT = 118;
const NODE_H_LEAF = 102;
const LEVEL_H = 190;
const GAP_X = 28;
const PAD_X = 60;
const PAD_Y = 40;

function computeTreeLayout(treeData: TreeNodeData, maxDepth: number) {
  const nodes: FlatNode[] = [];
  const connectors: Connector[] = [];
  let nodeIdCounter = 0;

  function getSubtreeWidth(node: TreeNodeData | undefined, depth: number): number {
    if (!node) return 0;
    const isLeaf = Boolean(node.is_leaf || depth >= maxDepth || (!node.left && !node.right));
    if (isLeaf) return NODE_W;

    const leftW = getSubtreeWidth(node.left, depth + 1);
    const rightW = getSubtreeWidth(node.right, depth + 1);

    if (leftW > 0 && rightW > 0) {
      return Math.max(NODE_W, leftW + rightW + GAP_X);
    }
    if (leftW > 0) return Math.max(NODE_W, leftW);
    if (rightW > 0) return Math.max(NODE_W, rightW);
    return NODE_W;
  }

  function assignPositions(
    node: TreeNodeData | undefined,
    x0: number,
    x1: number,
    depth: number
  ): { x: number; y: number; h: number } | null {
    if (!node) return null;
    const id = `node-${nodeIdCounter++}`;
    const isLeaf = Boolean(node.is_leaf || depth >= maxDepth || (!node.left && !node.right));
    const isHighProfit = Boolean(node.class?.toLowerCase().includes("high") || node.class === "1");
    const h = isLeaf ? NODE_H_LEAF : NODE_H_SPLIT;
    const y = PAD_Y + depth * LEVEL_H;

    const c0 = node.value?.[0] ?? 0;
    const c1 = node.value?.[1] ?? 0;
    const total = c0 + c1 > 0 ? c0 + c1 : node.samples;
    const c1Pct = total > 0 ? (c1 / total) * 100 : 0;

    if (isLeaf) {
      const x = (x0 + x1) / 2;
      nodes.push({
        id,
        node,
        x,
        y,
        w: NODE_W,
        h,
        depth,
        isLeaf: true,
        isHighProfit,
        c0,
        c1,
        c1Pct,
      });
      return { x, y, h };
    }

    const leftW = getSubtreeWidth(node.left, depth + 1);
    const rightW = getSubtreeWidth(node.right, depth + 1);
    let leftResult: { x: number; y: number; h: number } | null = null;
    let rightResult: { x: number; y: number; h: number } | null = null;
    let x = (x0 + x1) / 2;

    if (node.left && node.right) {
      const totSubW = leftW + rightW + GAP_X;
      const availW = x1 - x0;
      let left0 = x0;
      let left1 = x0 + leftW;
      let right0 = left1 + GAP_X;
      let right1 = right0 + rightW;

      if (availW > totSubW) {
        const extra = (availW - totSubW) / 2;
        left0 += extra;
        left1 = left0 + leftW;
        right0 = left1 + GAP_X;
        right1 = right0 + rightW;
      }

      leftResult = assignPositions(node.left, left0, left1, depth + 1);
      rightResult = assignPositions(node.right, right0, right1, depth + 1);

      if (leftResult && rightResult) {
        x = (leftResult.x + rightResult.x) / 2;
      }
    } else if (node.left) {
      leftResult = assignPositions(node.left, x0, x1, depth + 1);
      if (leftResult) x = leftResult.x;
    } else if (node.right) {
      rightResult = assignPositions(node.right, x0, x1, depth + 1);
      if (rightResult) x = rightResult.x;
    }

    nodes.push({
      id,
      node,
      x,
      y,
      w: NODE_W,
      h,
      depth,
      isLeaf: false,
      isHighProfit,
      c0,
      c1,
      c1Pct,
    });

    const parentBottom = y + h;
    const ym = parentBottom + 22;

    if (leftResult) {
      connectors.push({
        id: `conn-l-${id}`,
        parentX: x,
        parentY: parentBottom,
        childX: leftResult.x,
        childY: leftResult.y,
        ym,
        isLeft: true,
        label: `True (≤ ${node.threshold ?? ""})`,
      });
    }

    if (rightResult) {
      connectors.push({
        id: `conn-r-${id}`,
        parentX: x,
        parentY: parentBottom,
        childX: rightResult.x,
        childY: rightResult.y,
        ym,
        isLeft: false,
        label: `False (> ${node.threshold ?? ""})`,
      });
    }

    return { x, y, h };
  }

  const rootW = getSubtreeWidth(treeData, 0);
  const totalW = Math.max(rootW + PAD_X * 2, 980);
  const rootPos = assignPositions(treeData, PAD_X, PAD_X + rootW, 0);
  const totalH = PAD_Y * 2 + (maxDepth + 1) * LEVEL_H;

  return {
    nodes,
    connectors,
    totalWidth: totalW,
    totalHeight: totalH,
    rootX: rootPos?.x ?? totalW / 2,
  };
}

export default function InteractiveDecisionTree({
  treeData,
}: {
  treeData?: TreeNodeData;
}) {
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(0.9);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => {
    if (!treeData) return null;
    return computeTreeLayout(treeData, maxDepth);
  }, [treeData, maxDepth]);

  // Auto-fit on initial render or when depth changes
  useEffect(() => {
    if (!layout || !containerRef.current) return;
    const clientW = containerRef.current.clientWidth;
    if (clientW > 0) {
      // Calculate fit scale
      const fit = Math.min(1.0, Math.max(0.55, (clientW - 60) / layout.totalWidth));
      if (fit >= 0.7) {
        setZoom(Number(fit.toFixed(2)));
        containerRef.current.scrollLeft = 0;
      } else {
        // Otherwise set comfortable zoom 0.85 and center root
        setZoom(0.85);
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollLeft = Math.max(
              0,
              layout.rootX * 0.85 - clientW / 2
            );
          }
        }, 50);
      }
    }
  }, [layout?.totalWidth, maxDepth]);

  if (!treeData || !layout) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
        No decision tree data available. Run classification with Decision Tree to generate model splits.
      </div>
    );
  }

  const meta = treeData.metadata || {
    total_nodes: 17,
    max_depth: 4,
    displayed_depth: 3,
    pruned: true,
  };

  const handleFitTree = () => {
    if (!containerRef.current) return;
    const clientW = containerRef.current.clientWidth;
    if (clientW <= 0) return;
    const fitScale = Math.min(1.0, Math.max(0.4, (clientW - 60) / layout.totalWidth));
    setZoom(Number(fitScale.toFixed(2)));
    containerRef.current.scrollLeft = 0;
  };

  const handleCenterRoot = () => {
    if (!containerRef.current) return;
    const clientW = containerRef.current.clientWidth;
    containerRef.current.scrollLeft = Math.max(0, layout.rootX * zoom - clientW / 2);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
  };

  const handleReset = () => {
    setZoom(1.0);
    if (containerRef.current) {
      const clientW = containerRef.current.clientWidth;
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = Math.max(0, layout.rootX - clientW / 2);
        }
      }, 30);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
    setIsDragging(true);
    if (containerRef.current) {
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const clientW = containerRef.current?.clientWidth || 900;
  const isCentered = layout.totalWidth * zoom < clientW;

  return (
    <div
      className="decision-tree-card"
      style={{
        background: "#ffffff",
        border: "1px solid #e3e9e5",
        borderRadius: "12px",
        padding: "18px",
        boxShadow: "0 2px 8px rgba(20, 50, 34, 0.04)",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header with Title, Controls, and Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "14px",
          borderBottom: "1px solid #edf1ee",
          marginBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#e9f6ef",
                color: "#0e8a4f",
                display: "grid",
                placeItems: "center",
              }}
            >
              <GitBranch size={16} />
            </div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#17201b" }}>
              Trained J48-Style Decision Tree (Entropy Split Criterion)
            </h4>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#68736c" }}>
            Fitted on 800 training transactions across 6 numerical features · Total model nodes:{" "}
            <strong>{meta.total_nodes}</strong> · Full tree depth: <strong>{meta.max_depth}</strong>
          </p>
        </div>

        {/* Toolbar: Depth Selectors + Navigation & Zoom Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Depth Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "#68736c", fontWeight: 600 }}>Depth:</span>
            <div style={{ display: "flex", gap: "3px", background: "#f1f5f2", padding: "3px", borderRadius: "7px" }}>
              {[2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setMaxDepth(d)}
                  style={{
                    border: "none",
                    background: maxDepth === d ? "#ffffff" : "transparent",
                    color: maxDepth === d ? "#0e8a4f" : "#68736c",
                    fontWeight: maxDepth === d ? 700 : 500,
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    boxShadow: maxDepth === d ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Depth {d}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: "1px", height: "20px", background: "#e2e8f0" }} />

          {/* Zoom and Fit Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8faf9", border: "1px solid #dce4df", padding: "3px", borderRadius: "8px" }}>
            <button
              onClick={handleFitTree}
              title="Fit entire tree to visible window"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                border: "none",
                background: "#ffffff",
                color: "#0e8a4f",
                fontWeight: 650,
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "5px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <Maximize2 size={13} />
              Fit Tree
            </button>

            <button
              onClick={handleCenterRoot}
              title="Center view on root node"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                border: "none",
                background: "transparent",
                color: "#475569",
                fontSize: "11px",
                padding: "4px 6px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              <Crosshair size={13} />
              Root
            </button>

            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.4}
              title="Zoom out"
              style={{
                border: "none",
                background: "transparent",
                color: zoom <= 0.4 ? "#cbd5e1" : "#475569",
                padding: "4px 6px",
                borderRadius: "4px",
                cursor: zoom <= 0.4 ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ZoomOut size={14} />
            </button>

            <span
              style={{
                fontSize: "11px",
                fontWeight: 650,
                color: "#1e293b",
                minWidth: "38px",
                textAlign: "center",
                userSelect: "none",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoom >= 1.5}
              title="Zoom in"
              style={{
                border: "none",
                background: "transparent",
                color: zoom >= 1.5 ? "#cbd5e1" : "#475569",
                padding: "4px 6px",
                borderRadius: "4px",
                cursor: zoom >= 1.5 ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={handleReset}
              title="Reset zoom to 100%"
              style={{
                border: "none",
                background: "transparent",
                color: "#64748b",
                padding: "4px 6px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Navigation Guide Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f8faf9",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
          border: "1px solid #edf1ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "#ffffff",
                border: "2px solid #0e8a4f",
                borderRadius: "3px",
              }}
            />
            Decision Node (Feature Split)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "#e9f6ef",
                border: "2px solid #0e8a4f",
                borderRadius: "3px",
              }}
            />
            Leaf: High Profit Class
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "#f1f5f9",
                border: "2px solid #64748b",
                borderRadius: "3px",
              }}
            />
            Leaf: Normal Profit Class
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#64748b", fontSize: "10px" }}>
          <span>
            {meta.max_depth > maxDepth
              ? `Notice: Tree visual pruned at depth ${maxDepth} for readability`
              : "Complete unpruned tree displayed"}
          </span>
          <span>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
            <Move size={11} /> Drag canvas or Shift+Scroll to pan
          </span>
        </div>
      </div>

      {/* Responsive Tree Scroll Viewport */}
      <div
        ref={containerRef}
        className="decision-tree-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "650px",
          minHeight: "440px",
          background: "#fafcfb",
          border: "1px solid #dce4df",
          borderRadius: "10px",
          position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: isDragging ? "none" : "auto",
        }}
      >
        {/* Content Box with scaled width to ensure scrollbar accurately reflects full tree */}
        <div
          style={{
            width: `${Math.max(clientW, Math.round(layout.totalWidth * zoom + PAD_X * 2))}px`,
            height: `${Math.round(layout.totalHeight * zoom + PAD_Y * 2)}px`,
            minWidth: "100%",
            position: "relative",
            padding: `${PAD_Y}px ${PAD_X}px`,
            boxSizing: "border-box",
            display: "flex",
            justifyContent: isCentered ? "center" : "flex-start",
          }}
        >
          {/* Scaled coordinate container */}
          <div
            style={{
              width: `${layout.totalWidth}px`,
              height: `${layout.totalHeight}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* SVG Connector Overlay */}
            <svg
              width={layout.totalWidth}
              height={layout.totalHeight}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {layout.connectors.map((c) => {
                const strokeColor = c.isLeft ? "#0e8a4f" : "#b45309";
                const badgeBg = c.isLeft ? "#e9f6ef" : "#fef3c7";
                const badgeBorder = c.isLeft ? "#bbf7d0" : "#fde68a";
                const badgeText = c.isLeft ? "#166534" : "#92400e";

                return (
                  <g key={c.id}>
                    {/* Orthogonal connector line */}
                    <path
                      d={`M ${c.parentX} ${c.parentY} V ${c.ym} H ${c.childX} V ${c.childY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Condition badge centered on vertical drop line to child */}
                    <g transform={`translate(${c.childX}, ${c.ym + 14})`}>
                      <rect
                        x={-55}
                        y={-10}
                        width={110}
                        height={20}
                        rx={5}
                        fill={badgeBg}
                        stroke={badgeBorder}
                        strokeWidth="1.5"
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="700"
                        fill={badgeText}
                        fontFamily="sans-serif"
                      >
                        {c.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Tree Node Cards */}
            {layout.nodes.map((n) => {
              const { node, x, y, w, h, isLeaf, isHighProfit, c0, c1, c1Pct } = n;

              return (
                <div
                  key={n.id}
                  style={{
                    position: "absolute",
                    left: `${x - w / 2}px`,
                    top: `${y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    background: isLeaf
                      ? isHighProfit
                        ? "#e9f6ef"
                        : "#f8fafc"
                      : "#ffffff",
                    border: `2px solid ${
                      isLeaf
                        ? isHighProfit
                          ? "#0e8a4f"
                          : "#64748b"
                        : "#0e8a4f"
                    }`,
                    borderRadius: "10px",
                    padding: "9px 12px",
                    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "center",
                    zIndex: 2,
                    userSelect: "none",
                  }}
                >
                  {/* Node Header Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      paddingBottom: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: isLeaf
                          ? isHighProfit
                            ? "#076a3b"
                            : "#475569"
                          : "#0e8a4f",
                      }}
                    >
                      {isLeaf ? "Leaf Node" : `Decision Node (D${node.depth})`}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        color: "#64748b",
                        background: "rgba(0,0,0,0.04)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      Entropy: {node.impurity.toFixed(3)}
                    </span>
                  </div>

                  {/* Node Condition or Predicted Class */}
                  {!isLeaf ? (
                    <div style={{ margin: "3px 0" }}>
                      <div style={{ fontSize: "9.5px", color: "#64748b", fontWeight: 500 }}>
                        Split Condition
                      </div>
                      <strong
                        style={{
                          fontSize: "11.5px",
                          color: "#0f172a",
                          display: "block",
                          marginTop: "1px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={node.condition || `${node.feature} ≤ ${node.threshold}`}
                      >
                        {node.condition || `${node.feature} ≤ ${node.threshold}`}
                      </strong>
                    </div>
                  ) : (
                    <div style={{ margin: "3px 0" }}>
                      <div
                        style={{
                          fontSize: "9.5px",
                          color: isHighProfit ? "#076a3b" : "#475569",
                          fontWeight: 600,
                        }}
                      >
                        Predicted Class
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isHighProfit ? "#076a3b" : "#334155",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "1px",
                        }}
                      >
                        {isHighProfit ? (
                          <CheckCircle2 size={13} color="#0e8a4f" />
                        ) : (
                          <Info size={13} color="#64748b" />
                        )}
                        {node.class || (isHighProfit ? "High Profit" : "Normal")}
                      </div>
                    </div>
                  )}

                  {/* Samples and Distribution Bar */}
                  <div
                    style={{
                      borderTop: "1px dashed rgba(0,0,0,0.08)",
                      paddingTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "9px",
                        color: "#475569",
                        marginBottom: "2px",
                      }}
                    >
                      <span>
                        Samples: <strong>{node.samples}</strong>
                      </span>
                      <span>
                        Ratio: <strong>{c1Pct.toFixed(0)}% High</strong>
                      </span>
                    </div>

                    {/* Class Ratio Bar */}
                    <div
                      style={{
                        width: "100%",
                        height: "5px",
                        borderRadius: "2.5px",
                        background: "#cbd5e1",
                        overflow: "hidden",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{ width: `${100 - c1Pct}%`, background: "#94a3b8" }}
                        title={`Normal: ${c0}`}
                      />
                      <div
                        style={{ width: `${c1Pct}%`, background: "#0e8a4f" }}
                        title={`High Profit: ${c1}`}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "8.5px",
                        color: "#64748b",
                        marginTop: "1px",
                      }}
                    >
                      <span>Normal: {c0}</span>
                      <span>High: {c1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
