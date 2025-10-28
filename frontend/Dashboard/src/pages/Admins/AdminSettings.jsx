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
import { api, getUserData } from "../../lib/api";

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

export default function AdminSettings() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [verified, setVerified] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // cached/current user
  const [user, setUser] = useState(null);
  
  // Store photo data in state
  const [photoData, setPhotoData] = useState(null);
  const [photoMimeType, setPhotoMimeType] = useState(null);

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
      const { data } = await api.get("/api/admin/profile");
      if (data?.success && data?.data) {
        const profile = { ...data.data };
        
        // Handle photoData for display and storage
        if (profile.photoData) {
          console.log("[AdminSettings] photoData found, type:", typeof profile.photoData, "length:", profile.photoData?.length);
          
          let displayUrl = profile.photoData;
          let storeBase64 = profile.photoData;
          
          // If it's raw base64 (doesn't start with data:), construct the data URL
          if (!profile.photoData.startsWith('data:image')) {
            const mimeType = profile.photoMimeType || "image/jpeg";
            displayUrl = `data:${mimeType};base64,${profile.photoData}`;
            console.log("[AdminSettings] Constructed data URL for display");
            storeBase64 = profile.photoData; // Store raw base64
          } else {
            // It already has the data URL prefix, extract the raw base64
            const matches = profile.photoData.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
            if (matches) {
              storeBase64 = matches[1];
              displayUrl = profile.photoData;
            }
          }
          
          setAvatarUrl(displayUrl);
          setPhotoData(storeBase64);
          setPhotoMimeType(profile.photoMimeType || "image/jpeg");
          console.log("[AdminSettings] Avatar URL set, will display photo");
        } else if (profile.photoURL) {
          setAvatarUrl(profile.photoURL);
          setPhotoData(null);
          setPhotoMimeType(null);
        } else {
          console.log("[AdminSettings] No photo data found");
          setPhotoData(null);
          setPhotoMimeType(null);
        }
        
        if (profile.adminEmail && !profile.email) profile.email = profile.adminEmail;
        setVerified(determineVerified(profile));
        setUser(profile);
        form.setFieldsValue(profile);
        return profile;
      }
    } catch (err) {
      console.debug("loadProfile failed", err?.message);
    }
    return null;
  };

  // on mount: fetch from backend (user data is now in HTTP-only cookie)
  useEffect(() => {
    (async () => {
      try {
        const fresh = await loadProfile();
        if (fresh) {
          if (fresh.adminEmail && !fresh.email) fresh.email = fresh.adminEmail;
          setUser(fresh);
          if (fresh.photoURL) setAvatarUrl(fresh.photoURL);
          setVerified(determineVerified(fresh));
          form.setFieldsValue(fresh);
          setIsFormDirty(false);
        }
      } catch (err) {
        console.warn('Failed to fetch profile:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple function to check if form has changes
  const handleFormValuesChange = () => {
    setIsFormDirty(true);
  };

  /** Save profile */
  const onSave = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (payload.email && !payload.adminEmail) payload.adminEmail = payload.email;
      
      // Include photoData in payload if it exists
      if (photoData) {
        // Make sure we're sending just the base64 string, not the data URL
        let cleanBase64 = photoData;
        if (cleanBase64.includes('data:image')) {
          const matches = cleanBase64.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
          if (matches) {
            cleanBase64 = matches[1];
          }
        }
        payload.photoData = cleanBase64;
        payload.photoMimeType = photoMimeType || "image/jpeg";
        
        console.log("[AdminSettings] Saving profile with photo - size:", cleanBase64.length);
      }

      console.log("[AdminSettings] Saving profile with photoData:", !!payload.photoData);
      await api.put("/api/admin/profile", payload);
      message.success("Profile updated successfully!");

      const refreshed = await loadProfile();
      if (refreshed && determineVerified(refreshed)) setVerified(true);

      try {
        sessionStorage.setItem("user", JSON.stringify(refreshed || payload));
      } catch (_) {}
      
      setIsFormDirty(false);
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

      // Extract MIME type from data URL
      let mimeType = "image/jpeg";
      let base64String = b64;
      
      if (b64.includes(";base64,")) {
        const matches = b64.match(/^data:(image\/[a-zA-Z0-9+/.-]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64String = matches[2];
        }
      }

      // Store in state for saving later
      setPhotoData(base64String);
      setPhotoMimeType(mimeType);
      setIsFormDirty(true); // Mark form as dirty when photo changes

      console.log("[AdminSettings] Photo selected - MIME type:", mimeType, "Will save on 'Save changes' click");
      message.info("Photo selected. Click 'Save changes' to save to profile.");
    } catch (error) {
      console.error("Photo selection error:", error);
      message.error("Failed to select photo");
    }
  };

  // display name parity with VictimSettings
  const displayName = useMemo(() => {
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.adminRole || user.adminID || "admin";
    }
    const v = form.getFieldsValue();
    const combo = [v.firstName, v.lastName].filter(Boolean).join(" ") || v.adminRole || v.adminID;
    return combo || "admin";
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
                Manage your Admin profile and contact information.
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
                  src={avatarUrl}
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
            <Statistic title="adminRole" value={form.getFieldValue("adminRole") || "—"} />
          </Card>
          <Card className="stat-card">
            <Statistic title="Last Updated" value="Just now" />
          </Card>
        </div>

        {/* SETTINGS */}
        <Card className="main-card" bodyStyle={{ padding: screens.xs ? 16 : 24 }}>
          <div className="section-head">
            <span className="brand-dot" />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Account Settings
              </Title>
              <Text type="secondary">Update your Admin details and contact information.</Text>
            </div>
          </div>

          <Divider />

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
                  <Input maxLength={1} placeholder="M" style={{ color: '#000' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md ={12}>
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
                    disabled={!isFormDirty}
                    className="btn-primary"
                  >
                    Save changes
                  </Button>
                  <Button
                    onClick={async () => {
                      form.resetFields();
                      setIsFormDirty(false);
                      try {
                        const userData = await getUserData();
                        if (userData) setUser(userData);
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
