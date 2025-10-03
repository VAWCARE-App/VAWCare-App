import React, { useState } from "react";
import { Layout, Menu, Button, Drawer, Grid } from "antd";
import { Link } from "react-router-dom";
import { MenuOutlined, LoginOutlined } from "@ant-design/icons";

const { Header } = Layout;
const items = [
  { key: "home", label: <a href="#home">Home</a> },
  { key: "about", label: <a href="#about">About</a> },
  { key: "location", label: <a href="#location">Location</a> },
  { key: "login", label: <Link to="/login">Login</Link> },
];

export default function Navbar() {
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Header
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderBottom: "1px solid #ffe1ea",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.5, color: "#e91e63" }}>
          VAWCare
        </div>

        {screens.md ? (
          <Menu
            mode="horizontal"
            items={items}
            selectable={false}
            style={{ borderBottom: "none" }}
          />
        ) : (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            />
            <Drawer
              open={open}
              onClose={() => setOpen(false)}
              title="VAWCare"
              placement="right"
            >
              <Menu
                mode="inline"
                items={items}
                selectable={false}
                onClick={() => setOpen(false)}
              />
              <Link to="/login">
                <Button
                  type="primary"
                  icon={<LoginOutlined />}
                  style={{ marginTop: 12, background: "#e91e63", borderColor: "#e91e63" }}
                  block
                >
                  Login
                </Button>
              </Link>
            </Drawer>
          </>
        )}
      </Header>
      <div style={{ height: 64 }} /> {/* offset for fixed header */}
    </>
  );
}
