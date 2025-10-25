import React, { useEffect } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import VictimNavbar from "../components/VictimNavbar";
import Chatbot from "../components/Chatbot";
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';

const { Content } = Layout;

export default function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    // Fire-and-forget pageview log
    try {
      const path = location.pathname;
      // dedupe quick successive posts for same path
      const lastPath = sessionStorage.getItem('__lastPageviewPath') || '';
      const lastAt = Number(sessionStorage.getItem('__lastPageviewAt') || '0');
      const now = Date.now();
      // Only send if path changed or more than 3 seconds elapsed since last post
      if (lastPath !== path || (now - lastAt) > 3000) {
        const actorId = sessionStorage.getItem('actorId');
        const actorType = sessionStorage.getItem('actorType');
        const actorBusinessId = sessionStorage.getItem('actorBusinessId');
        api.post('/api/logs/pageview', { path, actorId, actorType, actorBusinessId }).catch(() => {});
        try { sessionStorage.setItem('__lastPageviewPath', path); sessionStorage.setItem('__lastPageviewAt', String(now)); } catch (e) {}
      }
    } catch (e) { console.warn('Failed to call pageview API', e && e.message); }
  }, [location]);
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