import React, { useMemo, useState } from "react";
import { Card, Button, Skeleton, Space, Segmented, Grid } from "antd";
import { DownloadOutlined, PictureOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";

export default function IncidentTable({ cases = [], loading }) {
  const [mode, setMode] = useState("Half-Year"); // "Half-Year" | "Quarterly"
  const [period, setPeriod] = useState("first"); // first | second | Q1 | Q2 | Q3 | Q4

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // xs/sm => mobile

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
      title="Incident Type by Period"
      extra={
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isMobile ? 6 : 10,
            alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            maxWidth: isMobile ? 320 : "100%", // prevent overflow on tiny screens
          }}
        >
          {/* Granularity Toggle */}
          <Segmented
            options={modeOptions}
            size={isMobile ? "small" : "middle"}
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
              size={isMobile ? "small" : "middle"}
              value={period}
              onChange={setPeriod}
            />
          ) : (
            <Segmented
              options={quarterOptions}
              size={isMobile ? "small" : "middle"}
              value={period}
              onChange={setPeriod}
            />
          )}

          {/* Download Buttons */}
          <Space wrap size={isMobile ? 4 : 8}>
            <Button
              onClick={downloadCSV}
              size={isMobile ? "small" : "middle"}
              icon={<DownloadOutlined />}
            >
              {!isMobile && "Download CSV"}
            </Button>
            <Button
              onClick={downloadImage}
              size={isMobile ? "small" : "middle"}
              icon={<PictureOutlined />}
            >
              {!isMobile && "Download Image"}
            </Button>
          </Space>
        </div>
      }
      style={{ borderRadius: 16 }}
    >
      {loading ? (
        <Skeleton active />
      ) : (
        <div style={{ overflowX: "auto" }} id="incident-table">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "1px solid #ddd",
                    padding: 8,
                    textAlign: "left",
                  }}
                >
                  Incident Type
                </th>
                {incidentData.labels.map((m) => (
                  <th
                    key={m}
                    style={{ borderBottom: "1px solid #ddd", padding: 8 }}
                  >
                    {m}
                  </th>
                ))}
                <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {incidentData.data.map((row) => (
                <tr key={row.incidentType}>
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    {row.incidentType}
                  </td>
                  {row.months.map((val, i) => (
                    <td
                      key={i}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        padding: 8,
                      }}
                    >
                      {val}
                    </td>
                  ))}
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: 8,
                      fontWeight: 600,
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
