import React, { useMemo, useState } from "react";
import { Card, Button, Skeleton, Space, Segmented, Grid } from "antd";
import { DownloadOutlined, PictureOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";
import { generateAbuseReport } from "../utils/generateAbuseReport";
import { buildAbuseDocxTable } from "../utils/buildAbuseDocxTable";
import { buildMonthlySummary } from "../utils/buildMonthlySummary";

export default function IncidentTable({ cases = [], loading }) {
  const [mode, setMode] = useState("Half-Year"); // "Half-Year" | "Quarterly"
  const [period, setPeriod] = useState("first"); // first | second | Q1 | Q2 | Q3 | Q4

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // xs/sm => mobile

  const { summary, totalRow } = buildMonthlySummary(cases);
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const incidentData = useMemo(() => {
    let start = 0,
      end = 6,
      labels = [],
      rangeName = "";

    if (mode === "Half-Year") {
      if (period === "first") {
        start = 0;
        end = 6;
        labels = monthLabels.slice(0, 6);
        rangeName = "First Half";
      } else {
        start = 6;
        end = 12;
        labels = monthLabels.slice(6, 12);
        rangeName = "Second Half";
      }
    } else {
      const quarters = {
        Q1: [0, 3],
        Q2: [3, 6],
        Q3: [6, 9],
        Q4: [9, 12],
      };
      [start, end] = quarters[period];
      labels = monthLabels.slice(start, end);
      rangeName = `${period}`;
    }

    const allIncidentTypes = Array.from(
      new Set(cases.map((c) => c.incidentType || "Unknown"))
    );
    const map = {};
    allIncidentTypes.forEach((t) => (map[t] = Array(end - start).fill(0)));

    cases.forEach((c) => {
      const d = new Date(c.dateReported || c.createdAt);
      const m = d.getMonth();
      if (m >= start && m < end) {
        const type = c.incidentType || "Unknown";
        map[type][m - start] += 1;
      }
    });

    return {
      labels,
      data: Object.entries(map).map(([incidentType, months]) => ({
        incidentType,
        months,
        total: months.reduce((a, b) => a + b, 0),
      })),
      rangeName,
    };
  }, [cases, period, mode]);

  const downloadCSV = () => {
    const header = ["Incident Type", ...incidentData.labels, "Total"];
    const rows = incidentData.data.map((row) =>
      [row.incidentType, ...row.months, row.total].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident_type_${incidentData.rangeName.replace(
      " ",
      "_"
    )}.csv`;
    a.click();
  };

  const downloadImage = () => {
    const tableElement = document.getElementById("incident-table");
    if (!tableElement) return;
    html2canvas(tableElement, { scale: 2 }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `incident_type_${incidentData.rangeName.replace(
        " ",
        "_"
      )}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  // responsive options for segmented controls
  const modeOptions = isMobile
    ? [
      { label: "Half", value: "Half-Year" },
      { label: "Qtr", value: "Quarterly" },
    ]
    : ["Half-Year", "Quarterly"];

  const halfOptions = isMobile
    ? [
      { label: "1st", value: "first" },
      { label: "2nd", value: "second" },
    ]
    : [
      { label: "1st Half", value: "first" },
      { label: "2nd Half", value: "second" },
    ];

  const quarterOptions = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <Card
      title={
        <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>
          Incident Type by Period
        </span>
      }
      extra={
        isMobile ? null : ( // Move controls below title on mobile
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {/* Granularity Toggle */}
            <Segmented
              options={modeOptions}
              size="middle"
              value={mode}
              onChange={(val) => {
                setMode(val);
                setPeriod(val === "Half-Year" ? "first" : "Q1");
              }}
            />

            {/* Period Toggle */}
            {mode === "Half-Year" ? (
              <Segmented
                options={halfOptions}
                size="middle"
                value={period}
                onChange={setPeriod}
              />
            ) : (
              <Segmented
                options={quarterOptions}
                size="middle"
                value={period}
                onChange={setPeriod}
              />
            )}

            {/* Download Buttons */}
            <Space wrap size={8}>
              <Button
                onClick={downloadCSV}
                size="middle"
                icon={<DownloadOutlined />}
              >
                Download CSV
              </Button>
              <Button
                onClick={downloadImage}
                size="middle"
                icon={<PictureOutlined />}
              >
                Download Image
              </Button>
              <Button
                type="primary"
                size="middle"
                onClick={() => {
                  const { summary, totalRow } = buildMonthlySummary(cases);
                  generateAbuseReport(summary, totalRow);
                }}
              >
                Download DOCX
              </Button>
            </Space>
          </div>
        )
      }
      style={{ borderRadius: isMobile ? 8 : 16 }}
    >
      {/* Mobile Controls - shown below title */}
      {isMobile && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Segmented
              options={modeOptions}
              size="small"
              value={mode}
              onChange={(val) => {
                setMode(val);
                setPeriod(val === "Half-Year" ? "first" : "Q1");
              }}
              style={{ flex: 1, minWidth: 120 }}
            />
            {mode === "Half-Year" ? (
              <Segmented
                options={halfOptions}
                size="small"
                value={period}
                onChange={setPeriod}
                style={{ flex: 1, minWidth: 120 }}
              />
            ) : (
              <Segmented
                options={quarterOptions}
                size="small"
                value={period}
                onChange={setPeriod}
                style={{ flex: 1, minWidth: 120 }}
              />
            )}
          </div>
          <Space wrap size={4} style={{ width: "100%" }}>
            <Button
              onClick={downloadCSV}
              size="small"
              icon={<DownloadOutlined />}
              style={{ fontSize: 11 }}
            >
              CSV
            </Button>
            <Button
              onClick={downloadImage}
              size="small"
              icon={<PictureOutlined />}
              style={{ fontSize: 11 }}
            >
              Image
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                const { summary, totalRow } = buildMonthlySummary(cases);
                generateAbuseReport(summary, totalRow);
              }}
              style={{ fontSize: 11 }}
            >
              DOCX
            </Button>
          </Space>
        </div>
      )}
    
      {loading ? (
        <Skeleton active />
      ) : (
        <div 
          style={{ 
            overflowX: "auto",
            WebkitOverflowScrolling: "touch", // smooth scrolling on iOS
            marginLeft: isMobile ? -16 : 0,
            marginRight: isMobile ? -16 : 0,
            paddingLeft: isMobile ? 16 : 0,
            paddingRight: isMobile ? 16 : 0,
          }} 
          id="incident-table"
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              background: "#fff",
              fontSize: isMobile ? 11 : 14,
              minWidth: isMobile ? 600 : "auto", // ensure horizontal scroll on small screens
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #ddd",
                    padding: isMobile ? "6px 4px" : 8,
                    textAlign: "left",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fff",
                    zIndex: 1,
                    whiteSpace: isMobile ? "nowrap" : "normal",
                    fontSize: isMobile ? 11 : 14,
                  }}
                >
                  Incident Type
                </th>
                {incidentData.labels.map((m) => (
                  <th
                    key={m}
                    style={{ 
                      borderBottom: "1px solid #ddd", 
                      padding: isMobile ? "6px 4px" : 8,
                      whiteSpace: isMobile ? "nowrap" : "normal",
                      fontSize: isMobile ? 11 : 14,
                    }}
                  >
                    {m}
                  </th>
                ))}
                <th style={{ 
                  borderBottom: "1px solid #ddd", 
                  padding: isMobile ? "6px 4px" : 8,
                  fontSize: isMobile ? 11 : 14,
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {incidentData.data.map((row, idx) => (
                <tr key={row.incidentType}>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: isMobile ? "6px 4px" : 8,
                      textAlign: "left",
                      position: "sticky",
                      left: 0,
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      zIndex: 1,
                      whiteSpace: isMobile ? "nowrap" : "normal",
                      fontSize: isMobile ? 11 : 14,
                    }}
                  >
                    {row.incidentType}
                  </td>
                  {row.months.map((val, i) => (
                    <td
                      key={i}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        padding: isMobile ? "6px 4px" : 8,
                        backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                        fontSize: isMobile ? 11 : 14,
                      }}
                    >
                      {val}
                    </td>
                  ))}
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: isMobile ? "6px 4px" : 8,
                      fontWeight: 600,
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      fontSize: isMobile ? 11 : 14,
                    }}
                  >
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
