import React from "react";
import { Button, Grid, Typography, Space } from "antd";
import { MenuOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export default function AdminHeader({ title, subtitle, showBack = true, onBack, children }) {
  const screens = Grid.useBreakpoint();
  const isMdUp = !!screens.md;
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingInline: 16,
        height: 72,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* sidebar icon only on mobile */}
        {!isMdUp && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
            aria-label="Toggle sidebar"
            style={{ borderRadius: 10 }}
          />
        )}

        {showBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label="Back"
            style={{ borderRadius: 999 }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Title level={4} style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </Text>
          )}
        </div>
      </div>

      {/* right-side controls from page (search / actions) */}
      <Space size={12} align="center" style={{ gap: 12 }}>
        {children}
      </Space>
    </div>
  );
}