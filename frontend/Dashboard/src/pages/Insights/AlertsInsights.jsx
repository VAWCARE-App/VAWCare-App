import React, { useEffect, useMemo, useState } from "react";
import {
    Layout,
    Card,
    Row,
    Col,
    Typography,
    Statistic,
    Skeleton,
    Tag,
    Space,
    Empty,
    Progress,
    Badge,
    Button,
} from "antd";
import {
    BellOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from 'react-leaflet-markercluster';
import '../../styles/marker-cluster.css';
import { api } from "../../lib/api";

const { Content } = Layout;
const { Text, Title } = Typography;

const BRAND = {
    violet: "#7A5AF8",
    pink: "#FF6EA9",
    green: "#5AD8A6",
    yellow: "#FFB347",
    soft: "rgba(122,90,248,0.18)",
};

const alertIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484582.png",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

export default function AlertsInsights() {
    const loggedRef = React.useRef(false);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState('current'); // 'current' | 'previous' | 'last2' | 'all'

    function formatRangeLabel(range) {
        const now = new Date();
        const monthName = (d) => d.toLocaleString('default', { month: 'short', year: 'numeric' });
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

    const loadAlerts = async (withSpinner = true) => {
        try {
            if (withSpinner) setLoading(true);
            const res = await api.get("/api/alerts");
            const alertsData = res.data?.data || res.data || [];
            setAlerts(alertsData);
        } catch (err) {
            console.error(err);
        } finally {
            if (withSpinner) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    // Log page view to system logs (only once per mount)
    useEffect(() => {
        if (!loggedRef.current) {
            loggedRef.current = true;
            api.post("/api/logs/pageview", { path: "/admin/insights/alerts" }).catch((e) => {
                console.debug("Failed to log page view:", e.message);
            });
        }
    }, []);

    useEffect(() => {
        // reload alerts when range changes to update displays
        loadAlerts();
    }, [range]);

    // KPI Metrics
    const bounds = getRangeBounds(range);

    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            const dt = new Date(a.createdAt);
            if (bounds.since && dt < bounds.since) return false;
            if (bounds.until && dt >= bounds.until) return false;
            return true;
        });
    }, [alerts, range]);

    // KPI Metrics (based on filteredAlerts)
    const total = filteredAlerts.length;
    const active = filteredAlerts.filter((a) => a.status === "Active").length;
    const resolved = filteredAlerts.filter((a) => a.status === "Resolved").length;
    const cancelled = filteredAlerts.filter((a) => a.status === "Cancelled").length;

    // Status Distribution Pie
    const statusData = useMemo(
        () => [
            { name: "Active", value: active },
            { name: "Resolved", value: resolved },
            { name: "Cancelled", value: cancelled },
        ],
        [filteredAlerts]
    );

    const COLORS = [BRAND.pink, BRAND.green, "#8884d8"];

    // Alerts over time (filtered by selected range)
    const trendData = useMemo(() => {
        const counts = {};
        const now = new Date();
        const bounds = (function() {
            if (range === 'current') return { since: new Date(now.getFullYear(), now.getMonth(), 1), until: null };
            if (range === 'previous') return { since: new Date(now.getFullYear(), now.getMonth() - 1, 1), until: new Date(now.getFullYear(), now.getMonth(), 1) };
            if (range === 'last2') return { since: new Date(now.getFullYear(), now.getMonth() - 1, 1), until: null };
            return { since: new Date(0), until: null };
        })();
        filteredAlerts.forEach((a) => {
            const dt = new Date(a.createdAt);
            if (bounds.since && dt < bounds.since) return;
            if (bounds.until && dt >= bounds.until) return;
            const date = dt.toISOString().slice(0, 10);
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({ date, count }));
    }, [alerts, range]);

    // Average duration for resolved alerts
    const durationData = useMemo(() => {
        const resolvedAlerts = filteredAlerts.filter((a) => a.durationMs);
        if (resolvedAlerts.length === 0) return [];
        return resolvedAlerts.map((a) => ({
            name: a.alertID,
            duration: a.durationMs / 1000 / 60, // mins
        }));
    }, [alerts]);

    // DSS Logic
    const dssInsights = useMemo(() => {
        const insights = [];

        const last7 = trendData.slice(-7);
        if (last7.length >= 2) {
            const last = last7[last7.length - 1].count;
            const prev = last7[last7.length - 2].count;
            if (prev > 0 && last > prev * 1.5) {
                insights.push({
                    label: "Spike in Alerts",
                    value: ((last - prev) / prev) * 100,
                    type: "warning",
                });
            }
        }

        const avgDuration =
            durationData.reduce((a, b) => a + b.duration, 0) /
            (durationData.length || 1);
        insights.push({
            label: "Avg. Response Time",
            value: avgDuration,
            type: avgDuration > 30 ? "error" : avgDuration > 15 ? "warning" : "success",
        });

        const activeRatio = (active / (total || 1)) * 100;
        insights.push({
            label: "Active Alert Ratio",
            value: activeRatio,
            type: activeRatio > 50 ? "error" : activeRatio > 25 ? "warning" : "success",
        });

        const clusterCount = filteredAlerts.filter(
            (a, i, arr) =>
                arr.findIndex(
                    (b) =>
                        Math.abs(a.location.latitude - b.location.latitude) < 0.02 &&
                        Math.abs(a.location.longitude - b.location.longitude) < 0.02
                ) !== i
        ).length;
        if (clusterCount > 3)
            insights.push({
                label: "Geographic Clustering Detected",
                value: clusterCount,
                type: "warning",
            });

        return insights;
    }, [alerts, trendData, durationData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAlerts(false);
    };

    const KpiCard = ({ title, value, icon, color }) => (
        <Card
            bordered
            style={{
                borderRadius: 16,
                borderColor: BRAND.soft,
                height: "100%",
                boxShadow: "0 8px 20px rgba(122,90,248,0.06)",
            }}
            bodyStyle={{ padding: 16 }}
        >
            <Space align="center" size="middle">
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(122,90,248,0.05)",
                        display: "grid",
                        placeItems: "center",
                    }}
                >
                    {icon}
                </div>
                <Statistic title={title} value={value} valueStyle={{ color }} />
            </Space>
        </Card>
    );

    return (
        <Layout style={{ background: "#fff", minHeight: "100vh", padding: 16 }}>
            <Content>
                <Row gutter={[16, 16]}>
                    <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                        <Space>
                            <div style={{ textAlign: 'right', marginRight: 8 }}>
                                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Based on </Text>
                                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{formatRangeLabel(range)}</Text>
                            </div>
                            <Button.Group>
                                <Button type={range === 'current' ? 'primary' : 'default'} onClick={() => { setRange('current'); }}>Current</Button>
                                <Button type={range === 'previous' ? 'primary' : 'default'} onClick={() => { setRange('previous'); }}>Previous</Button>
                                <Button type={range === 'all' ? 'primary' : 'default'} onClick={() => { setRange('all'); }}>All</Button>
                            </Button.Group>
                             <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh}>Refresh</Button>
                        </Space>
                    </Col>
                    <Col xs={24} md={8}>
                        <KpiCard
                            title="Active Alerts"
                            value={active}
                            color={BRAND.pink}
                            icon={<BellOutlined style={{ color: BRAND.pink, fontSize: 22 }} />}
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <KpiCard
                            title="Resolved"
                            value={resolved}
                            color={BRAND.green}
                            icon={<CheckCircleOutlined style={{ color: BRAND.green, fontSize: 22 }} />}
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <KpiCard
                            title="Cancelled"
                            value={cancelled}
                            color="#8884d8"
                            icon={<CloseCircleOutlined style={{ color: "#8884d8", fontSize: 22 }} />}
                        />
                    </Col>

                    {/* Map */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Active Alert Locations (Clustered)"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
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
                            ) : active === 0 ? (
                                <Empty description="No active alerts" />
                            ) : (
                                <div style={{ height: 300, width: "100%", borderRadius: 12 }}>
                                    <MapContainer
                                        center={[12.8797, 121.7740]} // Philippines center
                                        zoom={5}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        <MarkerClusterGroup
                                            iconCreateFunction={(cluster) => {
                                                const count = cluster.getChildCount();
                                                const size = count < 5 ? 'small' : count < 10 ? 'medium' : 'large';
                                                const color =
                                                    count < 5 ? '#5AD8A6' : count < 10 ? '#FFB347' : '#FF6EA9';
                                                return L.divIcon({
                                                    html: `<div style="background-color:${color};border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">${count}</div>`,
                                                    className: 'custom-cluster-icon',
                                                    iconSize: L.point(40, 40),
                                                });
                                            }}
                                        >
                                            {filteredAlerts.map((a, i) => (
                                                <Marker
                                                    key={i}
                                                    position={[a.location.latitude, a.location.longitude]}
                                                    icon={alertIcon}
                                                >
                                                    <Popup>
                                                        <strong>{a.alertID}</strong>
                                                        <br />
                                                        Victim ID: {typeof a.victimID === 'object' ? a.victimID.victimID : a.victimID || 'N/A'}
                                                        <br />
                                                        Status: {a.status}
                                                    </Popup>
                                                </Marker>
                                            ))}
                                        </MarkerClusterGroup>
                                    </MapContainer>
                                </div>
                            )}
                        </Card>
                    </Col>

                    {/* Pie Chart */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Alert Status Distribution"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            dataKey="value"
                                            label
                                        >
                                            {statusData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={COLORS[i % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Line Chart */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Alerts Over Time"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : trendData.length === 0 ? (
                                <Empty description="No data" />
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke={BRAND.violet} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Duration Bar */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Average Response Time (Minutes)"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : durationData.length === 0 ? (
                                <Empty description="No resolved alerts" />
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={durationData}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="duration" fill={BRAND.pink} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* DSS Section */}
                    <Col xs={24}>
                        <Card
                            title="DSS Analysis & Recommendations"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : dssInsights.length === 0 ? (
                                <Empty description="No insights available" />
                            ) : (
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {dssInsights.map((i, idx) => (
                                        <div key={idx} style={{ padding: "8px 0" }}>
                                            <Space>
                                                <Badge
                                                    status={
                                                        i.type === "error"
                                                            ? "error"
                                                            : i.type === "warning"
                                                                ? "warning"
                                                                : "success"
                                                    }
                                                />
                                                <Text strong>{i.label}</Text>
                                            </Space>
                                            <Progress
                                                percent={Math.min(
                                                    i.value > 100 ? 100 : Number(i.value.toFixed(1)),
                                                    100
                                                )}
                                                strokeColor={
                                                    i.type === "error"
                                                        ? "#ff4d4f"
                                                        : i.type === "warning"
                                                            ? "#faad14"
                                                            : "#52c41a"
                                                }
                                                showInfo={true}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                    ))}
                                </Space>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}
