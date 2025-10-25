// src/pages/official/OfficialSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  Space,
  message,
  Grid,
  Avatar,
  Statistic,
  Divider,
  Tag,
  Upload,
  Tooltip,
} from "antd";
import {
  SafetyCertificateOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  CameraOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Title, Text } = Typography;

const BRAND = {
  pink: "#e91e63",
  violet: "#7A5AF8",
  green: "#4CAF50",
  red: "#f44336",
  soft: "#fff5f8",
  muted: "#6b7280",
  card: "rgba(255,255,255,0.85)",
};

export default function OfficialSettings() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [verified, setVerified] = useState(false);

  // cached/current user
  const [user, setUser] = useState(null);

  const [form] = Form.useForm();

  /** tolerant verification detector (parity with VictimSettings) */
  const determineVerified = (profile) => {
    if (!profile) return false;
    if (typeof profile.isVerified === "boolean") return profile.isVerified;
    if (typeof profile.verified === "boolean") return profile.verified;
    if (typeof profile.emailVerified === "boolean") return profile.emailVerified;
    const status = String(profile.verificationStatus || profile.status || "").toLowerCase();
    if (status) return ["verified", "active", "confirmed"].includes(status);
    if (profile.verifiedAt || profile.verified_at || profile.emailVerifiedAt || profile.email_verified_at) return true;
    return false;
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve(r.result);
      r.onerror = (e) => reject(e);
    });

  /** Load profile from API and update local state + form */
  const loadProfile = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      console.debug("[OfficialSettings] loadProfile: token exists?", !!token);
      if (!token) {
        console.warn("[OfficialSettings] No token in localStorage or sessionStorage");
      }
      
      const { data } = await api.get("/api/officials/profile");
      if (data?.success && data?.data) {
        const profile = { ...data.data };
        console.debug("[OfficialSettings] Profile loaded successfully:", profile);
        if (profile.officialEmail && !profile.email) profile.email = profile.officialEmail;
        if (profile.photoURL) setAvatarUrl(profile.photoURL);
        setVerified(determineVerified(profile));
        setUser(profile);
        form.setFieldsValue(profile);
        return profile;
      }
    } catch (err) {
      console.error("[OfficialSettings] loadProfile failed", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
    }
    return null;
  };

  // on mount: warm start from localStorage, then refresh from API
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.officialEmail && !cached.email) cached.email = cached.officialEmail;
        setUser(cached);
        if (cached.photoURL) setAvatarUrl(cached.photoURL);
        setVerified(determineVerified(cached));
        form.setFieldsValue(cached);
      }
    } catch (_) {}

    (async () => {
      const fresh = await loadProfile();
      if (fresh) {
        try {
          localStorage.setItem("user", JSON.stringify(fresh));
        } catch (_) {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Save profile */
  const onSave = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (payload.email && !payload.officialEmail) payload.officialEmail = payload.email;

      await api.put("/api/officials/profile", payload);
      message.success("Profile updated successfully!");

      const refreshed = await loadProfile();
      if (refreshed && determineVerified(refreshed)) setVerified(true);

      try {
        localStorage.setItem("user", JSON.stringify(refreshed || payload));
      } catch (_) {}
    } catch {
      message.error("Unable to update profile");
    } finally {
      setLoading(false);
    }
  };

  /** Upload avatar */
  const onAvatarChange = async ({ file }) => {
    try {
      const b64 = await toBase64(file);
      setAvatarUrl(String(b64)); // instant preview

      const fd = new FormData();
      fd.append("avatar", file);

      const { data } = await api.post("/api/officials/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data?.url) setAvatarUrl(data.url);
      await api.put("/api/officials/profile", { photoURL: data?.url || b64 });

      const fresh = await loadProfile();
      if (fresh) {
        try {
          localStorage.setItem("user", JSON.stringify(fresh));
        } catch (_) {}
      }

      message.success("Profile photo updated");
    } catch {
      message.error("Failed to upload photo");
    }
  };

  // display name parity with VictimSettings
  const displayName = useMemo(() => {
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.position || user.officialID || "Official";
    }
    const v = form.getFieldsValue();
    const combo = [v.firstName, v.lastName].filter(Boolean).join(" ") || v.position || v.officialID;
    return combo || "Official";
  }, [user, form]);

  const verColor = verified ? BRAND.green : BRAND.red;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <style>{`
        .page-wrap {
          width: 100%;
          max-width: 1120px;
          padding: ${screens.xs ? "12px" : "24px"};
        }

        /* HERO (same styling as VictimSettings) */
        .hero {
          position: relative;
          border-radius: 24px;
          overflow: visible;
          min-height: ${screens.md ? "220px" : "190px"};
          padding-bottom: 72px;
          box-shadow: 0 18px 40px rgba(16,24,40,0.14);
          background: linear-gradient(135deg, ${BRAND.violet}, ${BRAND.pink});
          animation: fadeUp 400ms ease-out;
        }
        .hero-inner {
          padding: ${screens.xs ? "22px" : "32px"};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .hero-title { margin: 0; color: #fff; }
        .hero-sub { margin: 6px 0 0; opacity: .95; }

        /* Avatar Overlay (centered circle with ring) */
        .avatar-wrap {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: -40px;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: #fff;
          display: grid;
          place-items: center;
          box-shadow: 0 18px 36px rgba(16,24,40,0.22);
          border: 8px solid #fff;
          z-index: 3;
          transition: transform 250ms ease;
        }
        .avatar-wrap:hover { transform: translateX(-50%) scale(1.02); }

        .avatar-ring {
          width: 115px; height: 115px; border-radius: 50%;
          padding: 3px; display: grid; place-items: center;
          animation: slowspin 20s linear infinite;
        }
        .avatar-inner {
          width: 105px; height: 105px; border-radius: 50%;
          overflow: hidden; background: ${BRAND.soft};
          display: grid; place-items: center;
        }
        .change-avatar {
          position: absolute; right: -4px; bottom: -4px;
          border-radius: 50%; padding: 0; width: 32px; height: 32px;
          font-size: 14px; color: #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }

        /* Stats (same visual as VictimSettings) */
        .stats {
          margin-top: 88px;
          display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;
        }
        .stat-card {
          flex: 1; min-width: 260px;
          border-radius: 20px;
          background: ${BRAND.card};
          text-align: center;
          box-shadow: 0 10px 25px rgba(16,24,40,0.08);
          border: 1px solid rgba(233,30,99,0.06);
          transition: transform 200ms ease;
        }
        .stat-card:hover { transform: translateY(-4px); }

        /* Main settings card */
        .main-card {
          margin-top: 20px;
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(16,24,40,0.08);
          border: 1px solid rgba(233,30,99,0.06);
          animation: fadeUp 400ms ease-out;
          background: ${BRAND.card};
        }

        .section-head { display: flex; align-items: center; gap: 10px; }
        .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: ${BRAND.pink}; }

        .btn-primary {
          background: ${BRAND.pink};
          border-color: ${BRAND.pink};
          border-radius: 12px;
          min-width: 170px;
          height: 40px;
          transition: transform 150ms ease;
          color: #fff;
          font-weight: 700;
        }
        .btn-primary:hover { transform: scale(1.02); }

        @keyframes slowspin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="page-wrap">
        {/* HERO */}
        <div className="hero">
          <div className="hero-inner">
            <div>
              <Title level={2} className="hero-title" style={{ color: "#fff" }}>
                {displayName}
              </Title>
              <Text className="hero-sub" style={{ color: "#fff" }}>
                Manage your official profile and contact information.
              </Text>
            </div>

            <Space>
              <Tag
                style={{
                  background: verColor,
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontWeight: 600,
                  border: `1px solid ${verColor}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {verified ? (
                  <CheckCircleTwoTone twoToneColor="#fff" />
                ) : (
                  <CloseCircleTwoTone twoToneColor="#fff" />
                )}{" "}
                {verified ? "Verified" : "Not Verified"}
              </Tag>

              <Button
                icon={<SafetyCertificateOutlined />}
                onClick={() => {
                  form.resetFields();
                  (async () => {
                    const fresh = await loadProfile();
                    if (fresh) setUser(fresh);
                  })();
                }}
                style={{
                  background: BRAND.pink,
                  borderColor: BRAND.pink,
                  color: "#fff",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                Reset
              </Button>
            </Space>
          </div>

          {/* Avatar */}
          <div className="avatar-wrap">
            <div
              className="avatar-ring"
              style={{
                background: `conic-gradient(from 220deg, ${verColor}, ${BRAND.pink}, ${verColor})`,
                border: `3px solid ${verColor}25`,
              }}
            >
              <div className="avatar-inner">
                <Avatar
                  size={96}
                  src={avatarUrl || undefined}
                  icon={<UserOutlined />}
                  style={{ background: BRAND.soft, color: verColor }}
                />
              </div>
            </div>
            <Upload
              showUploadList={false}
              accept="image/*"
              beforeUpload={() => false}
              onChange={({ file }) => file && onAvatarChange({ file })}
            >
              <Tooltip title="Change photo">
                <Button
                  className="change-avatar"
                  icon={<CameraOutlined />}
                  style={{ background: verColor }}
                />
              </Tooltip>
            </Upload>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <Card className="stat-card">
            <Statistic title="Profile Completeness" value={92} suffix="%" />
          </Card>
          <Card className="stat-card">
            <Statistic title="Role" value={form.getFieldValue("position") || "—"} />
          </Card>
          <Card className="stat-card">
            <Statistic title="Last Updated" value="Just now" />
          </Card>
        </div>

        {/* SETTINGS */}
        <Card className="main-card" styles={{ body: { padding: screens.xs ? 16 : 24 } }}>
          <div className="section-head">
            <span className="brand-dot" />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Account Settings
              </Title>
              <Text type="secondary">Update your official details and contact information.</Text>
            </div>
          </div>

          <Divider />

          <Form layout="vertical" form={form} onFinish={onSave}>
            <Row gutter={[16, 12]}>
              <Col xs={24} md={12}>
                <Form.Item name="officialID" label="Official ID">
                  <Input disabled prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="position" label="Position">
                  <Input placeholder="e.g. Barangay Captain" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="firstName" label="First Name">
                  <Input prefix={<UserOutlined />} placeholder="First name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="lastName" label="Last Name">
                  <Input prefix={<UserOutlined />} placeholder="Last name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="middleInitial" label="Middle Initial">
                  <Input maxLength={1} placeholder="M" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="contactNumber" label="Contact Number">
                  <Input prefix={<PhoneOutlined />} placeholder="+639123456789" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="email" label="Email">
                  <Input prefix={<MailOutlined />} placeholder="you@example.com" />
                </Form.Item>
              </Col>

              <Col xs={24} style={{ textAlign: "center", marginTop: 4 }}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="btn-primary"
                  >
                    Save changes
                  </Button>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      try {
                        const raw = localStorage.getItem("user");
                        if (raw) setUser(JSON.parse(raw));
                      } catch (_) {}
                    }}
                  >
                    Discard
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>
    </div>
  );
}
