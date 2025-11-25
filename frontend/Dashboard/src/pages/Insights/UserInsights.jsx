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
    UserOutlined,
    TeamOutlined,
    SafetyCertificateOutlined,
    ReloadOutlined,
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

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function UserInsights() {
    const { message } = AntApp.useApp();
    const loggedRef = React.useRef(false);
    const screens = Grid.useBreakpoint();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState({ admins: [], victims: [], officials: [] });

    const BRAND = {
        violet: "#7A5AF8",
        pink: "#ff6ea9",
        soft: "rgba(122,90,248,0.18)",
        chip: "#fff0f7",
    };

    const loadUsers = async (withSpinner = true) => {
        try {
            if (withSpinner) setLoading(true);
            const res = await api.get("/api/admin/users");
            const users = res.data?.data || res.data;
            setData({
                admins: users.admins || [],
                victims: users.victims || [],
                officials: users.officials || [],
            });
        } catch (err) {
            message.error("Failed to load user data");
            setData({ admins: [], victims: [] });
        } finally {
            if (withSpinner) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Log page view when this insight tab is opened (with deduplication)
    useEffect(() => {
        try {
            const path = '/admin/insights/users';
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

    // Derived stats
    const totalAdmins = data.admins.length;
    const totalVictims = data.victims.length;
    const totalOfficials = data.officials ? data.officials.length : 0;
    const totalUsers = totalAdmins + totalVictims + totalOfficials;

    const anonymousVictims = data.victims.filter((v) => v.isAnonymous).length;
    const regularVictims = totalVictims - anonymousVictims;

    const victimDistribution = [
        { name: "Anonymous", value: anonymousVictims },
        { name: "Regular", value: regularVictims },
    ];

    const userTypeDistribution = [
        { name: "Admins", value: totalAdmins },
        { name: "Victims", value: totalVictims },
        { name: "Officials", value: totalOfficials },
    ];

    // Registration trends (based on createdAt)
    const registrationTrend = useMemo(() => {
        const counts = {};
        [...data.admins, ...data.victims, ...data.officials].forEach((u) => {
            const date = new Date(u.createdAt).toISOString().slice(0, 10);
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts).map(([date, count]) => ({
            date,
            count,
        }));
    }, [data]);

    const COLORS = ["#7A5AF8", "#FF6EA9", "#FFB347", "#5AD8A6"];

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadUsers(false);
        message.success("User insights refreshed");
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
        <Layout style={{ background: "#fff", minHeight: "100vh", padding: 16 }}>
            <Content>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Total Users"
                            value={totalUsers}
                            icon={<UserOutlined style={{ color: BRAND.violet }} />}
                            color={BRAND.violet}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Admins"
                            value={totalAdmins}
                            icon={<TeamOutlined style={{ color: BRAND.pink }} />}
                            color={BRAND.pink}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Victims"
                            value={totalVictims}
                            icon={<SafetyCertificateOutlined style={{ color: "#5AD8A6" }} />}
                            color="#5AD8A6"
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <KpiCard
                            title="Officials"
                            value={totalOfficials}
                            icon={<TeamOutlined style={{ color: "#FFB347" }} />}
                            color="#FFB347"
                        />
                    </Col>

                    {/* Pie chart: User type distribution */}
                    <Col xs={24} md={12}>
                        <Card
                            title="User Type Distribution"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 200 : 260}>
                                    <PieChart>
                                        <Pie
                                            data={userTypeDistribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            label
                                        >
                                            {userTypeDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </Col>

                    {/* Bar chart: Victim account types */}
                    <Col xs={24} md={12}>
                        <Card
                            title="Victim Account Types"
                            bordered
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

                    {/* Line chart: Registrations over time */}
                    <Col xs={24} md={16}>
                        <Card
                            title="User Registrations Over Time"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : registrationTrend.length === 0 ? (
                                <Empty description="No registration data" />
                            ) : (
                                <ResponsiveContainer width="100%" height={screens.xs ? 220 : 280}>
                                    <LineChart data={registrationTrend}>
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

                    {/* Recent Users */}
                    <Col xs={24} md={8}>
                        <Card
                            title="Recent Users"
                            bordered
                            style={{ borderRadius: 16, borderColor: BRAND.soft, overflow: "hidden" }}
                            bodyStyle={{ padding: 8 }}
                        >
                            {loading ? (
                                <Skeleton active />
                            ) : (
                                <List
                                    style={{ padding: 0, margin: 0 }}
                                    dataSource={[...data.admins, ...data.victims, ...data.officials]
                                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                        .slice(0, 5)}
                                    renderItem={(u) => (
                                        <List.Item style={{ padding: "8px 12px" }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        style={{
                                                            background: u.victimID ? BRAND.pink : BRAND.violet,
                                                            width: 40,
                                                            height: 40,
                                                            fontSize: 20,
                                                            overflow: "hidden",
                                                            flex: "none",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                        icon={<UserOutlined />}
                                                    />
                                                }
                                                title={
                                                    <Text ellipsis style={{ maxWidth: "200px" }}>
                                                        {`${u.firstName} ${u.lastName}`}
                                                    </Text>
                                                }
                                                description={new Date(u.createdAt).toLocaleString()}
                                            />
                                            <Tag color={u.victimID ? "magenta" : (u.position ? "gold" : "purple")}>
                                                {u.victimID ? (u.isAnonymous ? "Anonymous" : "Victim") : (u.position ? "Official" : "Admin")}
                                            </Tag>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}
