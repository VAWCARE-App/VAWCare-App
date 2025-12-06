import React from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Typography,
  List,
  Space,
  Progress,
} from "antd";
import {
  BarChartOutlined,
  AlertOutlined,
  HeatMapOutlined,
  ProfileOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Test() {
  // Mock data
  const summaryCards = [
    { title: "Total Cases This Month", value: 42 },
    { title: "Most Prevalent Category", value: "Psychological" },
    { title: "Most Common Subtype", value: "Verbal Abuse (18)" },
    { title: "High-Risk Purok", value: "Purok 3" },
    { title: "Critical Cases", value: "7 cases" },
  ];

  const purokHotspots = [
    { purok: "Purok 3", subtype: "Verbal Abuse", cases: 10, risk: "High" },
    { purok: "Purok 1", subtype: "Slapping", cases: 6, risk: "Medium" },
    { purok: "Purok 5", subtype: "Molestation", cases: 3, risk: "High" },
    { purok: "Purok 2", subtype: "Financial Withholding", cases: 2, risk: "Moderate" },
  ];

  const severityData = [
    { level: "Critical", count: 4, color: "red" },
    { level: "High", count: 8, color: "orange" },
    { level: "Moderate", count: 20, color: "yellow" },
    { level: "Low", count: 10, color: "green" },
  ];

  const caseTableData = [
    {
      key: 1,
      date: "2025-01-04",
      category: "Psychological",
      subtype: "Verbal Abuse",
      victim: "Maria Santos",
      suspect: "Partner",
      purok: "Purok 3",
      severity: "Moderate",
      status: "Open",
    },
    {
      key: 2,
      date: "2025-01-06",
      category: "Sexual",
      subtype: "Molestation",
      victim: "J. Dela Cruz",
      suspect: "Neighbor",
      purok: "Purok 5",
      severity: "Critical",
      status: "Under Investigation",
    },
  ];

  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Category", dataIndex: "category" },
    { title: "Subtype", dataIndex: "subtype" },
    { title: "Victim", dataIndex: "victim" },
    { title: "Suspect", dataIndex: "suspect" },
    { title: "Purok", dataIndex: "purok" },
    {
      title: "Severity",
      dataIndex: "severity",
      render: (severity) => <Tag color="red">{severity}</Tag>,
    },
    { title: "Status", dataIndex: "status" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>VAWC DSS Dashboard (Mock)</Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        {summaryCards.map((item, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <Card>
              <Statistic title={item.title} value={item.value} />
            </Card>
          </Col>
        ))}
      </Row>

      <br />

      {/* Hotspot Section */}
      <Card title={<><HeatMapOutlined /> Purok Hotspot Monitoring</>}>
        <List
          dataSource={purokHotspots}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical">
                <Text strong>{item.purok}</Text>
                <Text>Top subtype: {item.subtype}</Text>
                <Text>Cases: {item.cases}</Text>
                <Tag color={item.risk === "High" ? "red" : item.risk === "Medium" ? "orange" : "green"}>
                  {item.risk} Risk
                </Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <br />

      {/* Severity Breakdown */}
      <Card title={<><AlertOutlined /> Case Severity Breakdown</>}>
        <Row gutter={[16, 16]}>
          {severityData.map((s, i) => (
            <Col xs={24} sm={12} md={6} key={i}>
              <Card>
                <Text strong>{s.level}</Text>
                <Progress percent={(s.count / 42) * 100} strokeColor={s.color} />
                <Text>{s.count} cases</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <br />

      {/* Table */}
      <Card title={<><ProfileOutlined /> Current VAWC Cases</>}>
        <Table columns={columns} dataSource={caseTableData} />
      </Card>
    </div>
  );
}
