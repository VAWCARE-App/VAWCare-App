import React from "react";
import { Link } from "react-router-dom";
import { Avatar, Space, Typography } from "antd";

const { Text } = Typography;

export default function BrandPill({ small = false }) {
  const size = small ? 32 : 44;
  return (
    <Link to="/landing" style={{ textDecoration: "none" }}>
      <Space align="center" style={{ display: "inline-flex", gap: 10 }}>
        <Avatar
          style={{ background: "var(--brand)", fontWeight: 800 }}
          size={size}
        >
          V
        </Avatar>
        {!small && (
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <Text strong style={{ color: "var(--ink)", fontSize: 18 }}>
              VAWCare
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Community-first
            </Text>
          </div>
        )}
      </Space>
    </Link>
  );
}