import React from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import VictimNavbar from "../components/VictimNavbar";
import Chatbot from "../components/Chatbot";

const { Content } = Layout;

export default function MainLayout() {
  return (
    <Layout
      style={{
        height: "100vh",       // lock to viewport height
        minHeight: "100dvh",   // safe on mobile browsers
        width: "100%",
        background: "#fff5f8", // light pink
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navbar */}
      <VictimNavbar />

      {/* Main content area */}
      <Content
        style={{
          flex: 1,
          overflow: "auto",     // scrollable content
          background: "#fff",
        }}
      >
        {/* Nested routes will be rendered here */}
        <Outlet />
        <Chatbot />
      </Content>
    </Layout>
  );
}
