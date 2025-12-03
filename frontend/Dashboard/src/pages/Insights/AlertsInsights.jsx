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
    Grid,
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

// Define icons for different alert statuses
const alertIcons = {
    Active: new L.DivIcon({
        className: '',
        html: `<div style="position: relative; width: 32px; height: 32px;">
                <div style="width: 32px; height: 32px; background: #ff4d4f; border-radius: 50%; box-shadow: 0 3px 6px rgba(0,0,0,0.2); border: 2px solid #fff; position: absolute; top: 0; left: 0; z-index: 1;"></div>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    }),
    Resolved: new L.DivIcon({
        className: '',
        html: `<div style="
            width: 32px;
            height: 32px;
            background: #52c41a;
            border-radius: 50%;
            box-shadow: 0 3px 6px rgba(0,0,0,0.2);
            border: 2px solid #fff;
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    }),
    Cancelled: new L.DivIcon({
        className: '',
        html: `<div style="
            width: 32px;
            height: 32px;
            background: #8c8c8c;
            border-radius: 50%;
            box-shadow: 0 3px 6px rgba(0,0,0,0.2);
            border: 2px solid #fff;
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    })
};

export default function AlertsInsights() {
    const loggedRef = React.useRef(false);
    const screens = Grid.useBreakpoint();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState('current'); // 'current' | 'previous' | 'last2' | 'all'
    const [dssLoading, setDssLoading] = useState(true);
    const [dssInsights, setDssInsights] = useState(null);
    const [showTagalog, setShowTagalog] = useState(false);

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

    const loadDssInsights = async (withSpinner = true) => {
        try {
            if (withSpinner) setDssLoading(true);
            const res = await api.post('/api/dss/suggest/alerts', { range });
            setDssInsights(res.data?.data || null);
        } catch (err) {
            console.error('Failed to load DSS insights for alerts', err);
            setDssInsights(null);
        } finally {
            if (withSpinner) setDssLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
        loadDssInsights();
    }, []);

    // Log page view when this insight tab is opened (with deduplication)
    useEffect(() => {
        try {
            const path = '/admin/insights/alerts';
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
        // reload alerts when range changes to update displays
        loadAlerts();
        loadDssInsights();
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

    // DSS Logic (local calculation for fallback)
    const localDssInsights = useMemo(() => {
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
            label: "Avg. Active Duration",
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
        await loadDssInsights(false);
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
        <>
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

                /* Force all Leaflet map panes to stay below navbar (zIndex: 100) */
                .leaflet-pane,
                .leaflet-top,
                .leaflet-bottom,
                .leaflet-control,
                .leaflet-popup-pane,
                .leaflet-tooltip-pane,
                .leaflet-shadow-pane,
                .leaflet-marker-pane,
                .leaflet-overlay-pane,
                .leaflet-tile-pane {
                    z-index: 50 !important;
                }
                .leaflet-container {
                    z-index: 1 !important;
                }
            `}</style>
            <Layout style={{ background: "#fff", minHeight: "100vh", padding: 16 }}>
                <Content>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} style={{ display: 'flex', justifyContent: screens.md ? 'flex-end' : 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Space wrap size={screens.xs ? 4 : 8}>
                            {screens.md && (
                                <div style={{ textAlign: 'right', marginRight: 8 }}>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Based on </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{formatRangeLabel(range)}</Text>
                                </div>
                            )}
                            <Button.Group size={screens.xs ? 'small' : 'middle'}>
                                <Button type={range === 'current' ? 'primary' : 'default'} onClick={() => { setRange('current'); }}>Current</Button>
                                <Button type={range === 'previous' ? 'primary' : 'default'} onClick={() => { setRange('previous'); }}>Previous</Button>
                                <Button type={range === 'all' ? 'primary' : 'default'} onClick={() => { setRange('all'); }}>All</Button>
                            </Button.Group>
                             <Button size={screens.xs ? 'small' : 'middle'} icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh}>{screens.md && 'Refresh'}</Button>
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
                        {/* Alerts Location Card */}
                    <Col xs={24}>
                        <Card
                            title="Alerts Location"
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
                            ) : filteredAlerts.length === 0 ? (
                                <Empty description="No alerts data" />
                            ) : (
                                <div style={{ height: screens.xs ? 280 : screens.md ? 450 : 350, width: "100%", borderRadius: 12, position: 'relative', zIndex: 1 }}>
                                    <MapContainer
                                        center={[16.4829176, 121.1501679]} // Bayombong, Nueva Vizcaya center
                                        zoom={13}
                                        style={{ height: "100%", width: "100%", zIndex: 1 }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        {[...filteredAlerts]
                                            .sort((a, b) => {
                                                // First, check if either alert is active
                                                const aIsActive = a.status === 'Active';
                                                const bIsActive = b.status === 'Active';
                                                
                                                if (aIsActive !== bIsActive) {
                                                    // If one is active and the other isn't, active goes on top
                                                    return aIsActive ? 1 : -1;
                                                }
                                                // If neither is active or both are active,
                                                const dateA = new Date(a.createdAt).getTime();
                                                const dateB = new Date(b.createdAt).getTime();
                                                return dateB - dateA;
                                            })
                                            .map((a, i) => {
                                            // Safely handle missing location data
                                            if (!a?.location?.latitude || !a?.location?.longitude) {
                                                return null;
                                            }

                                            // Safely extract victimID
                                            const victimIdDisplay = (() => {
                                                if (!a.victimID) return 'N/A';
                                                if (typeof a.victimID === 'object' && a.victimID?.victimID) {
                                                    return a.victimID.victimID;
                                                }
                                                return String(a.victimID);
                                            })();

                                            // Calculate zIndex based on status and date
                                            // Keep zIndex low to avoid overlapping the navbar (which has zIndex: 100)
                                            const baseZIndex = 10; // base z-index
                                            const alertDate = new Date(a.createdAt).getTime();
                                            // Use relative index instead of timestamp
                                            const dateBonus = i; // Simple incremental bonus
                                            const statusBonus = a.status === 'Active' ? 50 : 0; // Active alerts get higher priority
                                            const zIndex = baseZIndex + statusBonus + dateBonus;

                                            return (
                                                <Marker
                                                    key={i}
                                                    position={[a.location.latitude, a.location.longitude]}
                                                    icon={alertIcons[a.status || 'Active']}
                                                    zIndexOffset={zIndex}
                                                >
                                                    <Popup>
                                                        <strong>{a.alertID || 'Unknown Alert'}</strong>
                                                        <br />
                                                        Victim ID: {(() => {
                                                            if (!a.victimID) return 'N/A';
                                                            if (typeof a.victimID === 'object' && a.victimID?.victimID) {
                                                                return a.victimID.victimID;
                                                            }
                                                            return String(a.victimID);
                                                        })()}
                                                        <br />
                                                        Status: <Tag color={
                                                            a.status === "Active" ? "red" : 
                                                            a.status === "Resolved" ? "green" : 
                                                            "default"
                                                        }>{a.status || 'Unknown'}</Tag>
                                                        <br />
                                                        Created: {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Unknown date'}
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
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
                                <ResponsiveContainer width="100%" height={screens.xs ? 220 : 300}>
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
                    {/* Duration Bar */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Alert Active Duration (Minutes)"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : durationData.length === 0 ? (
                                <Empty description="No resolved alerts" />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 220 : 300}>
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
                    {/* Line Chart */}
                    <Col xs={24} md={24}>
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
                                <ResponsiveContainer width="100%" height={screens.xs ? 220 : 280}>
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

                    {/* DSS Section */}
                    <Col xs={24}>
                        <Card
                            title="Alerts Recommendations"
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
                            ) : alerts.length === 0 ? (
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
                                                            borderLeft: `4px solid ${i.urgent ? '#d32029' : (i.type === "error" ? "#ff4d4f" : i.type === "warning" ? "#faad14" : i.type === "info" ? "#1677ff" : "#52c41a")}`,
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
        </>
    );
}
