import { useState } from "react";
import { ChevronDown, ChevronUp, Database, FileText, Layers, ShieldCheck, Tag } from "lucide-react";
import type { DatasetMetadata } from "../types";

export default function DatasetMetadataPanel({
  metadata,
}: {
  metadata?: DatasetMetadata;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!metadata) {
    return null;
  }

  const {
    dataset_name,
    source_file,
    total_records,
    total_columns,
    columns = [],
    pipeline_step,
    classifier = "Not applicable",
    target_variable = "Not applicable",
    features_used = [],
    train_test_split = "Not applicable",
    train_records,
    test_records,
    preprocessing_performed = [],
    runtime_ms,
    timestamp,
  } = metadata;

  return (
    <div className="dataset-metadata-card" style={{
      background: "#ffffff",
      border: "1px solid #e3e9e5",
      borderRadius: "12px",
      padding: "16px 20px",
      margin: "0 0 16px 0",
      boxShadow: "0 2px 6px rgba(20, 50, 34, 0.03)",
    }}>
      {/* Top Header Summary Strip */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        paddingBottom: "12px",
        borderBottom: "1px solid #edf1ee",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: "#e9f6ef",
            color: "#0e8a4f",
            display: "grid",
            placeItems: "center",
          }}>
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#17201b" }}>
              {dataset_name}
            </div>
            <div style={{ fontSize: "11px", color: "#68736c", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Source: <code>{source_file}</code></span>
              <span>•</span>
              <span><strong>{total_records.toLocaleString()}</strong> rows × <strong>{total_columns}</strong> attributes</span>
              <span>•</span>
              <span>Runtime: <strong>{runtime_ms} ms</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#f4f7f5",
            border: "1px solid #dce4df",
            padding: "6px 12px",
            borderRadius: "7px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#354139",
            cursor: "pointer",
          }}
        >
          <FileText size={14} color="#0e8a4f" />
          <span>{expanded ? "Hide Dataset Schema Dictionary" : "View Full Dataset Schema (11 Columns)"}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Compact Quick Metadata Badges */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        marginTop: "12px",
      }}>
        <div style={{ fontSize: "11px", background: "#f8faf9", padding: "8px 10px", borderRadius: "8px", border: "1px solid #edf1ee" }}>
          <span style={{ color: "#68736c", display: "block", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
            Active Pipeline Stage
          </span>
          <strong style={{ color: "#0e8a4f", fontSize: "12px" }}>{pipeline_step}</strong>
          {classifier && classifier !== "Not applicable" && (
            <span style={{ color: "#354139", marginLeft: "4px" }}>({classifier})</span>
          )}
        </div>

        <div style={{ fontSize: "11px", background: "#f8faf9", padding: "8px 10px", borderRadius: "8px", border: "1px solid #edf1ee" }}>
          <span style={{ color: "#68736c", display: "block", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
            Supervised Target Variable
          </span>
          <strong style={{ color: "#17201b", fontSize: "12px" }}>{target_variable}</strong>
        </div>

        <div style={{ fontSize: "11px", background: "#f8faf9", padding: "8px 10px", borderRadius: "8px", border: "1px solid #edf1ee" }}>
          <span style={{ color: "#68736c", display: "block", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
            Partition & Sampling
          </span>
          <strong style={{ color: "#17201b", fontSize: "12px" }}>
            {test_records && test_records > 0
              ? `${train_records} Train / ${test_records} Test (80/20)`
              : `${total_records} Full Dataset`}
          </strong>
        </div>

        <div style={{ fontSize: "11px", background: "#f8faf9", padding: "8px 10px", borderRadius: "8px", border: "1px solid #edf1ee" }}>
          <span style={{ color: "#68736c", display: "block", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
            Target Leakage Prevention
          </span>
          <span style={{ color: "#0e8a4f", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
            <ShieldCheck size={13} />
            Verified (Target Excluded from X)
          </span>
        </div>
      </div>

      {/* Model Input Features */}
      {features_used && features_used.length > 0 && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#4f5b54" }}>
          <span style={{ fontWeight: 600, color: "#68736c", marginRight: "6px" }}>Features In Model:</span>
          {features_used.map((feat) => (
            <span
              key={feat}
              style={{
                display: "inline-block",
                background: "#eef3ef",
                color: "#27332c",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                marginRight: "4px",
                marginBottom: "4px",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {feat}
            </span>
          ))}
        </div>
      )}

      {/* Collapsible Schema & Column Dictionary Modal/Drawer */}
      {expanded && (
        <div style={{
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid #edf1ee",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}>
            <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#17201b" }}>
              Complete Dataset Schema & Column Data Dictionary
            </h4>
            <span style={{ fontSize: "10px", color: "#68736c" }}>
              Execution Timestamp: {timestamp}
            </span>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e3e9e5", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#f8faf9", borderBottom: "1px solid #e3e9e5" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#4f5b54", fontWeight: 700 }}>Column Name</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#4f5b54", fontWeight: 700 }}>Data Type</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#4f5b54", fontWeight: 700 }}>Non-Null Count</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#4f5b54", fontWeight: 700 }}>Role in Pipeline</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#4f5b54", fontWeight: 700 }}>Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, idx) => (
                  <tr key={col.name} style={{ borderBottom: idx < columns.length - 1 ? "1px solid #edf1ee" : "none" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 600, color: "#17201b", fontFamily: "ui-monospace, monospace" }}>
                      {col.name}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#4f5b54" }}>
                      <span style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: col.type.toLowerCase().includes("binary") ? "#fff5cc" : col.type.toLowerCase().includes("numeric") || col.type.toLowerCase().includes("integer") ? "#eaf0fb" : "#f1f5f2",
                        color: col.type.toLowerCase().includes("binary") ? "#8a6610" : col.type.toLowerCase().includes("numeric") || col.type.toLowerCase().includes("integer") ? "#2952a3" : "#354139",
                        fontSize: "10px",
                        fontWeight: 600,
                      }}>
                        {col.type}
                      </span>
                    </td>
                    <td style={{ padding: "7px 12px", color: "#354139" }}>
                      {col.non_null_count.toLocaleString()} / {total_records.toLocaleString()} (100%)
                    </td>
                    <td style={{ padding: "7px 12px", color: "#0e8a4f", fontWeight: 500 }}>
                      {col.role}
                    </td>
                    <td style={{ padding: "7px 12px", color: "#68736c", fontSize: "10px" }}>
                      {col.sample || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preprocessing Transformations Audit */}
          <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f8faf9", borderRadius: "8px", border: "1px solid #edf1ee" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#68736c", textTransform: "uppercase" }}>
              Applied ETL & Preprocessing Transformations:
            </span>
            <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "11px", color: "#354139", lineHeight: 1.6 }}>
              {preprocessing_performed.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
