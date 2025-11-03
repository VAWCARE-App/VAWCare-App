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
  Divider,
  Tag,
  Upload,
  Tooltip,
  Layout,
} from "antd";
import {
  SafetyCertificateOutlined,
  MailOutlined,
  UserOutlined,
  CameraOutlined,
  DownloadOutlined,
  PhoneOutlined,
  MenuOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { api, getUserData } from "../../lib/api";

const { Header, Content } = Layout;

const { Title, Text } = Typography;

const BRAND = {
  pink: "#e91e63",
  violet: "#7A5AF8",
  green: "#4CAF50",
  red: "#f44336",
  soft: "#fff5f8",
  muted: "#6b7280",
  card: "rgba(255,255,255,0.85)",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  softBorder: "rgba(122,90,248,0.18)",
};

export default function AdminSettings() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // cached/current user
  const [user, setUser] = useState(null);

  // photo data
  const [photoData, setPhotoData] = useState(null);
  const [photoMimeType, setPhotoMimeType] = useState(null);

  const [form] = Form.useForm();

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve(r.result);
      r.onerror = (e) => reject(e);
    });

  const loadProfile = async () => {
    try {
      const { data } = await api.get("/api/admin/profile");
      if (data?.success && data?.data) {
        const profile = { ...data.data };

        if (profile.photoData) {
          let displayUrl = profile.photoData;
          let storeBase64 = profile.photoData;

          if (!profile.photoData.startsWith("data:image")) {
            const mimeType = profile.photoMimeType || "image/jpeg";
            displayUrl = `data:${mimeType};base64,${profile.photoData}`;
            storeBase64 = profile.photoData;
          } else {
            const m = profile.photoData.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
            if (m) {
              storeBase64 = m[1];
              displayUrl = profile.photoData;
            }
          }

          setAvatarUrl(displayUrl);
          setPhotoData(storeBase64);
          setPhotoMimeType(profile.photoMimeType || "image/jpeg");
        } else if (profile.photoURL) {
          setAvatarUrl(profile.photoURL);
          setPhotoData(null);
          setPhotoMimeType(null);
        } else {
          setPhotoData(null);
          setPhotoMimeType(null);
        }

        if (profile.adminEmail && !profile.email) profile.email = profile.adminEmail;

        setUser(profile);
        form.setFieldsValue(profile);
        return profile;
      }
    } catch (err) {
      console.debug("loadProfile failed", err?.message);
    }
    return null;
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        form.setFieldsValue(parsed);
        if (parsed.photoURL) setAvatarUrl(parsed.photoURL);
        if (parsed.photoData) {
          const mime = parsed.photoMimeType || "image/jpeg";
          setAvatarUrl(
            parsed.photoData.startsWith("data:")
              ? parsed.photoData
              : `data:${mime};base64,${parsed.photoData}`
          );
          setPhotoData(parsed.photoData.startsWith("data:") ? parsed.photoData.split(",")[1] : parsed.photoData);
          setPhotoMimeType(parsed.photoMimeType || "image/jpeg");
        }
        setIsFormDirty(false);
      }
    } catch {}

    (async () => {
      const fresh = await loadProfile();
      if (fresh) {
        if (fresh.adminEmail && !fresh.email) fresh.email = fresh.adminEmail;
        setUser(fresh);
        form.setFieldsValue(fresh);
        setIsFormDirty(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormValuesChange = () => setIsFormDirty(true);

  const onSave = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (payload.email && !payload.adminEmail) payload.adminEmail = payload.email;

      if (photoData) {
        let cleanBase64 = photoData;
        const m = cleanBase64.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
        if (m) cleanBase64 = m[1];
        payload.photoData = cleanBase64;
        payload.photoMimeType = photoMimeType || "image/jpeg";
      }

      await api.put("/api/admin/profile", payload);
      message.success("Profile updated successfully!");

      const refreshed = await loadProfile();
      if (refreshed) {
        if (refreshed.adminEmail && !refreshed.email) refreshed.email = refreshed.adminEmail;
        setUser(refreshed);
        form.setFieldsValue(refreshed);
      }

      try {
        sessionStorage.setItem("user", JSON.stringify(refreshed || payload));
      } catch {}

      setIsFormDirty(false);
    } catch {
      message.error("Unable to update profile");
    } finally {
      setLoading(false);
    }
  };

  const onAvatarChange = async ({ file }) => {
    try {
      const b64 = await toBase64(file);
      setAvatarUrl(String(b64));

      let mimeType = "image/jpeg";
      let base64String = b64;
      const m = b64.match(/^data:(image\/[a-zA-Z0-9+/.-]+);base64,(.+)$/);
      if (m) {
        mimeType = m[1];
        base64String = m[2];
      }

      setPhotoData(base64String);
      setPhotoMimeType(mimeType);
      setIsFormDirty(true);
      message.info("Photo selected. Click 'Save changes' to apply.");
    } catch (e) {
      console.error("Photo selection error:", e);
      message.error("Failed to select photo");
    }
  };

  const displayName = useMemo(() => {
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.adminRole || user.adminID || "admin";
    }
    const v = form.getFieldsValue();
    const combo = [v.firstName, v.lastName].filter(Boolean).join(" ") || v.adminRole || v.adminID;
    return combo || "admin";
  }, [user, form]);

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.pageBg }}>
      {/* Header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.softBorder}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* Sidebar toggle visible on small devices */}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: screens.md ? 40 : 36,
                height: screens.md ? 40 : 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            />
          )}

          <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
            Account Settings
          </Title>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<CloseOutlined />}
            onClick={async () => {
              form.resetFields();
              setIsFormDirty(false);
              try {
                const userData = await getUserData();
                if (userData) setUser(userData);
              } catch {}
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={loading}
            disabled={!isFormDirty}
            style={{ background: BRAND.violet, borderColor: BRAND.violet }}
          >
            Save Changes
          </Button>
        </div>
      </Header>

      <Content>
          <div style={{ display: "flex", justifyContent: "center" }}>
      <style>{`
        :root {
          /* Light theme matching AdminDashboard overview cards */
          --panel-bg: #ffffff;
          --panel-ink: #333333;
          --muted-ink: ${BRAND.muted};
          --chip-bg: #F8F4FF;
          --chip-ink: #333333;
          --soft-border: rgba(122,90,248,0.12);
        }

        .page-wrap{ width:100%; max-width:1120px; padding:${screens.xs ? "12px" : "24px"}; }

        .profile-panel{
          position:relative; background:var(--panel-bg); color:var(--panel-ink);
          border:1px solid var(--soft-border); border-radius:22px;
          padding:${screens.sm ? "26px" : "20px"};
          box-shadow: 0 2px 12px rgba(122,90,248,0.08);
        }

        .panel-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .panel-left{ display:flex; align-items:center; gap:16px; min-width:260px; }

        .avatar-shell{
          position:relative; width:72px; height:72px; border-radius:50%;
          display:grid; place-items:center;
          background:linear-gradient(135deg, ${BRAND.violet}, ${BRAND.pink});
          padding:2px; box-shadow: 0 4px 12px rgba(122,90,248,0.15);
        }
        .avatar-shell .inner{
          width:100%; height:100%; border-radius:50%; overflow:hidden; background:#f8f9fa; display:grid; place-items:center;
        }

        /* REMOVED the .avatar-uploader badge (no overlay on the photo) */

        .name-role{ display:flex; flex-direction:column; }
        .name-role .name{ margin:0; color:var(--panel-ink); font-weight:800; letter-spacing:.2px; }
        .name-role .role{ margin-top:2px; color:var(--muted-ink); font-size:13px; }

        .panel-actions{ display:flex; align-items:center; gap:10px; }
        .soft-btn{
          height:36px; border-radius:10px; padding:0 12px;
          background:var(--chip-bg); color:var(--chip-ink); border:1px solid var(--soft-border);
        }
        .download-btn{
          height:36px; border-radius:12px; padding:0 14px;
          background:${BRAND.green}; color:#fff; font-weight:700; border:1px solid rgba(76,175,80,0.3);
          box-shadow:0 2px 8px rgba(76,175,80,0.2);
        }

        .meta-grid{
          margin-top:18px; display:grid;
          grid-template-columns:repeat(${screens.lg ? 4 : screens.md ? 2 : 1}, 1fr);
          gap:12px;
        }
        .meta-chip{
          display:flex; gap:12px; align-items:center;
          background:var(--chip-bg); border:1px solid var(--soft-border);
          border-radius:14px; padding:14px 16px; color:var(--chip-ink);
          box-shadow: 0 1px 4px rgba(122,90,248,0.05);
        }
        .meta-chip .label{ font-size:12px; color:var(--muted-ink); text-transform: uppercase; font-weight: 600; }
        .meta-chip .value{ font-weight:700; color:var(--panel-ink); font-size: 14px; }

        .main-card{
          margin-top:18px; border-radius:18px; background:rgba(255,255,255,0.95);
          color:#333; border:1px solid rgba(122,90,248,0.15);
          box-shadow:0 8px 24px rgba(122,90,248,0.12), 0 2px 8px rgba(233,30,99,0.08);
        }

        .section-head{ display:flex; align-items:center; gap:10px; }
        .brand-dot{ width:10px; height:10px; border-radius:50%; background:${BRAND.pink}; }

        .btn-primary{
          background:${BRAND.violet}; border-color:${BRAND.violet};
          border-radius:12px; min-width:170px; height:40px; color:#fff; font-weight:700;
        }

        .ant-input, .ant-input-affix-wrapper{
          background:#fff !important; color:#333 !important;
          border-color: rgba(122,90,248,0.2) !important;
        }
        .ant-input::placeholder{ color:#94a3b8 !important; }
        
        /* Typography colors - scoped to page-wrap to not affect header */
        .page-wrap .ant-typography, 
        .page-wrap .ant-form-item-label > label { color:#333 !important; }
        
        .ant-card { background: transparent; }
        .section-head .ant-typography { color:${BRAND.violet} !important; }
      `}</style>

      <div className="page-wrap">
        {/* ===== PROFILE PANEL ===== */}
        <div className="profile-panel">
          <div className="panel-top">
            {/* Left: avatar + name/role */}
            <div className="panel-left">
              <div className="avatar-shell">
                <div className="inner">
                  <Avatar
                    size={68}
                    src={avatarUrl}
                    icon={<UserOutlined />}
                    style={{ background: "#f3f4f6", color: BRAND.violet }}
                  />
                </div>
              </div>

              <div className="name-role">
                <Title level={4} className="name">
                  {displayName}
                </Title>
                <Text className="role">
                  {form.getFieldValue("adminRole") || user?.adminRole || "Administrator"}
                </Text>
              </div>
            </div>

            {/* Right: actions (upload moved here) */}
            <div className="panel-actions">
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={() => false}
                onChange={({ file }) => file && onAvatarChange({ file })}
              >
                <Button className="soft-btn" icon={<CameraOutlined />}>
                  Change Photo
                </Button>
              </Upload>

              <Button className="download-btn" icon={<DownloadOutlined />}>
                Download Info
              </Button>

              <Button
                icon={<SafetyCertificateOutlined />}
                onClick={() => {
                  form.resetFields();
                  (async () => {
                    const fresh = await loadProfile();
                    if (fresh) setUser(fresh);
                  })();
                }}
                className="soft-btn"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Meta chips */}
          <div className="meta-grid">
            <div className="meta-chip">
              <div>
                <div className="label">Email Address</div>
                <div className="value">
                  {form.getFieldValue("email") || user?.email || user?.adminEmail || "—"}
                </div>
              </div>
            </div>

            <div className="meta-chip">
              <div>
                <div className="label">Phone Number</div>
                <div className="value">{user?.phoneNumber || user?.phone || "(—)"}</div>
              </div>
            </div>

            <div className="meta-chip">
              <div>
                <div className="label">Admin ID</div>
                <div className="value">{form.getFieldValue("adminID") || user?.adminID || "—"}</div>
              </div>
            </div>

            <div className="meta-chip">
              <div>
                <div className="label">Role</div>
                <div className="value">
                  {form.getFieldValue("adminRole") || user?.adminRole || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SETTINGS ===== */}
        <Card className="main-card" bodyStyle={{ padding: screens.xs ? 16 : 24 }}>
          <div className="section-head">
            <span className="brand-dot" />
            <div>
              <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
                Account Settings
              </Title>
              <Text style={{ color: BRAND.muted }}>
                Update your Admin details and contact information.
              </Text>
            </div>
          </div>

          <Divider style={{ borderColor: "rgba(122,90,248,0.15)" }} />

          <Form layout="vertical" form={form} onFinish={onSave} onValuesChange={handleFormValuesChange}>
            <Row gutter={[16, 12]}>
              <Col xs={24} md={12}>
                <Form.Item name="adminID" label="Admin ID">
                  <Input disabled prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="adminRole" label="adminRole">
                  <Input disabled prefix={<UserOutlined />} />
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
                <Form.Item name="email" label="Email">
                  <Input prefix={<MailOutlined />} placeholder="you@example.com" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="phoneNumber" label="Phone Number">
                  <Input prefix={<PhoneOutlined />} placeholder="+1 (234) 567-8900" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>
        </div>
      </Content>
    </Layout>
  );
}
