import React, { useEffect, useState } from "react";
import { Row, Col, Card, Table, Spin, Alert, Modal, Button } from "antd";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from "recharts";

const ABUSE_COLORS = {
  "Physical Abuse": "#FF4C4C",
  "Emotional Abuse": "#FFA500",
  "Sexual Abuse": "#FFBB28",
  "Neglect": "#00C49F",
  "Others": "#0088FE"
};

const Test = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overallData, setOverallData] = useState([]);
  const [perLocationData, setPerLocationData] = useState([]);
  const [mostCommonData, setMostCommonData] = useState([]);

  const [casesModalVisible, setCasesModalVisible] = useState(false);
  const [casesData, setCasesData] = useState([]);
  const [selectedPurok, setSelectedPurok] = useState("");
  const [selectedIncident, setSelectedIncident] = useState("");

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
    } catch (err) {
      console.error(err);
      setError("Failed to fetch cases for this purok.");
    }
  };

  const tableColumns = [
    { title: "Location", dataIndex: "location", key: "location" },
    {
      title: "Most Common Abuse",
      dataIndex: "mostCommon",
      key: "mostCommon",
      render: (text, record) => (
        <Button type="link" onClick={() => fetchCasesByPurok(record.location)}>
          {text}
        </Button>
      )
    },
    { title: "Count", dataIndex: "count", key: "count" }
  ];

  if (loading) return <Spin size="large" style={{ margin: "50px auto", display: "block" }} />;
  if (error) return <Alert message={error} type="error" style={{ margin: "20px" }} />;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>📊 Total Cases: {overallData.reduce((sum, d) => sum + d.value, 0)}</Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>🏠 Total Puroks: {perLocationData.length}</Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>🔥 Most Common Abuse: {mostCommonData[0]?.mostCommon || "N/A"}</Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Overall Abuse Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overallData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {overallData.map(entry => (
                    <Cell key={entry.name} fill={ABUSE_COLORS[entry.name] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} cases`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Abuse Distribution Per Location">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perLocationData}>
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(perLocationData[0] || {})
                  .filter(k => k !== "location")
                  .map(key => (
                    <Bar key={key} dataKey={key} stackId="a" fill={ABUSE_COLORS[key] || "#8884d8"} />
                  ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Most Common Abuse Per Location">
            <Table
              dataSource={mostCommonData.map((item, idx) => ({ key: idx, ...item }))}
              columns={tableColumns}
              pagination={false}
              expandable={{
                expandedRowRender: record => (
                  <p>Possible reasons: {record.reasons.join(", ")}</p>
                ),
                rowExpandable: record => record.reasons && record.reasons.length > 0
              }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`Cases in ${selectedPurok} - ${selectedIncident}`}
        visible={casesModalVisible}
        onCancel={() => setCasesModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Table
          dataSource={casesData.map((item, idx) => ({ key: idx, ...item }))}
          columns={[
            {
              title: "Date Reported",
              dataIndex: "dateReported",
              key: "dateReported"
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
                >
                  {text}
                </a>
              )
            },
            {
              title: "Incident Type",
              dataIndex: "incidentType",
              key: "incidentType",
              render: text => <span style={{ color: ABUSE_COLORS[text] || "#000" }}>{text}</span>
            },
            { title: "Location", dataIndex: "location", key: "location" },
            { title: "Remarks", dataIndex: "remarks", key: "remarks" }
          ]}
          pagination={{ pageSize: 5 }}
        />

      </Modal>
    </div>
  );
};

export default Test;
