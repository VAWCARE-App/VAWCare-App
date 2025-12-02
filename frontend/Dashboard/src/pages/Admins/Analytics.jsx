import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Spin, Alert, Modal, Button, Layout, Typography, Space, Grid, Statistic } from "antd";
import axios from "axios";
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
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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

  const [casesModalVisible, setCasesModalVisible] = useState(false);
  const [casesData, setCasesData] = useState([]);
  const [selectedPurok, setSelectedPurok] = useState("");
  const [selectedIncident, setSelectedIncident] = useState("");

  const [descriptions, setDescriptions] = useState([]);
  const [descLoading, setDescLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);


  const internalKey = import.meta.env.VITE_INTERNAL_API_KEY;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overallRes, perLocRes, mostCommonRes] = await Promise.all([
          axios.get(`${API_BASE}/api/analytics/abuse-distribution`, {
            headers: { "x-internal-key": internalKey }
          }),
          axios.get(`${API_BASE}/api/analytics/abuse-per-location`, {
            headers: { "x-internal-key": internalKey }
          }),
          axios.get(`${API_BASE}/api/analytics/most-common-per-location`, {
            headers: { "x-internal-key": internalKey }
          })
        ]);
        setOverallData((overallRes.data.data || []).map(d => ({ name: d._id, value: d.count })));
        setPerLocationData(formatPerLocation(perLocRes.data.data || []));
        setMostCommonData(mostCommonRes.data.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load analytics data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const fetchCasesByPurok = async (purok) => {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/cases-by-purok`, {
        headers: { "x-internal-key": internalKey },
        params: { purok }
      });

      setCasesData(res.data.data || []);
      setSelectedPurok(res.data.purok || purok);
      setSelectedIncident(res.data.mostCommonType || "N/A");
      setCasesModalVisible(true);

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
      </Header>

      <Content style={{ padding: isXs ? 12 : 24, paddingTop: 16 }}>
        {/* KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">Total Cases</Text>}
                value={overallData.reduce((sum, d) => sum + d.value, 0)}
                prefix={<FundOutlined style={{ color: BRAND.violet }} />}
                valueStyle={{ color: BRAND.violet, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">Total Puroks</Text>}
                value={perLocationData.length}
                prefix={<EnvironmentOutlined style={{ color: "#00C49F" }} />}
                valueStyle={{ color: "#00C49F", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...glassCard, textAlign: "center" }} hoverable>
              <Statistic
                title={<Text type="secondary">Most Common Abuse</Text>}
                value={mostCommonData[0]?.mostCommon || "N/A"}
                prefix={<FireOutlined style={{ color: "#FF4C4C" }} />}
                valueStyle={{ color: "#FF4C4C", fontWeight: 700, fontSize: isXs ? 16 : 24 }}
              />
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
                    data={overallData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isXs ? 80 : 100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {overallData.map(entry => (
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
                <BarChart data={perLocationData}>
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
                  {Object.keys(perLocationData[0] || {})
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

        {/* Table */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card
              style={glassCard}
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: BRAND.violet }} />
                  <Text strong>Most Common Abuse Per Location</Text>
                </Space>
              }
              bordered={false}
            >
              <Row gutter={[16, 16]}>
                {mostCommonData.map(d => (
                  <Col xs={24} sm={12} md={8} lg={6} key={d.location}>
                    <Card
                      hoverable
                      onClick={() => fetchCasesByPurok(d.location)}
                      style={{
                        textAlign: "center",
                        borderLeft: `6px solid ${ABUSE_COLORS[d.mostCommon]}`,
                        cursor: "pointer"
                      }}
                    >
                      <Text strong style={{ fontSize: 16 }}>{d.location}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text>{d.mostCommon}</Text>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                        {d.count}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
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
      `}</style>
    </Layout>
  );
};

export default Analytics;
