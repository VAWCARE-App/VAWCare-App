import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Card,
  Typography,
  Space,
  Button,
  Descriptions,
  Skeleton,
  Grid,
  Tooltip,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  CompassOutlined,
  MailOutlined,
  CopyOutlined,
  PushpinTwoTone,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ScaleControl,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";

const { Content } = Layout;
const { Title, Text } = Typography;

const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  soft: "rgba(255,255,255,0.85)",
  muted: "#6b7280",
};

// 📍 Barangay Bonfal Proper coordinates
const BRGY_LOCATION = { lat: 16.4990, lng: 121.1771 };
const BRGY_NAME = "Barangay Bonfal Proper, Nueva Vizcaya, PH";

/* Pink barangay pin */
const pinkPin = new L.DivIcon({
  className: "",
  html: `
    <svg width="34" height="50" viewBox="0 0 34 50" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)" />
      </filter></defs>
      <path d="M17 0c9.4 0 17 7.6 17 17 0 11.6-14.4 27.5-16.1 29.3a1.3 1.3 0 0 1-1.8 0C14.4 44.5 0 28.6 0 17 0 7.6 7.6 0 17 0z" fill="${BRAND.pink}" filter="url(#shadow2)"/>
      <circle cx="17" cy="17" r="7.5" fill="#fff"/>
    </svg>
  `,
  iconSize: [34, 50],
  iconAnchor: [17, 48],
  popupAnchor: [0, -40],
});

export default function VictimBarangay() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  // Fetch barangay info
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/victim/barangay").catch(() => ({ data: {} }));
        setInfo(
          data?.data || {
            name: "Barangay Bonfal Proper",
            captain: "—",
            address: BRGY_NAME,
            email: "barangayvawcdesk@email.com",
            officeHours: "8:00 AM – 5:00 PM (Mon–Fri)",
          }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mapsHref = useMemo(
    () => `https://www.google.com/maps?q=${BRGY_LOCATION.lat},${BRGY_LOCATION.lng}`,
    []
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#faf7ff,#fff)" }}>
      <Content style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1080 }}>
          <style>{`
            .hero {
              position: relative;
              border-radius: 24px;
              overflow: hidden;
              background: linear-gradient(180deg, #fff1f7 0%, #ffe5f1 40%, #f4eaff 100%);
              color: #6B49F6;
              padding: ${screens.xs ? "20px" : "32px"};
              margin-bottom: 24px;
              animation: fadeUp .5s ease-out;
              box-shadow: 0 20px 40px rgba(122,90,248,0.25);
            }
            .info-card {
              border-radius: 18px;
              background: rgba(255,255,255,0.9);
              border: 1px solid rgba(122,90,248,0.18);
              box-shadow: 0 24px 48px rgba(122,90,248,0.08);
              transition: all .25s ease;
            }
            .info-card:hover { transform: translateY(-3px); box-shadow: 0 28px 56px rgba(122,90,248,0.10); }
            .btn-brand { background: ${BRAND.violet}; border-color: ${BRAND.violet}; color: #fff; border-radius: 12px; }
            .leaflet-container { width: 100% !important; height: 420px !important; border-radius: 16px; }
            .map-shell { margin-top: 10px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 24px rgba(0,0,0,0.14); }
            @keyframes fadeUp { from { opacity:0; transform: translateY(20px) } to { opacity:1; transform: translateY(0) } }
          `}</style>

          {/* HERO */}
          <div className="hero">
            <Space direction="vertical" size={4}>
              <Title level={2} style={{ color: "#6B49F6", margin: 0 }}>
                Barangay Hall Locator
              </Title>
              <Text style={{ color: "#6f6f6f" }}>
                Official location of Barangay Bonfal Proper Hall.
              </Text>
            </Space>
          </div>

          {/* MAP CARD */}
          <Card className="info-card" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Title level={4} style={{ margin: 0 }}>
                <EnvironmentOutlined /> {BRGY_NAME}
              </Title>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button icon={<CompassOutlined />} href={mapsHref} target="_blank">
                  Open in Google Maps
                </Button>
                <Tooltip title="Copy coordinates">
                  <Button
                    shape="circle"
                    icon={<PushpinTwoTone twoToneColor={BRAND.pink} />}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(`${BRGY_LOCATION.lat}, ${BRGY_LOCATION.lng}`)
                        .then(() => message.success("Copied!"))
                        .catch(() => message.error("Failed to copy"))
                    }
                  />
                </Tooltip>
              </div>

              <div className="map-shell">
                <MapContainer
                  center={[BRGY_LOCATION.lat, BRGY_LOCATION.lng]}
                  zoom={17}
                  scrollWheelZoom
                  zoomAnimation
                  fadeAnimation
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    detectRetina
                  />
                  <ZoomControl position="topright" />
                  <ScaleControl position="bottomleft" />
                  <Marker position={[BRGY_LOCATION.lat, BRGY_LOCATION.lng]} icon={pinkPin}>
                    <Popup>
                      📍 Barangay Bonfal Proper Hall
                      <br />
                      Nueva Vizcaya, Philippines
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </Space>
          </Card>

          {/* BARANGAY DETAILS */}
          <Card className="info-card">
            {loading ? (
              <Skeleton active />
            ) : (
              <Descriptions
                title={<Text strong style={{ fontSize: 18 }}>Barangay Information</Text>}
                column={screens.md ? 2 : 1}
                labelStyle={{ fontWeight: 600 }}
              >
                <Descriptions.Item label="Barangay">{info?.name}</Descriptions.Item>
                <Descriptions.Item label="Captain / Officer">{info?.captain}</Descriptions.Item>
                <Descriptions.Item label="Office Hours">{info?.officeHours}</Descriptions.Item>
                <Descriptions.Item label="Address">{info?.address}</Descriptions.Item>
                <Descriptions.Item label="Email">
                  <Space>
                    {info?.email}
                    <Tooltip title="Copy email">
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          navigator.clipboard
                            .writeText(info?.email || "")
                            .then(() => message.success("Copied!"))
                            .catch(() => message.error("Failed to copy"))
                        }
                      />
                    </Tooltip>
                    <Button size="small" icon={<MailOutlined />} href={`mailto:${info?.email}`}>
                      Email
                    </Button>
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
