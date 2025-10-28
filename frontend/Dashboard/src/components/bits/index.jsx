// Lightweight “React Bits” composed with Ant Design.
// Feel free to split these into separate files later.

import React from "react";
import { Card, Button, Statistic } from "antd";

/** Layout helpers */
export const Container = ({ children, style }) => (
  <div
    style={{
      width: "100%",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "0 16px",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Section = ({ id, children, style }) => (
  <section id={id} style={{ padding: "56px 0", ...style }}>{children}</section>
);

/** Visual primitives */
export const GlassCard = ({ children, hoverable = true, style, bodyStyle }) => (
  <Card
    hoverable={hoverable}
    bordered
    style={{
      borderRadius: 16,
      borderColor: "var(--border)",
      background: "var(--card)",
      backdropFilter: "saturate(160%) blur(8px)",
      boxShadow: "0 10px 30px rgba(16,16,16,.06)",
      ...style,
    }}
    bodyStyle={{
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      ...bodyStyle,
    }}
  >
    {children}
  </Card>
);

export const KPI = ({ title, value }) => (
  <GlassCard hoverable={false} bodyStyle={{ padding: 16 }}>
    <Statistic title={title} value={value} />
  </GlassCard>
);

/** Buttons (styled to blend with AntD) */
export const CTAButton = ({ primary, children, ...rest }) => (
  <Button
    size="large"
    type={primary ? "primary" : "default"}
    className={primary ? "btn-primary" : "btn-dark"}
    {...rest}
  >
    {children}
  </Button>
);

/** Small brand pill */
export const BrandPill = ({ color = "var(--brand)" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid var(--border)",
      background: "var(--card)",
      lineHeight: 1,
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
    <strong>VAWCare</strong>
    <span style={{ color: "var(--text-muted)" }}>Community Safety Platform</span>
  </span>
);
