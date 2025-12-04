import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Spin, Alert, Modal, Button, Layout, Typography, Space, Grid, Statistic, Select, Input, DatePicker } from "antd";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  BarChartOutlined,
  PieChartOutlined,
  EnvironmentOutlined,
  FireOutlined,
  FundOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  DownOutlined,
  RightOutlined,
  MoreOutlined,
  BulbOutlined,
  FilePdfOutlined,
  FilterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  softBorder: "rgba(122,90,248,0.18)",
  rowHover: "#F1EEFF",
};

const glassCard = {
  borderRadius: 14,
  background: "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: `1px solid ${BRAND.softBorder}`,
  boxShadow: "0 10px 26px rgba(16,24,40,0.06)",
};

const ABUSE_COLORS = {
  "Physical Abuse": "#FF4C4C",
  "Physical": "#FF4C4C",
  "Emotional Abuse": "#FFA500",
  "Emotional": "#FFA500",
  "Sexual Abuse": "#FFBB28",
  "Sexual": "#FFBB28",
  "Psychological Abuse": "#7A5AF8",
  "Psychological": "#7A5AF8",
  "Economic Abuse": "#00C49F",
  "Economic": "#00C49F",
  "Neglect": "#00C49F",
  "Others": "#e91e63"
};

const Analytics = () => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  const isMdUp = !!screens.md;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overallData, setOverallData] = useState([]);
  const [perLocationData, setPerLocationData] = useState([]);
  const [mostCommonData, setMostCommonData] = useState([]);
  const [mostCommonAbuse, setMostCommonAbuse] = useState(null);

  const [casesModalVisible, setCasesModalVisible] = useState(false);
  const [casesData, setCasesData] = useState([]);
  const [selectedPurok, setSelectedPurok] = useState("");
  const [selectedIncident, setSelectedIncident] = useState("");

  const [descriptions, setDescriptions] = useState([]);
  const [descLoading, setDescLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedCase, setSelectedCase] = useState(null);
  const [detailPanelVisible, setDetailPanelVisible] = useState(false);
  const [expandedPurok, setExpandedPurok] = useState(null);
  const [purokCases, setPurokCases] = useState({});

  // Export and Filter states
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterPurok, setFilterPurok] = useState("all");
  const [filterAbuseType, setFilterAbuseType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [filterVictimType, setFilterVictimType] = useState("all");


  const internalKey = import.meta.env.VITE_INTERNAL_API_KEY;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterVictimType !== "all") {
        params.victimType = filterVictimType;
      }

      const [overallRes, perLocRes, mostCommonRes] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/abuse-distribution`, {
          headers: { "x-internal-key": internalKey },
          params
        }),
        axios.get(`${API_BASE}/api/analytics/abuse-per-location`, {
          headers: { "x-internal-key": internalKey },
          params
        }),
        axios.get(`${API_BASE}/api/analytics/most-common-per-location`, {
          headers: { "x-internal-key": internalKey },
          params
        })
      ]);
      setOverallData((overallRes.data.data || []).map(d => ({ name: d._id, value: d.count })));
      setPerLocationData(formatPerLocation(perLocRes.data.data || []));
      setMostCommonData(mostCommonRes.data.data || []);
      const data = overallRes.data.data;
      // Find the object with the highest count
      const highest = data.reduce((max, item) =>
        item.count > max.count ? item : max
        , data[0]); // start with the first item

      // Set it to state
      setMostCommonAbuse(highest);
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Clear expanded rows when filters change
    setExpandedPurok(null);
    setPurokCases({});
    setDetailPanelVisible(false);
    setSelectedCase(null);
    setDescriptions([]);
  }, [filterVictimType, filterPurok]);

  const fetchDescriptions = async (incidentType, purok) => {
    try {
      setDescLoading(true);

      const res = await axios.post(
        `${API_BASE}/api/analytics/ai`,
        { incidentType, purok },
        { headers: { "x-internal-key": internalKey } }
      );

      setDescriptions(res.data.reasons || []); // update frontend with new AI reasons
      setLastUpdated(res.data.updatedAt ? new Date(res.data.updatedAt) : null);

    } catch (err) {
      console.error("Failed to fetch AI insights", err);
      setDescriptions([]);
    } finally {
      setDescLoading(false);
    }
  };

  const formatPerLocation = (data) => {
    const allTypes = new Set();
    data.forEach(loc => loc.abuses.forEach(a => allTypes.add(a.type)));
    const typesArray = Array.from(allTypes);
    return data.map(loc => {
      const obj = { location: loc._id };
      typesArray.forEach(t => {
        const abuse = loc.abuses.find(a => a.type === t);
        obj[t] = abuse ? abuse.count : 0;
      });
      return obj;
    });
  };

  // Compute filtered data for charts based on Purok filter
  const getFilteredChartData = () => {
    if (filterPurok === "all") {
      return {
        overallFiltered: overallData,
        perLocationFiltered: perLocationData
      };
    }

    // Filter perLocationData
    const perLocationFiltered = perLocationData.filter(d => d.location === filterPurok);

    // Compute overallFiltered based on selected Purok
    const overallFiltered = [];
    if (perLocationFiltered.length > 0) {
      const locationData = perLocationFiltered[0];
      Object.keys(locationData).forEach(key => {
        if (key !== "location" && locationData[key] > 0) {
          overallFiltered.push({ name: key, value: locationData[key] });
        }
      });
    }

    return { overallFiltered, perLocationFiltered };
  };

  const { overallFiltered, perLocationFiltered } = getFilteredChartData();

  // Filter table data based on Purok filter
  const filteredTableData = filterPurok === "all"
    ? mostCommonData
    : mostCommonData.filter(d => d.location === filterPurok);

  const sortedTableData = [...filteredTableData].sort((a, b) => {
    const aNum = parseInt(a.location.replace(/\D/g, ""), 10); // extract number
    const bNum = parseInt(b.location.replace(/\D/g, ""), 10);
    return aNum - bNum;
  });

  const fetchCasesByPurok = async (purok) => {
    try {
      // If already expanded and same purok, collapse it
      if (expandedPurok === purok) {
        setExpandedPurok(null);
        setDetailPanelVisible(false);
        setSelectedCase(null);
        return;
      }

      const params = { purok };
      if (filterVictimType !== "all") {
        params.victimType = filterVictimType;
      }

      const res = await axios.get(`${API_BASE}/api/analytics/cases-by-purok`, {
        headers: { "x-internal-key": internalKey },
        params
      });

      const cases = res.data.data || [];
      setPurokCases(prev => ({ ...prev, [purok]: cases }));
      setExpandedPurok(purok);
      setSelectedPurok(res.data.purok || purok);
      setSelectedIncident(res.data.mostCommonType || "N/A");
      setDetailPanelVisible(false);
      setSelectedCase(null);

      // Fetch cached AI insights for display
      if (res.data.mostCommonType) {
        const cached = await axios.get(`${API_BASE}/api/analytics/insights`, {
          headers: { "x-internal-key": internalKey },
          params: { purok, incidentType: res.data.mostCommonType }
        });
        setDescriptions(cached.data.reasons || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch cases for this purok.");
    }
  };

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
    setDetailPanelVisible(true);
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);

      // Use the already filtered data from charts
      const { overallFiltered, perLocationFiltered } = getFilteredChartData();

      // Filter mostCommonData based on selected filters
      let filteredMostCommonData = [...mostCommonData];

      if (filterPurok !== "all") {
        filteredMostCommonData = filteredMostCommonData.filter(d => d.location === filterPurok);
      }

      if (filterAbuseType !== "all") {
        filteredMostCommonData = filteredMostCommonData.filter(d => d.mostCommon === filterAbuseType);
      }

      // Use the filtered data from charts (already respects purok and victim type filters)
      let filteredOverallData = overallFiltered;
      if (filterAbuseType !== "all") {
        filteredOverallData = filteredOverallData.filter(d => d.name === filterAbuseType);
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      pdf.setFillColor(122, 90, 248);
      pdf.rect(0, 0, pageWidth, 35, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VAW Care Analytics Report', pageWidth / 2, 15, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 25, { align: 'center' });

      yPos = 45;

      // Applied Filters Section
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Applied Filters', 14, yPos);
      yPos += 7;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Purok: ${filterPurok === "all" ? "All Puroks" : filterPurok}`, 14, yPos);
      yPos += 5;
      pdf.text(`Abuse Type: ${filterAbuseType === "all" ? "All Types" : filterAbuseType}`, 14, yPos);
      yPos += 5;
      pdf.text(`Victim Type: ${filterVictimType === "all" ? "All Victims" : filterVictimType === "woman" ? "Women" : "Children"}`, 14, yPos);
      yPos += 5;
      pdf.text(`Date Range: ${filterDateRange ? `${filterDateRange[0].format('MM/DD/YYYY')} - ${filterDateRange[1].format('MM/DD/YYYY')}` : "All Dates"}`, 14, yPos);
      yPos += 10;

      // Summary Statistics
      const totalCases = filteredOverallData.reduce((sum, d) => sum + d.value, 0);
      const totalPuroks = filteredMostCommonData.length;

      pdf.setFillColor(250, 249, 255);
      pdf.rect(14, yPos, pageWidth - 28, 30, 'F');
      pdf.setDrawColor(122, 90, 248);
      pdf.setLineWidth(0.5);
      pdf.rect(14, yPos, pageWidth - 28, 30, 'S');

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(122, 90, 248);
      pdf.text('Summary Statistics', 20, yPos + 8);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Total Cases: ${totalCases}`, 20, yPos + 16);
      pdf.text(`Puroks Analyzed: ${totalPuroks}`, 20, yPos + 23);

      if (filteredMostCommonData.length > 0) {
        pdf.text(`Most Common Abuse: ${filteredMostCommonData[0]?.mostCommon || "N/A"}`, pageWidth / 2 + 10, yPos + 16);
      }

      yPos += 40;

      // Overall Abuse Distribution Table
      if (filteredOverallData.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(122, 90, 248);
        pdf.text('Overall Abuse Distribution', 14, yPos);
        yPos += 5;

        autoTable(pdf, {
          startY: yPos,
          head: [['Abuse Type', 'Count', 'Percentage']],
          body: filteredOverallData.map(d => [
            d.name,
            d.value,
            `${((d.value / totalCases) * 100).toFixed(1)}%`
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: [122, 90, 248],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: [250, 249, 255]
          },
          margin: { left: 14, right: 14 }
        });

        yPos = pdf.lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = 20;
      }

      // Cases by Purok Table
      if (filteredMostCommonData.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(122, 90, 248);
        pdf.text('Cases by Purok', 14, yPos);
        yPos += 5;

        autoTable(pdf, {
          startY: yPos,
          head: [['Purok', 'Most Common Abuse', 'Count']],
          body: filteredMostCommonData.map(d => [
            d.location,
            d.mostCommon,
            d.count
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: [122, 90, 248],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: [250, 249, 255]
          },
          margin: { left: 14, right: 14 }
        });

        yPos = pdf.lastAutoTable.finalY + 15;
      }

      // AI Insights Section
      if (expandedPurok && descriptions.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(122, 90, 248);
        pdf.text(`AI Insights for ${selectedPurok}`, 14, yPos);
        yPos += 7;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Incident Type: ${selectedIncident}`, 14, yPos);
        yPos += 5;
        if (lastUpdated) {
          pdf.text(`Last Updated: ${new Date(lastUpdated).toLocaleString()}`, 14, yPos);
          yPos += 8;
        } else {
          yPos += 5;
        }

        descriptions.forEach((desc, idx) => {
          if (yPos > pageHeight - 25) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFillColor(246, 243, 255);
          const textLines = pdf.splitTextToSize(`${idx + 1}. ${desc}`, pageWidth - 35);
          const boxHeight = textLines.length * 5 + 6;
          pdf.rect(14, yPos, pageWidth - 28, boxHeight, 'F');

          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          pdf.text(textLines, 18, yPos + 5);
          yPos += boxHeight + 4;
        });
      }

      // Footer on all pages
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${pageCount} | VAW Care System`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `VAWCare_Analytics_${filterPurok !== "all" ? filterPurok + "_" : ""}${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setExportModalVisible(false);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const tableColumns = [
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: "Most Common Abuse",
      dataIndex: "mostCommon",
      key: "mostCommon",
      render: (text, record) => (
        <Button
          type="link"
          onClick={async () => {
            await fetchCasesByPurok(record.location);
          }}
          style={{ color: BRAND.violet, fontWeight: 600 }}
          icon={<EyeOutlined />}
        >
          {text}
        </Button>
      )
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      render: (text) => <Text style={{ fontWeight: 700, color: BRAND.violet }}>{text}</Text>
    }
  ];

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh", background: BRAND.pageBg }}>
        <Content style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spin size="large" tip="Loading analytics..." />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: "100vh", background: BRAND.pageBg }}>
        <Content style={{ padding: 24 }}>
          <Alert message={error} type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: BRAND.pageBg }}>
      {/* Header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.softBorder}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderColor: BRAND.violet, color: BRAND.violet, fontWeight: 600 }}
          >
            {isMdUp ? "Back" : null}
          </Button>

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              Analytics Dashboard
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Comprehensive abuse case statistics and insights
              </Text>
            )}
          </div>
        </div>

        <Space>
          {/* Refresh Button */}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
            style={{
              borderColor: BRAND.violet,
              color: BRAND.violet,
              fontWeight: 600,
            }}
          >
            {isMdUp ? "Refresh" : null}
          </Button>

          {/* Export Button */}
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => setExportModalVisible(true)}
            style={{
              background: BRAND.violet,
              borderColor: BRAND.violet,
              border: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(122, 90, 248, 0.3)",
            }}
          >
            {isMdUp ? "Export PDF" : "PDF"}
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: isXs ? 12 : 24, paddingTop: 16 }}>
        {/* KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">{filterPurok === "all" ? "Total Cases" : `Cases in ${filterPurok}`}</Text>}
                value={overallFiltered.reduce((sum, d) => sum + d.value, 0)}
                prefix={<FundOutlined style={{ color: BRAND.violet }} />}
                valueStyle={{ color: BRAND.violet, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">{filterPurok === "all" ? "Total Puroks" : "Filtered Puroks"}</Text>}
                value={perLocationFiltered.length}
                prefix={<EnvironmentOutlined style={{ color: "#00C49F" }} />}
                valueStyle={{ color: "#00C49F", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">Most Common Abuse</Text>}
                value={mostCommonAbuse._id || "N/A"}
                prefix={<FireOutlined style={{ color: "#FF4C4C" }} />}
                valueStyle={{ color: "#FF4C4C", fontWeight: 700, fontSize: isXs ? 16 : 24 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filter for Charts */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24}>
            <Card style={{ ...glassCard, padding: "8px 16px" }}>
              <Space wrap>
                <Text strong style={{ color: BRAND.violet }}>
                  <FilterOutlined style={{ marginRight: 8 }} />
                  Filter Charts:
                </Text>
                <Select
                  value={filterPurok}
                  onChange={setFilterPurok}
                  style={{ width: isXs ? 150 : 200 }}
                  placeholder="Select Purok"
                >
                  <Option value="all">All Puroks</Option>
                  {mostCommonData.map(d => (
                    <Option key={d.location} value={d.location}>
                      {d.location}
                    </Option>
                  ))}
                </Select>
                <Select
                  value={filterVictimType}
                  onChange={setFilterVictimType}
                  style={{ width: isXs ? 150 : 200 }}
                  placeholder="Victim Type"
                >
                  <Option value="all">All Victims</Option>
                  <Option value="woman">Women</Option>
                  <Option value="child">Children</Option>
                </Select>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              style={glassCard}
              title={
                <Space>
                  <PieChartOutlined style={{ color: BRAND.violet }} />
                  <Text strong>Overall Abuse Distribution</Text>
                </Space>
              }
              bordered={false}
            >
              <ResponsiveContainer width="100%" height={isXs ? 250 : 320}>
                <PieChart>
                  <Pie
                    data={overallFiltered}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isXs ? 80 : 100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {overallFiltered.map(entry => (
                      <Cell key={entry.name} fill={ABUSE_COLORS[entry.name] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} cases`, name]}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${BRAND.softBorder}` }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              style={glassCard}
              title={
                <Space>
                  <BarChartOutlined style={{ color: BRAND.violet }} />
                  <Text strong>Abuse Distribution Per Location</Text>
                </Space>
              }
              bordered={false}
            >
              <ResponsiveContainer width="100%" height={isXs ? 250 : 320}>
                <BarChart data={perLocationFiltered}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.softBorder} />
                  <XAxis
                    dataKey="location"
                    tick={{ fontSize: 12 }}
                    angle={isXs ? -45 : 0}
                    textAnchor={isXs ? "end" : "middle"}
                    height={isXs ? 60 : 30}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: `1px solid ${BRAND.softBorder}` }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="circle"
                  />
                  {Object.keys(perLocationFiltered[0] || {})
                    .filter(k => k !== "location")
                    .map((key) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={ABUSE_COLORS[key] || "#8884d8"}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Table with Detail Panel */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={detailPanelVisible ? 14 : 24} style={{ transition: "all 0.3s ease" }}>
            <Card
              style={glassCard}
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: BRAND.violet }} />
                  <Text strong>Cases Per Location</Text>
                </Space>
              }
              bordered={false}
            >
              <div style={{ overflowX: "auto" }}>
                <table className="modern-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                      <th style={{
                        padding: "16px 20px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#8b8b8b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background: "#fafafa",
                      }}>
                        Purok
                      </th>
                      <th style={{
                        padding: "16px 20px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#8b8b8b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background: "#fafafa",
                      }}>
                        Most Common
                      </th>
                      <th style={{
                        padding: "16px 20px",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#8b8b8b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background: "#fafafa",
                      }}>
                        Total
                      </th>
                      <th style={{
                        padding: "16px 20px",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#8b8b8b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background: "#fafafa",
                        width: "60px",
                      }}>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableData.map((d, idx) => (
                      <React.Fragment key={d.location}>
                        <tr
                          className="table-row-modern"
                          style={{
                            borderBottom: expandedPurok === d.location ? "none" : "1px solid #f5f5f5",
                            background: expandedPurok === d.location ? "#fafafa" : "#fff",
                          }}
                        >
                          <td
                            style={{ padding: "20px 20px", cursor: "pointer" }}
                            onClick={() => fetchCasesByPurok(d.location)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 3px)",
                                gridTemplateRows: "repeat(3, 3px)",
                                gap: "3px",
                              }}>
                                {[...Array(6)].map((_, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: 3,
                                      height: 3,
                                      borderRadius: "50%",
                                      background: "#d1d5db",
                                    }}
                                  />
                                ))}
                              </div>
                              <div style={{
                                width: 6,
                                height: 40,
                                borderRadius: 3,
                                background: ABUSE_COLORS[d.mostCommon] || BRAND.violet,
                              }} />
                              <div>
                                <div style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  color: "#1a1a1a",
                                }}>
                                  {d.location}
                                </div>
                              </div>
                              {expandedPurok === d.location ? (
                                <DownOutlined style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }} />
                              ) : (
                                <RightOutlined style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }} />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "20px 20px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontWeight: 500,
                              fontSize: 13,
                              color: ABUSE_COLORS[d.mostCommon] || BRAND.violet,
                              background: `${ABUSE_COLORS[d.mostCommon] || BRAND.violet}15`,
                            }}>
                              {d.mostCommon}
                            </span>
                          </td>
                          <td style={{ padding: "20px 20px", textAlign: "center" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 32,
                              height: 32,
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#fff",
                              background: BRAND.violet,
                              padding: "0 10px",
                            }}>
                              {d.count}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Cases */}
                        {expandedPurok === d.location && purokCases[d.location] && (
                          <tr>
                            <td colSpan={3} style={{ padding: 0, background: "#fafafa" }}>
                              <div style={{ padding: "0 20px 20px 20px" }}>
                                {/* AI Insights Section for Purok */}
                                <div style={{
                                  marginBottom: 16,
                                  padding: "16px",
                                  background: "#fff",
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb"
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <BulbOutlined style={{ fontSize: 16, color: BRAND.violet }} />
                                      <Text strong style={{ fontSize: 14, color: "#1a1a1a" }}>
                                        AI Insights for {d.location}
                                      </Text>
                                    </div>
                                    <Button
                                      type="primary"
                                      size="small"
                                      loading={descLoading && selectedPurok === d.location}
                                      onClick={() => fetchDescriptions(selectedIncident, d.location)}
                                      icon={<BulbOutlined />}
                                      style={{
                                        background: BRAND.violet,
                                        borderColor: BRAND.violet,
                                        border: "none",
                                        borderRadius: 6,
                                      }}
                                    >
                                      Generate Insights
                                    </Button>
                                  </div>

                                  {descLoading && selectedPurok === d.location ? (
                                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                                      <Spin size="small" tip="Analyzing cases..." />
                                    </div>
                                  ) : descriptions.length > 0 && selectedPurok === d.location ? (
                                    <div style={{
                                      background: "#f8f9fa",
                                      borderRadius: 6,
                                      padding: 12,
                                    }}>
                                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {descriptions.map((desc, idx) => (
                                          <li key={idx} style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.6 }}>
                                            <Text>{desc}</Text>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div style={{
                                      background: "#f8f9fa",
                                      borderRadius: 6,
                                      padding: 12,
                                      textAlign: "center",
                                    }}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        Click "Generate Insights" to get AI-powered analysis for all cases in {d.location}
                                      </Text>
                                    </div>
                                  )}
                                </div>

                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                                      <th style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        fontSize: 11,
                                        color: "#8b8b8b",
                                        textTransform: "uppercase",
                                      }}>
                                        Victim
                                      </th>
                                      <th style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        fontSize: 11,
                                        color: "#8b8b8b",
                                        textTransform: "uppercase",
                                      }}>
                                        Incident
                                      </th>
                                      <th style={{
                                        padding: "12px 16px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        fontSize: 11,
                                        color: "#8b8b8b",
                                        textTransform: "uppercase",
                                      }}>
                                        Date
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {purokCases[d.location].map((caseItem, caseIdx) => (
                                      <tr
                                        key={caseIdx}
                                        onClick={() => handleCaseClick(caseItem)}
                                        className="case-row"
                                        style={{
                                          borderBottom: "1px solid #f0f0f0",
                                          background: selectedCase?.caseID === caseItem.caseID ? "#f0f0f0" : "#fff",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <td style={{ padding: "16px" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{
                                              width: 36,
                                              height: 36,
                                              borderRadius: "50%",
                                              background: `linear-gradient(135deg, ${BRAND.violet}, ${BRAND.pink})`,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              color: "#fff",
                                              fontWeight: 600,
                                              fontSize: 14,
                                            }}>
                                              {caseItem.victimName?.charAt(0) || "V"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                                <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>
                                                  {caseItem.victimName}
                                                </span>
                                                <span style={{
                                                  display: "inline-block",
                                                  padding: "2px 6px",
                                                  borderRadius: 3,
                                                  fontSize: 10,
                                                  fontWeight: 600,
                                                  color: caseItem.victimType === "woman" ? "#e91e63" : caseItem.victimType === "child" ? "#7A5AF8" : "#6b7280",
                                                  background: caseItem.victimType === "woman" ? "rgba(233, 30, 99, 0.1)" : caseItem.victimType === "child" ? "rgba(122, 90, 248, 0.1)" : "rgba(107, 114, 128, 0.1)",
                                                }}>
                                                  {caseItem.victimType === "woman" ? "Woman" : caseItem.victimType === "child" ? "Child" : "Anonymous"}
                                                </span>
                                              </div>
                                              <div style={{ fontSize: 11, color: "#8b8b8b" }}>
                                                Case #{caseItem.caseID}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td style={{ padding: "16px" }}>
                                          <span style={{
                                            display: "inline-block",
                                            padding: "4px 10px",
                                            borderRadius: 5,
                                            fontWeight: 500,
                                            fontSize: 12,
                                            color: BRAND.violet,
                                            background: "rgba(122, 90, 248, 0.1)",
                                          }}>
                                            {caseItem.incidentType}
                                          </span>
                                        </td>
                                        <td style={{ padding: "16px", fontSize: 13, color: "#4a4a4a" }}>
                                          {caseItem.dateReported}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Col>

          {/* Detail Panel */}
          {detailPanelVisible && selectedCase && (
            <Col xs={24} lg={10} style={{ transition: "all 0.3s ease" }}>
              <Card
                style={{
                  ...glassCard,
                  position: "sticky",
                  top: 88,
                  maxHeight: "calc(100vh - 120px)",
                  overflowY: "auto",
                }}
                title={
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Text strong>Case Details</Text>
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setDetailPanelVisible(false)}
                      size="small"
                    />
                  </Space>
                }
                bordered={false}
              >
                {/* Case Header */}
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${BRAND.violet}, ${BRAND.pink})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 24,
                    }}>
                      {selectedCase.victimName?.charAt(0) || "V"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                        {selectedCase.victimName}
                      </Title>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: selectedCase.victimType === "woman" ? "#e91e63" : "#7A5AF8",
                          background: selectedCase.victimType === "woman" ? "rgba(233, 30, 99, 0.1)" : "rgba(122, 90, 248, 0.1)",
                        }}>
                          {selectedCase.victimType === "woman" ? "Woman" : selectedCase.victimType === "child" ? "Child" : "Anonymous"}
                        </span>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Case ID: {selectedCase.caseID}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Case Details */}
                <div style={{ marginBottom: 24 }}>
                  <Title level={5} style={{ fontSize: 14, marginBottom: 16 }}>
                    Case Information
                  </Title>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        Incident Type
                      </Text>
                      <span style={{
                        display: "inline-block",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 13,
                        color: BRAND.violet,
                        background: "rgba(122, 90, 248, 0.1)",
                      }}>
                        {selectedCase.incidentType}
                      </span>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        Location
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: 500 }}>
                        <EnvironmentOutlined style={{ marginRight: 6, color: BRAND.violet }} />
                        {selectedCase.location}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        Date Reported
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: 500 }}>
                        {selectedCase.dateReported}
                      </Text>
                    </div>
                    {selectedCase.description && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                          Description
                        </Text>
                        <Text style={{ fontSize: 13, lineHeight: 1.6 }}>
                          {selectedCase.description}
                        </Text>
                      </div>
                    )}
                    {selectedCase.remarks && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                          Remarks
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                          {selectedCase.remarks}
                        </Text>
                      </div>
                    )}
                  </Space>
                </div>

                {/* View Full Case */}
                <div style={{ marginTop: 24 }}>
                  <Button
                    block
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/admin/cases/${selectedCase.caseID}`)}
                    style={{
                      borderColor: BRAND.violet,
                      color: BRAND.violet,
                      fontWeight: 500,
                      height: 40,
                    }}
                  >
                    View Full Case Details
                  </Button>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </Content>

      {/* Cases Modal */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined style={{ color: BRAND.violet }} />
            <Text strong style={{ color: BRAND.violet }}>
              Cases in {selectedPurok} - {selectedIncident}
            </Text>
          </Space>
        }
        open={casesModalVisible}
        onCancel={() => setCasesModalVisible(false)}
        footer={null}
        width={isXs ? "95%" : "80%"}
        centered
        styles={{
          body: { maxHeight: "60vh", overflowY: "auto" }
        }}
      >
        <Table
          dataSource={casesData.map((item, idx) => ({ key: idx, ...item }))}
          columns={[
            {
              title: "Date Reported",
              dataIndex: "dateReported",
              key: "dateReported",
              render: (text) => <Text>{text}</Text>
            },
            {
              title: "Victim Name",
              dataIndex: "victimName",
              key: "victimName",
              render: (text, record) => (
                <a
                  href={`/admin/cases/${record.caseID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: BRAND.violet, fontWeight: 600 }}
                >
                  {text}
                </a>
              )
            },
            {
              title: "Incident Type",
              dataIndex: "incidentType",
              key: "incidentType",
              render: text => (
                <span
                  style={{
                    color: ABUSE_COLORS[text] || "#000",
                    fontWeight: 600,
                    padding: "4px 8px",
                    background: `${ABUSE_COLORS[text] || "#000"}15`,
                    borderRadius: 6
                  }}
                >
                  {text}
                </span>
              )
            },
            {
              title: "Location",
              dataIndex: "location",
              key: "location",
              render: (text) => <Text>{text}</Text>
            },
            {
              title: "Remarks",
              dataIndex: "remarks",
              key: "remarks",
              render: (text) => <Text type="secondary">{text || "—"}</Text>
            }
          ]}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          size={isXs ? "small" : "middle"}
          scroll={{ x: "max-content" }}
        />

        <div style={{ marginTop: 24 }}>
          <Title level={5} style={{ color: BRAND.violet }}>
            Description Insights
          </Title>

          {lastUpdated && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last Updated: {lastUpdated.toLocaleString()}
            </Text>
          )}
          {descLoading ? (
            <Spin tip="Analyzing descriptions..." />
          ) : descriptions.length > 0 ? (
            <ul style={{ paddingLeft: 20 }}>
              {descriptions.map((d, idx) => (
                <li key={idx} style={{ marginBottom: 6 }}>
                  <Text>{d}</Text>
                </li>
              ))}
            </ul>
          ) : (
            <Text type="secondary">No descriptions found.</Text>
          )}
        </div>
        <Button
          type="primary"
          style={{ marginTop: 16 }}
          loading={descLoading}
          onClick={() => fetchDescriptions(selectedIncident, selectedPurok)}
        >
          Generate AI Insights
        </Button>

      </Modal>

      {/* Styles */}
      <style>{`
        /* Custom scrollbar styling */
        .ant-layout-content::-webkit-scrollbar,
        .ant-table-body::-webkit-scrollbar,
        .ant-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .ant-layout-content::-webkit-scrollbar-track,
        .ant-table-body::-webkit-scrollbar-track,
        .ant-modal-body::-webkit-scrollbar-track {
          background: #f1eeff;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb,
        .ant-table-body::-webkit-scrollbar-thumb,
        .ant-modal-body::-webkit-scrollbar-thumb {
          background: #a78bfa;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb:hover,
        .ant-table-body::-webkit-scrollbar-thumb:hover,
        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
        /* Firefox */
        .ant-layout-content,
        .ant-table-body,
        .ant-modal-body {
          scrollbar-width: thin;
          scrollbar-color: #a78bfa #f1eeff;
        }

        /* Remove button outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        button:focus,
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }

        .ant-table-thead > tr > th {
          background: #fff !important;
          font-weight: 700;
          color: ${BRAND.violet};
        }
        .ant-table .ant-table-tbody > tr:hover > td {
          background: ${BRAND.rowHover} !important;
        }
        .clickable-row {
          cursor: default;
        }
        .ant-statistic-title {
          font-size: 14px;
          margin-bottom: 8px;
        }

        /* Modern Table Styles */
        .modern-table tbody tr {
          transition: all 0.2s ease;
        }

        .table-row-modern:hover {
          background: #f8f8f8 !important;
        }

        .case-row:hover {
          background: #f5f5f5 !important;
        }

        .preview-btn:hover {
          color: ${BRAND.pink} !important;
        }

        @media (max-width: 768px) {
          .modern-table th,
          .modern-table td {
            padding: 12px 10px !important;
            font-size: 12px !important;
          }

          .modern-table th:first-child,
          .modern-table td:first-child {
            padding-left: 12px !important;
          }

          .preview-btn span:last-child {
            display: none;
          }
        }

        /* Smooth scrollbar for detail panel */
        .ant-card-body::-webkit-scrollbar {
          width: 6px;
        }

        .ant-card-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .ant-card-body::-webkit-scrollbar-thumb {
          background: ${BRAND.violet}40;
          border-radius: 10px;
        }

        .ant-card-body::-webkit-scrollbar-thumb:hover {
          background: ${BRAND.violet}60;
        }

        /* Style dropdown menus with purple tint */
        .ant-select-dropdown {
          background: rgba(250, 249, 255, 0.98) !important;
        }

        .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
          background-color: rgba(122, 90, 248, 0.1) !important;
        }

        .ant-select-item-option:hover {
          background-color: rgba(122, 90, 248, 0.08) !important;
        }

        .ant-select-item-option-active {
          background-color: rgba(122, 90, 248, 0.08) !important;
        }
      `}</style>

      {/* Export Modal with Filters */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: BRAND.violet }} />
            <Text strong>Export Analytics to PDF</Text>
          </Space>
        }
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<FilePdfOutlined />}
            loading={exportLoading}
            onClick={handleExportPDF}
            style={{
              background: `linear-gradient(135deg, ${BRAND.violet}, ${BRAND.pink})`,
              border: "none",
            }}
          >
            Generate PDF
          </Button>,
        ]}
        width={isXs ? "95%" : 580}
        centered
        bodyStyle={{
          maxHeight: "calc(100vh - 250px)",
          overflowY: "auto",
          padding: "16px 24px"
        }}
      >
        <div style={{ padding: 0 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text strong style={{ display: "block", marginBottom: 4, color: BRAND.violet }}>
                <FilterOutlined style={{ marginRight: 8 }} />
                Filter Options
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Customize your report by selecting filters below
              </Text>
            </div>

            <div>
              <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                Select Purok
              </Text>
              <Select
                value={filterPurok}
                onChange={setFilterPurok}
                style={{ width: "100%" }}
                placeholder="Select Purok"
              >
                <Option value="all">All Puroks</Option>
                {mostCommonData.map(d => (
                  <Option key={d.location} value={d.location}>
                    {d.location}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                Select Abuse Type
              </Text>
              <Select
                value={filterAbuseType}
                onChange={setFilterAbuseType}
                style={{ width: "100%" }}
                placeholder="Select Abuse Type"
              >
                <Option value="all">All Types</Option>
                {Object.keys(ABUSE_COLORS).map(type => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                Select Victim Type
              </Text>
              <Select
                value={filterVictimType}
                onChange={setFilterVictimType}
                style={{ width: "100%" }}
                placeholder="Select Victim Type"
              >
                <Option value="all">All Victims</Option>
                <Option value="woman">Women</Option>
                <Option value="child">Children</Option>
              </Select>
            </div>

            <div>
              <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                Date Range
              </Text>
              <RangePicker
                value={filterDateRange}
                onChange={setFilterDateRange}
                style={{ width: "100%" }}
                placeholder={["Start Date", "End Date"]}
              />
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Leave empty to include all dates
              </Text>
            </div>

            {expandedPurok && descriptions.length > 0 ? (
              <Alert
                message="AI Insights Included"
                description={`Report includes AI insights for ${selectedPurok}`}
                type="success"
                showIcon
                icon={<BulbOutlined />}
                style={{ borderColor: "#52c41a", background: "#f6ffed", marginTop: 4 }}
              />
            ) : (
              <Alert
                message="AI Insights Not Generated"
                description="To include AI insights in the report, expand a Purok in the table and click 'Generate Insights' button before exporting"
                type="warning"
                showIcon
                icon={<BulbOutlined />}
                style={{ borderColor: "#faad14", background: "#fffbe6", marginTop: 4 }}
              />
            )}

            <div style={{
              padding: 10,
              background: "#f6f3ff",
              borderRadius: 6,
              border: `1px dashed ${BRAND.violet}`,
              marginTop: 4
            }}>
              <Text strong style={{ color: BRAND.violet, display: "block", marginBottom: 4, fontSize: 13 }}>
                📄 Report Includes:
              </Text>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.6 }}>
                <li>Summary statistics</li>
                <li>Overall abuse distribution table</li>
                <li>Cases by Purok table</li>
                <li>AI Insights (if generated)</li>
                <li>Applied filter details</li>
              </ul>
            </div>
          </Space>
        </div>
      </Modal>
    </Layout>
  );
};

export default Analytics;
