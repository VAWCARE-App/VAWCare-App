// src/components/VictimNavbar.js
import React from "react";
import { Layout, Menu, Avatar, Button, Typography, Dropdown } from "antd";
import {
    DashboardOutlined,
    FileAddOutlined,
    UserSwitchOutlined,
    MessageOutlined,
    InfoCircleOutlined,
    SettingOutlined,
    LogoutOutlined,
    PhoneOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../lib/api";
import logo from "../assets/logo1.png";

// ✅ Import EmergencyButton
import EmergencyButton from "./EmergencyButtonAlt";

const { Header } = Layout;
const { Text } = Typography;

export default function VictimNavbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const BRAND = {
        primary: "#e91e63",
        bgGrad: "linear-gradient(90deg, #fff 0%, #ffe6ef 100%)",
    };

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const initials =
        (currentUser.firstName || "U").charAt(0) +
        (currentUser.lastName || "").charAt(0);

    const handleLogout = () => {
        clearToken();
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        navigate("/login");
    };

    const userMenu = (
        <Menu>
            <Menu.Item key="resources" icon={<InfoCircleOutlined />}>
                <a href="/resources">VAWC Resources</a>
            </Menu.Item>
            <Menu.Item key="hotline" icon={<PhoneOutlined />}>
                <a href="tel:117">Emergency Hotline (117)</a>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
                key="logout"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ color: BRAND.primary }}
            >
                Logout
            </Menu.Item>
        </Menu>
    );

    const menuItems = [
        { key: "/victim/victim-test", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "/victim/report", icon: <FileAddOutlined />, label: "Report Case" },
        { key: "/victim/victim-cases", icon: <UserSwitchOutlined />, label: "My Cases" },
        { key: "/victim/victim-barangay", icon: <InfoCircleOutlined />, label: "Barangay" },
        { key: "/victim/victim-settings", icon: <SettingOutlined />, label: "Settings" },
    ];

    return (
        <Header
            style={{
                height: 80,
                lineHeight: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(180deg, #fff5f8 0%, #ffffff 60%)",
                borderBottom: "1px solid #ffd1dc",
                padding: "0 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
        >
            {/* Logo + App Name */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar src={logo} size={36} />
                <Text strong style={{ fontSize: 18, color: BRAND.primary }}>
                    VAWCare
                </Text>
            </div>

            {/* Menu */}
            <Menu
                mode="horizontal"
                selectedKeys={[location.pathname]}
                onClick={({ key }) => navigate(key)}
                items={menuItems}
                style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "transparent",
                    borderBottom: "none",
                }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* ✅ Emergency button stays visible */}
                <EmergencyButton compact />

                {/* ✅ Avatar dropdown */}
                <Dropdown overlay={userMenu} trigger={["click"]} placement="bottomRight">
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            background: "#ffffffa6",
                            border: `1px solid ${BRAND.border}`,
                            borderRadius: 12,
                            cursor: "pointer",
                        }}
                    >
                        <Avatar style={{ background: BRAND.primary, fontWeight: 700 }} size={28}>
                            {initials}
                        </Avatar>
                        <div style={{ lineHeight: 1 }}>
                            <Text strong style={{ fontSize: 12 }}>
                                {currentUser.firstName
                                    ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                                    : "User"}
                            </Text>
                            <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Victim
                                </Text>
                            </div>
                        </div>
                    </div>
                </Dropdown>
            </div>
        </Header>
    );
}
