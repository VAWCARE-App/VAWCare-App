// Lightweight “React Bits” composed with Ant Design.
// Feel free to split these into separate files later.

import React from "react";
import { Card, Button, Statistic } from "antd";
import { motion } from "framer-motion";

/** Layout helpers */
export const Container = ({ children, style }) => (
  <div
    style={{
      width: "100%",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "0 clamp(16px, 4vw, 24px)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Section = ({ id, children, style }) => (
  <section id={id} style={{ padding: "clamp(32px, 8vw, 56px) 0", width: "100%", overflow: "hidden", ...style }}>{children}</section>
);

/** Visual primitives */
export const GlassCard = ({ children, hoverable = true, style, bodyStyle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    whileHover={hoverable ? { 
      y: -8, 
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(16,16,16,.12), 0 0 0 1px rgba(122,90,248,.15)"
    } : {}}
    style={{
      borderRadius: 16,
      transition: "all 0.15s ease",
    }}
  >
    <Card
      hoverable={false}
      bordered
      style={{
        borderRadius: 16,
        borderColor: "var(--border)",
        background: "var(--card)",
        backdropFilter: "saturate(160%) blur(8px)",
        boxShadow: "0 10px 30px rgba(16,16,16,.06)",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        height: "100%",
        ...style,
      }}
      bodyStyle={{
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxSizing: "border-box",
        ...bodyStyle,
      }}
    >
      {children}
    </Card>
  </motion.div>
);

export const KPI = ({ title, value }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    whileHover={{ 
      scale: 1.05,
      boxShadow: "0 15px 35px rgba(233,30,99,.15)"
    }}
    style={{
      borderRadius: 16,
      transition: "all 0.15s ease",
    }}
  >
    <Card
      bordered
      style={{
        borderRadius: 16,
        borderColor: "var(--border)",
        background: "var(--card)",
        backdropFilter: "saturate(160%) blur(8px)",
        boxShadow: "0 10px 30px rgba(16,16,16,.06)",
        width: "100%",
        height: "100%",
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Statistic title={title} value={value} />
    </Card>
  </motion.div>
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
      maxWidth: "100%",
      flexWrap: "wrap",
      justifyContent: "center",
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }} />
    <strong>VAWCare</strong>
    <span style={{ color: "var(--text-muted)", fontSize: "clamp(12px, 3vw, 14px)" }}>Community Safety Platform</span>
  </span>
);
