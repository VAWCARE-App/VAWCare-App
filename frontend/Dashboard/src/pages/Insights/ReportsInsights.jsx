import React, { useEffect, useState, useMemo } from "react";
import {
    App as AntApp,
    Layout,
    Card,
    Row,
    Col,
    Typography,
    Statistic,
    Skeleton,
    Space,
    List,
    Avatar,
    Tag,
    Empty,
    Button,
} from "antd";
import {
    FileTextOutlined,
    AlertOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
} from "recharts";
import { api } from "../../lib/api";

const { Content } = Layout;
const { Text } = Typography;

export default function ReportsInsights() {
    const { message } = AntApp.useApp();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reports, setReports] = useState([]);

    const BRAND = {
        violet: "#7A5AF8",
        pink: "#FF6EA9",
        green: "#5AD8A6",
        soft: "rgba(122,90,248,0.18)",
        chip: "#fff0f7",
    };

    const loadReports = async (withSpinner = true) => {
        try {
            if (withSpinner) setLoading(true);
            const res = await api.get("/api/reports");
            setReports(res.data?.data || res.data || []);
        } catch (err) {
            message.error("Failed to load report data");
            setReports([]);
        } finally {
            if (withSpinner) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    // Derived stats
    const totalReports = reports.length;
    const openReports = reports.filter((r) => r.status === "Open").length;
    const pendingReports = reports.filter((r) => r.status === "Pending").length;
    const closedReports = reports.filter((r) => r.status === "Closed").length;

    const COLORS = ["#7A5AF8", "#FF6EA9", "#5AD8A6", "#FFB347", "#69C0FF"];

    // Incident Type Distribution
    const incidentDistribution = useMemo(() => {
        const counts = {};
        reports.forEach((r) => {
            counts[r.incidentType] = (counts[r.incidentType] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [reports]);

    // Victim Type Distribution
    const victimDistribution = useMemo(() => {
        let anonymous = 0,
            regular = 0;
        reports.forEach((r) => {
            if (r.victimID?.isAnonymous) anonymous++;
            else regular++;
        });
        return [
            { name: "Anonymous", value: anonymous },
            { name: "Regular", value: regular },
        ];
    }, [reports]);

    // Reports over time
    const reportTrend = useMemo(() => {
        const counts = {};
        reports.forEach((r) => {
            const date = new Date(r.createdAt).toISOString().slice(0, 10);
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    }, [reports]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadReports(false);
        message.success("Report insights refreshed");
    };

    const KpiCard = ({ title, value, icon, color }) => (
        <Card
            bordered
            style={{
                borderRadius: 16,
                borderColor: BRAND.soft,
                height: "100%",
                boxShadow: "0 10px 26px rgba(122,90,248,0.06)",
            }}
            bodyStyle={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <Space align="center">
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: BRAND.chip,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${BRAND.soft}`,
                    }}
                >
                    {icon}
                </div>
                <Text type="secondary">{title}</Text>
            </Space>
            {loading ? (
                <Skeleton.Input active size="small" style={{ width: 100 }} />
            ) : (
                <Statistic value={value} valueStyle={{ color }} />
            )}
        </Card>
    );

    return (
        <Layout style={{ minHeight: "100vh", background: "#fff" }}>
            <Content>
                <Row gutter={[16, 16]}>
                    {/* KPIs */}
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Total Reports"
                            value={totalReports}
                            icon={<FileTextOutlined style={{ color: BRAND.violet }} />}
                            color={BRAND.violet}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Open Reports"
                            value={openReports}
                            icon={<AlertOutlined style={{ color: BRAND.pink }} />}
                            color={BRAND.pink}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Pending Reports"
                            value={pendingReports}
                            icon={<ClockCircleOutlined style={{ color: "#FFB347" }} />}
                            color="#FFB347"
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Closed Reports"
                            value={closedReports}
                            icon={<CheckCircleOutlined style={{ color: BRAND.green }} />}
                            color={BRAND.green}
                        />
                    </Col>

                    {/* Pie chart: Incident Type Distribution */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Incident Type Distribution"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={incidentDistribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            label
                                        >
                                            {incidentDistribution.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Bar chart: Victim Type Distribution */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Victim Type Distribution"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={victimDistribution}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill={BRAND.violet} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Line chart: Reports over time */}
                    <Col xs={24} md={16}>
                        <Card
                            title="Reports Submitted Over Time"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : reportTrend.length === 0 ? (
                                <Empty description="No report data" />
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={reportTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke={BRAND.violet}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Recent Reports */}
                    <Col xs={24} md={8}>
                        <Card
                            title="Recent Reports"
                            bordered
                            style={{
                                borderRadius: 16,
                                borderColor: BRAND.soft,
                                overflow: "hidden",
                            }}
                            bodyStyle={{ padding: 8 }}
                            extra={
                                <Button
                                    icon={<ReloadOutlined spin={refreshing} />}
                                    onClick={handleRefresh}
                                    type="text"
                                />
                            }
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <List
                                    style={{ padding: 0, margin: 0 }}
                                    dataSource={[...reports]
                                        .sort(
                                            (a, b) =>
                                                new Date(b.createdAt) - new Date(a.createdAt)
                                        )
                                        .slice(0, 5)}
                                    renderItem={(r) => (
                                        <List.Item style={{ padding: "8px 12px" }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        style={{
                                                            background: BRAND.violet,
                                                            width: 40,
                                                            height: 40,
                                                            fontSize: 20,
                                                        }}
                                                        icon={<UserOutlined />}
                                                    />
                                                }
                                                title={
                                                    <Text ellipsis style={{ maxWidth: 200 }}>
                                                        {r.reportID} — {r.incidentType}
                                                    </Text>
                                                }
                                                description={new Date(
                                                    r.createdAt
                                                ).toLocaleString()}
                                            />
                                            <Tag color={r.status === "Open" ? "magenta" : r.status === "Pending" ? "orange" : "green"}>
                                                {r.status}
                                            </Tag>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>

                    {/* DSS Insights Section */}
                    <Col xs={24}>
                        <Card
                            title="Alerts & Recommendations"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : reports.length === 0 ? (
                                <Empty description="No data to analyze" />
                            ) : (
                                <div>
                                    {(() => {
                                        const insights = [];

                                        // 🔹 Trend 1: Sudden increase in reports
                                        const trend = reportTrend.slice(-7);
                                        if (trend.length >= 2) {
                                            const last = trend[trend.length - 1].count;
                                            const prev = trend[trend.length - 2].count;
                                            if (last > prev * 1.5) {
                                                insights.push({
                                                    type: "warning",
                                                    msg: `There has been a ${Math.round(
                                                        ((last - prev) / prev) * 100
                                                    )}% increase in reports compared to the previous period.`,
                                                });
                                            }
                                        }

                                        // 🔹 Trend 2: Most common incident type
                                        const topType = incidentDistribution.sort((a, b) => b.value - a.value)[0];
                                        if (topType)
                                            insights.push({
                                                type: "info",
                                                msg: `The most reported incident type is "${topType.name}" (${topType.value} cases).`,
                                            });

                                        // 🔹 Trend 3: High-risk category (e.g. >50% unresolved)
                                        const unresolved = reports.filter(
                                            (r) => r.status === "Open" || r.status === "Pending"
                                        ).length;
                                        if (unresolved / reports.length > 0.5)
                                            insights.push({
                                                type: "error",
                                                msg: `Over 50% of reports remain unresolved. Consider reviewing investigation timelines.`,
                                            });

                                        // 🔹 Trend 4: Anonymous reporting rate
                                        const anonRate =
                                            (victimDistribution.find((v) => v.name === "Anonymous")?.value || 0) /
                                            (victimDistribution.reduce((a, b) => a + b.value, 0) || 1);
                                        if (anonRate > 0.6)
                                            insights.push({
                                                type: "warning",
                                                msg: `Anonymous reports are high (${Math.round(
                                                    anonRate * 100
                                                )}%). Consider outreach for trust-building.`,
                                            });

                                        // 🔹 Default insight if none matched
                                        if (insights.length === 0)
                                            insights.push({
                                                type: "success",
                                                msg: "No major alerts detected. Report activity is within normal range.",
                                            });

                                        return (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {insights.map((i, idx) => (
                                                    <Card
                                                        key={idx}
                                                        size="small"
                                                        style={{
                                                            background:
                                                                i.type === "error"
                                                                    ? "#fff2f0"
                                                                    : i.type === "warning"
                                                                        ? "#fffbe6"
                                                                        : i.type === "info"
                                                                            ? "#e6f4ff"
                                                                            : "#f6ffed",
                                                            borderLeft: `4px solid ${i.type === "error"
                                                                    ? "#ff4d4f"
                                                                    : i.type === "warning"
                                                                        ? "#faad14"
                                                                        : i.type === "info"
                                                                            ? "#1677ff"
                                                                            : "#52c41a"
                                                                }`,
                                                        }}
                                                    >
                                                        <Typography.Text>{i.msg}</Typography.Text>
                                                    </Card>
                                                ))}
                                            </Space>
                                        );
                                    })()}
                                </div>
                            )}
                        </Card>
                    </Col>

                </Row>
            </Content>
        </Layout>
    );
}
