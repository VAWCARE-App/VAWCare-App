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

export default function CasesInsights() {
    const { message } = AntApp.useApp();
    // simple locale detection: 'tl' or 'fil' indicates Tagalog/Filipino
    const [locale, setLocale] = useState((typeof window !== 'undefined' && (window.APP_LOCALE || navigator.language)) || 'en');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cases, setCases] = useState([]);
    const [dssLoading, setDssLoading] = useState(true);
    const [dssInsights, setDssInsights] = useState(null);
    // explicit toggle for Tagalog translations (user-controlled)
    const [showTagalog, setShowTagalog] = useState(false);

    const BRAND = {
        violet: "#7A5AF8",
        pink: "#FF6EA9",
        green: "#5AD8A6",
        soft: "rgba(122,90,248,0.18)",
        chip: "#fff0f7",
    };

    const loadCases = async (withSpinner = true) => {
        try {
            if (withSpinner) setLoading(true);
            const res = await api.get("/api/cases");
            setCases(res.data?.data || res.data || []);
        } catch (err) {
            message.error("Failed to load case data");
            setCases([]);
        } finally {
            if (withSpinner) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCases();
        loadDssInsights();
    }, []);

    const loadDssInsights = async (withSpinner = true) => {
        try {
            if (withSpinner) setDssLoading(true);
            const res = await api.post('/api/dss/suggest/cases', { lookbackDays: 30 });
            setDssInsights(res.data?.data || null);
        } catch (err) {
            console.error('Failed to load DSS insights', err);
            setDssInsights(null);
        } finally {
            if (withSpinner) setDssLoading(false);
        }
    };

    // Derived stats
    const totalCases = cases.length;
    const openCases = cases.filter((c) => c.status === "Open").length;
    const underInvestigation = cases.filter((c) => c.status === "Under Investigation").length;
    const resolvedCases = cases.filter((c) => c.status === "Resolved").length;
    const closedCases = cases.filter((c) => c.status === "Closed").length;

    const COLORS = ["#7A5AF8", "#FF6EA9", "#5AD8A6", "#FFB347", "#69C0FF"];

    // Incident Type Distribution
    const incidentDistribution = useMemo(() => {
        const counts = {};
        cases.forEach((c) => {
            counts[c.incidentType] = (counts[c.incidentType] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [cases]);

    // Victim Type Distribution
    const victimDistribution = useMemo(() => {
        const counts = { child: 0, woman: 0, anonymous: 0 };
        cases.forEach((c) => {
            counts[c.victimType] = (counts[c.victimType] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [cases]);

    // Woman proportion computed on the frontend to complement backend insights
    const womanCount = useMemo(() => {
        try {
            return cases.filter(c => {
                const vt = (c.victimType || '').toString().toLowerCase();
                if (vt.includes('woman') || vt.includes('female')) return true;
                if (c.victimID && c.victimID.victimType && ['woman','female'].includes(c.victimID.victimType)) return true;
                return false;
            }).length;
        } catch (e) { return 0; }
    }, [cases]);
    const womanRate = totalCases ? (womanCount / totalCases) : 0;

    // Cases over time
    const caseTrend = useMemo(() => {
        const counts = {};
        cases.forEach((c) => {
            const date = new Date(c.dateReported || c.createdAt).toISOString().slice(0, 10);
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    }, [cases]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadCases(false);
        await loadDssInsights(false);
        message.success("Case insights refreshed");
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
                    <Col xs={24} md={4}>
                        <KpiCard
                            title="Total Cases"
                            value={totalCases}
                            icon={<FileTextOutlined style={{ color: BRAND.violet }} />}
                            color={BRAND.violet}
                        />
                    </Col>
                    <Col xs={24} md={5}>
                        <KpiCard
                            title="Open Cases"
                            value={openCases}
                            icon={<AlertOutlined style={{ color: BRAND.pink }} />}
                            color={BRAND.pink}
                        />
                    </Col>
                    <Col xs={24} md={5}>
                        <KpiCard
                            title="Under Investigation"
                            value={underInvestigation}
                            icon={<ClockCircleOutlined style={{ color: "#FFB347" }} />}
                            color="#FFB347"
                        />
                    </Col>
                    <Col xs={24} md={5}>
                        <KpiCard
                            title="Resolved Cases"
                            value={resolvedCases}
                            icon={<CheckCircleOutlined style={{ color: BRAND.green }} />}
                            color={BRAND.green}
                        />
                    </Col>
                    <Col xs={24} md={5}>
                        <KpiCard
                            title="Closed Cases"
                            value={closedCases}
                            icon={<CheckCircleOutlined style={{ color: "#69C0FF" }} />}
                            color="#69C0FF"
                        />
                    </Col>

                    {/* Pie chart: Incident Type */}
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

                    {/* Bar chart: Victim Type */}
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

                    {/* Line chart: Cases over time */}
                    <Col xs={24} md={16}>
                        <Card
                            title="Cases Reported Over Time"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : caseTrend.length === 0 ? (
                                <Empty description="No case data" />
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={caseTrend}>
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

                    {/* Recent Cases */}
                    <Col xs={24} md={8}>
                        <Card
                            title="Recent Cases"
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
                                    dataSource={[...cases]
                                        .sort(
                                            (a, b) =>
                                                new Date(b.dateReported || b.createdAt) -
                                                new Date(a.dateReported || a.createdAt)
                                        )
                                        .slice(0, 5)}
                                    renderItem={(c) => (
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
                                                        {c.caseID} — {c.incidentType}
                                                    </Text>
                                                }
                                                description={new Date(
                                                    c.dateReported || c.createdAt
                                                ).toLocaleString()}
                                            />
                                            <Tag
                                                color={
                                                    c.status === "Open"
                                                        ? "magenta"
                                                        : c.status === "Under Investigation"
                                                        ? "orange"
                                                        : c.status === "Resolved"
                                                        ? "green"
                                                        : "blue"
                                                }
                                            >
                                                {c.status}
                                            </Tag>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>

                    {/* DSS Insights */}
                    <Col xs={24}>
                        <Card
                            title="Case Alerts & Recommendations"
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
                            ) : cases.length === 0 ? (
                                <Empty description="No data to analyze" />
                            ) : (
                                <div>
                                    {dssLoading ? (
                                        <Skeleton active />
                                    ) : dssInsights && dssInsights.insights && dssInsights.insights.length === 0 ? (
                                        <Empty description="No insights available" />
                                    ) : (
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            {(
                                                // Merge backend insights with a frontend-computed Woman Case insight when missing
                                                (() => {
                                                    const backend = dssInsights?.insights || [];
                                                    const hasWoman = backend.some(x => x.label === 'Woman Case Proportion');
                                                    if (!hasWoman && womanCount > 0) {
                                                        const pct = Math.round(womanRate * 100);
                                                        const womanInsight = {
                                                            label: 'Woman Case Proportion',
                                                            value: `${womanCount} (${pct}%)`,
                                                            type: womanRate > 0.6 ? 'warning' : womanRate > 0.25 ? 'info' : 'success',
                                                            message: `There are ${womanCount} woman case${womanCount !== 1 ? 's' : ''} (${pct}% of total). Prioritize services and protections for women victims.`,
                                                            message_tl: `Mayroong ${womanCount} kaso na may kinalaman sa kababaihan (${pct}% ng kabuuan). Bigyang prayoridad ang mga serbisyo at proteksyon para sa mga biktimang babae.`,
                                                            recommendations: [
                                                                'Ensure service pathways and referrals are accessible for women victims.',
                                                                'Provide gender-sensitive counseling and legal support.',
                                                                'Monitor and prioritize resources for areas with high woman-case proportions.'
                                                            ],
                                                            recommendations_tl: [
                                                                'Siguraduhin na accessible ang mga serbisyo at referral para sa mga biktimang babae.',
                                                                'Magbigay ng gender-sensitive na counseling at legal na suporta.',
                                                                'Subaybayan at unahin ang mga resources para sa mga lugar na may mataas na proporsyon ng kaso ng kababaihan.'
                                                            ]
                                                        };
                                                        return [...backend, womanInsight].map((i, idx) => ({ i, idx }));
                                                    }
                                                    return backend.map((i, idx) => ({ i, idx }));
                                                })()
                                            ).map(({ i, idx }) => (
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
                                                            i.urgent ? '#d32029' : (i.type === "error" ? "#ff4d4f" : i.type === "warning" ? "#faad14" : i.type === "info" ? "#1677ff" : "#52c41a")
                                                        }`,
                                                        boxShadow: i.urgent ? '0 6px 18px rgba(211,32,41,0.08)' : undefined
                                                    }}
                                                >
                                                    <Typography.Text strong>
                                                        {i.label}
                                                        {i.value !== undefined ? ` — ${typeof i.value === 'number' ? (i.value.toFixed ? i.value.toFixed(1) : i.value) : i.value}` : ''}
                                                    </Typography.Text>
                                                    {i.urgent && (
                                                        <Tag style={{ marginLeft: 8 }} color="error">URGENT</Tag>
                                                    )}
                                                    <br />
                                                    <Typography.Text>{(showTagalog && i.message_tl) ? i.message_tl : i.message || ''}</Typography.Text>
                                                    {((showTagalog && i.recommendations_tl && i.recommendations_tl.length) ? i.recommendations_tl : i.recommendations) && (((showTagalog && i.recommendations_tl && i.recommendations_tl.length) ? i.recommendations_tl : i.recommendations).length > 0) && (
                                                        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                                                            {((showTagalog && i.recommendations_tl && i.recommendations_tl.length) ? i.recommendations_tl : i.recommendations).map((r, ri) => (
                                                                <li key={ri}><Typography.Text>{r}</Typography.Text></li>
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
        </Layout>
    );
}
