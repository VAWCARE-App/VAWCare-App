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
    Grid,
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
    const loggedRef = React.useRef(false);
    const screens = Grid.useBreakpoint();
    const [locale, setLocale] = useState((typeof window !== 'undefined' && (window.APP_LOCALE || navigator.language)) || 'en');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reports, setReports] = useState([]);
    const [dssLoading, setDssLoading] = useState(true);
    const [dssInsights, setDssInsights] = useState(null);
    const [range, setRange] = useState('current'); // 'current' | 'previous' | 'last2' | 'all'
    // explicit toggle for Tagalog translations (user-controlled)
    const [showTagalog, setShowTagalog] = useState(false);

    const BRAND = {
        violet: "#7A5AF8",
        pink: "#FF6EA9",
        green: "#5AD8A6",
        soft: "rgba(122,90,248,0.18)",
        chip: "#fff0f7",
    };

    function formatRangeLabel(range) {
        const now = new Date();
        const monthName = (d) => d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
        if (range === 'current') return monthName(new Date(now.getFullYear(), now.getMonth(), 1));
        if (range === 'previous') return monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        if (range === 'last2') return `${monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1))} – ${monthName(new Date(now.getFullYear(), now.getMonth(), 1))}`;
        return 'All time';
    }

    function getRangeBounds(range) {
        const now = new Date();
        if (range === 'current') return { since: new Date(now.getFullYear(), now.getMonth(), 1), until: null };
        if (range === 'previous') return { since: new Date(now.getFullYear(), now.getMonth() - 1, 1), until: new Date(now.getFullYear(), now.getMonth(), 1) };
        if (range === 'last2') return { since: new Date(now.getFullYear(), now.getMonth() - 1, 1), until: null };
        return { since: new Date(0), until: null };
    }

    // filter local reports by createdAt according to selected range (createdAt is authoritative)
    const filteredReports = useMemo(() => {
        const bounds = getRangeBounds(range);
        return reports.filter(r => {
            const dt = new Date(r.createdAt);
            if (bounds.since && dt < bounds.since) return false;
            if (bounds.until && dt >= bounds.until) return false;
            return true;
        });
    }, [reports, range]);

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
        loadDssInsights();
    }, []);

    // Log page view when this insight tab is opened (with deduplication)
    useEffect(() => {
        try {
            const path = '/admin/insights/reports';
            const lastPath = sessionStorage.getItem('__lastPageviewPath') || '';
            const lastAt = Number(sessionStorage.getItem('__lastPageviewAt') || '0');
            const now = Date.now();
            
            if (lastPath !== path || (now - lastAt) > 3000) {
                const actorId = sessionStorage.getItem('actorId');
                const actorType = sessionStorage.getItem('actorType');
                const actorBusinessId = sessionStorage.getItem('actorBusinessId');
                api.post('/api/logs/pageview', { 
                    path, 
                    actorId, 
                    actorType, 
                    actorBusinessId 
                }).catch(() => {});
                try {
                    sessionStorage.setItem('__lastPageviewPath', path);
                    sessionStorage.setItem('__lastPageviewAt', String(now));
                } catch (e) {}
            }
        } catch (e) {
            console.warn('Failed to log insights page view', e && e.message);
        }
    }, []);

    useEffect(() => {
        // reload dss insights when range changes
        loadDssInsights();
    }, [range]);

    const loadDssInsights = async (withSpinner = true) => {
        try {
            if (withSpinner) setDssLoading(true);
            const res = await api.post('/api/dss/suggest/reports', { range });
            setDssInsights(res.data?.data || null);
        } catch (err) {
            console.error('Failed to load DSS insights for reports', err);
            setDssInsights(null);
        } finally {
            if (withSpinner) setDssLoading(false);
        }
    };

    // Derived stats (filtered by selected range)
    const totalReports = filteredReports.length;
    const pendingReports = filteredReports.filter((r) => r.status === "Pending").length;
    const openReports = filteredReports.filter((r) => r.status === "Open").length;
    const underInvestigationReports = filteredReports.filter((r) => r.status === "Under Investigation").length;
    const closedReports = filteredReports.filter((r) => r.status === "Closed").length;

    const COLORS = ["#7A5AF8", "#FF6EA9", "#5AD8A6", "#FFB347", "#69C0FF"];

    // Incident Type Distribution
    const incidentDistribution = useMemo(() => {
        const counts = {};
        filteredReports.forEach((r) => {
            counts[r.incidentType] = (counts[r.incidentType] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredReports]);

    // Victim Type Distribution
    const victimDistribution = useMemo(() => {
        let anonymous = 0,
            regular = 0;
        filteredReports.forEach((r) => {
            if (r.victimID?.isAnonymous) anonymous++;
            else regular++;
        });
        return [
            { name: "Anonymous", value: anonymous },
            { name: "Regular", value: regular },
        ];
    }, [filteredReports]);

    // Reports over time
    const reportTrend = useMemo(() => {
        const counts = {};
        filteredReports.forEach((r) => {
            const date = new Date(r.createdAt).toISOString().slice(0, 10);
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    }, [filteredReports]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadReports(false);
        await loadDssInsights(false);
        message.success("Report insights refreshed");
    };

    const KpiCard = ({ title, value, icon, color }) => (
        <Card
            variant="outlined"
            style={{
                borderRadius: 16,
                borderColor: BRAND.soft,
                height: "100%",
                boxShadow: "0 10px 26px rgba(122,90,248,0.06)",
            }}
            styles={{ body: {
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
            } }}
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
        <Layout style={{ background: "#fff", minHeight: "100vh", padding: 16 }}>
            <Content>
                <Row gutter={[16, 16]}>
                    <Col
                        xs={24}
                        style={{
                            display: "flex",
                            justifyContent: screens.md ? "flex-end" : "center",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <Space wrap size={screens.xs ? 4 : 8}>
                            {screens.md && (
                                <div style={{ textAlign: "right", marginRight: 8 }}>
                                    <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                                        Based on
                                    </Text>
                                    <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                                        {formatRangeLabel(range)}
                                    </Text>
                                </div>
                            )}
                            <Button.Group size={screens.xs ? "small" : "middle"}>
                                <Button
                                    type={range === "current" ? "primary" : "default"}
                                    onClick={() => {
                                        setRange("current");
                                        setDssLoading(true);
                                    }}
                                >
                                    Current
                                </Button>
                                <Button
                                    type={range === "previous" ? "primary" : "default"}
                                    onClick={() => {
                                        setRange("previous");
                                        setDssLoading(true);
                                    }}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type={range === "all" ? "primary" : "default"}
                                    onClick={() => {
                                        setRange("all");
                                        setDssLoading(true);
                                    }}
                                >
                                    All
                                </Button>
                            </Button.Group>
                            <Button
                                size={screens.xs ? "small" : "middle"}
                                icon={<ReloadOutlined spin={refreshing} />}
                                onClick={handleRefresh}
                            >
                                {screens.md && "Refresh"}
                            </Button>
                        </Space>
                    </Col>

                    {/* KPIs - compressed one line layout */}
                    <Col xs={24} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: screens.xs ? '0 0 100%' : '0 0 calc(20% - 9.6px)', minWidth: 0 }}>
                            <KpiCard
                                title="Total Reports"
                                value={totalReports}
                                icon={<FileTextOutlined style={{ color: BRAND.violet }} />}
                                color={BRAND.violet}
                            />
                        </div>
                        <div style={{ flex: screens.xs ? '0 0 100%' : '0 0 calc(20% - 9.6px)', minWidth: 0 }}>
                            <KpiCard
                                title="Pending Reports"
                                value={pendingReports}
                                icon={<ClockCircleOutlined style={{ color: "#FFB347" }} />}
                                color="#FFB347"
                            />
                        </div>
                        <div style={{ flex: screens.xs ? '0 0 100%' : '0 0 calc(20% - 9.6px)', minWidth: 0 }}>
                            <KpiCard
                                title="Open Reports"
                                value={openReports}
                                icon={<AlertOutlined style={{ color: BRAND.pink }} />}
                                color={BRAND.pink}
                            />
                        </div>
                        <div style={{ flex: screens.xs ? '0 0 100%' : '0 0 calc(20% - 9.6px)', minWidth: 0 }}>
                            <KpiCard
                                title="Under Investigation"
                                value={underInvestigationReports}
                                icon={<AlertOutlined style={{ color: "#1890ff" }} />}
                                color="#1890ff"
                            />
                        </div>
                        <div style={{ flex: screens.xs ? '0 0 100%' : '0 0 calc(20% - 9.6px)', minWidth: 0 }}>
                            <KpiCard
                                title="Closed Reports"
                                value={closedReports}
                                icon={<CheckCircleOutlined style={{ color: BRAND.green }} />}
                                color={BRAND.green}
                            />
                        </div>
                    </Col>

                    {/* Pie chart: Incident Type Distribution */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Incident Type Distribution"
                            variant="outlined"
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 200 : 260}>
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
                            variant="outlined"
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 200 : 260}>
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
                            variant="outlined"
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : reportTrend.length === 0 ? (
                                <Empty description="No report data" />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 220 : 280}>
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
                            variant="outlined"
                            style={{
                                borderRadius: 16,
                                borderColor: BRAND.soft,
                                overflow: "hidden",
                            }}
                            styles={{ body: { padding: 8 } }}
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
                                    dataSource={[...filteredReports]
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
                            title="Reports Recommendations"
                            bordered
                            extra={
                                <Space>
                                    <Button
                                        type={showTagalog ? 'primary' : 'default'}
                                        onClick={() => setShowTagalog(s => !s)}
                                        size="small"
                                    >
                                        {showTagalog ? 'English' : 'Tagalog'}
                                    </Button>
                                </Space>
                            }
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : reports.length === 0 ? (
                                <Empty description="No data to analyze" />
                            ) : (
                                <div>
                                    {dssLoading ? (
                                        <Skeleton active />
                                    ) : dssInsights && dssInsights.insights && dssInsights.insights.length === 0 ? (
                                        <Empty description="No insights available" />
                                    ) : (
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            {(dssInsights?.insights || []).map((i, idx) => (
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
                                                        borderLeft: `4px solid ${
                                                            i.urgent
                                                                ? "#d32029"
                                                                : i.type === "error"
                                                                ? "#ff4d4f"
                                                                : i.type === "warning"
                                                                ? "#faad14"
                                                                : i.type === "info"
                                                                ? "#1677ff"
                                                                : "#52c41a"
                                                        }`,
                                                        boxShadow: i.urgent
                                                            ? "0 6px 18px rgba(211,32,41,0.08)"
                                                            : undefined,
                                                    }}
                                                >
                                                    <Typography.Text strong>
                                                        {i.label}
                                                        {i.value !== undefined
                                                            ? ` — ${
                                                                  typeof i.value === "number"
                                                                      ? i.value.toFixed
                                                                          ? i.value.toFixed(1)
                                                                          : i.value
                                                                      : i.value
                                                              }`
                                                            : ""}
                                                    </Typography.Text>
                                                    {i.urgent && (
                                                        <Tag style={{ marginLeft: 8 }} color="error">
                                                            URGENT
                                                        </Tag>
                                                    )}
                                                    <br />
                                                    <Typography.Text>
                                                        {(showTagalog && i.message_tl)
                                                            ? i.message_tl
                                                            : i.message || ""}
                                                    </Typography.Text>
                                                    {((showTagalog &&
                                                        i.recommendations_tl &&
                                                        i.recommendations_tl.length)
                                                        ? i.recommendations_tl
                                                        : i.recommendations) &&
                                                        (((showTagalog &&
                                                            i.recommendations_tl &&
                                                            i.recommendations_tl.length)
                                                            ? i.recommendations_tl
                                                            : i.recommendations
                                                        ).length > 0) && (
                                                            <ul
                                                                style={{
                                                                    marginTop: 8,
                                                                    marginBottom: 0,
                                                                    paddingLeft: 18,
                                                                }}
                                                            >
                                                                {((showTagalog &&
                                                                    i.recommendations_tl &&
                                                                    i.recommendations_tl.length)
                                                                    ? i.recommendations_tl
                                                                    : i.recommendations
                                                                ).map((r, ri) => (
                                                                    <li key={ri}>
                                                                        <Typography.Text>{r}</Typography.Text>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                </Card>
                                            ))}
                                        </Space>
                                    )}
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Content>
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
            `}</style>
        </Layout>
    );
}
