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
  HomeOutlined,
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
  purple: "#6C3CF0",
  green: "#4CAF50",
  red: "#f44336",
  soft: "#fff5f8",
  muted: "#6b7280",
  card: "rgba(255,255,255,0.85)",
};

export default function VictimSettings() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [verified, setVerified] = useState(false);
  const [form] = Form.useForm();

  // tolerantly determine verification from backend profile
  const determineVerified = (profile) => {
    if (!profile) return false;
    // common boolean flags
    if (typeof profile.isVerified === "boolean") return profile.isVerified;
    if (typeof profile.verified === "boolean") return profile.verified;
    if (typeof profile.emailVerified === "boolean") return profile.emailVerified;
    // string statuses
    const status = (profile.verificationStatus || profile.status || "").toString().toLowerCase();
    if (status) return status === "verified" || status === "active" || status === "confirmed";
    // fallback: presence of verification timestamp fields
    if (profile.verifiedAt || profile.verified_at || profile.emailVerifiedAt || profile.email_verified_at) return true;
    return false;
  };

  // Convert to Base64 for preview
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  // Load profile info
  const loadProfile = async () => {
    try {
      const { data } = await api.get("/api/victims/profile");
      if (data?.success && data?.data) {
        const profile = { ...data.data };
        if (profile.photoURL) setAvatarUrl(profile.photoURL);
        setVerified(determineVerified(profile));

        if (profile.emergencyContacts?.length) {
          const ec = profile.emergencyContacts[0];
          profile.emergencyContactName = ec.name;
          profile.emergencyContactRelationship = ec.relationship;
          profile.emergencyContactNumber = ec.contactNumber;
          profile.emergencyContactEmail = ec.email;
          profile.emergencyContactAddress = ec.address;
        }

        form.setFieldsValue(profile);
        return profile;
      }
    } catch (err) {
      message.error("Failed to load profile");
    }
    return null;
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Save profile
  const onSave = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };

      if (
        values.emergencyContactName ||
        values.emergencyContactNumber ||
        values.emergencyContactRelationship ||
        values.emergencyContactEmail ||
        values.emergencyContactAddress
      ) {
        payload.emergencyContacts = [
          {
            name: values.emergencyContactName || "",
            relationship: values.emergencyContactRelationship || "",
            contactNumber: values.emergencyContactNumber || "",
            email: values.emergencyContactEmail || "",
            address: values.emergencyContactAddress || "",
          },
        ];
      }

      await api.put("/api/victims/profile", payload);
      message.success("Profile updated successfully!");
      // refresh profile from backend to pick up any verification changes
      const refreshed = await loadProfile();
      if (refreshed && determineVerified(refreshed)) setVerified(true);
    } catch {
      message.error("Unable to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Upload avatar
  const onAvatarChange = async ({ file }) => {
    try {
      const b64 = await toBase64(file);
      setAvatarUrl(String(b64)); // instant preview

      const fd = new FormData();
      fd.append("avatar", file);

      const { data } = await api.post("/api/victims/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data?.url) setAvatarUrl(data.url);
      await api.put("/api/victims/profile", { photoURL: data?.url || b64 });

      // reload profile to ensure verification state is current
      await loadProfile();

      message.success("Profile photo updated");
    } catch {
      message.error("Failed to upload photo");
    }
  };

  const displayName = useMemo(() => {
    const v = form.getFieldsValue();
    const combo = [v.firstName, v.lastName].filter(Boolean).join(" ");
    return combo || "Anonymous User";
  }, [form]);

  // --- verification color (green when verified, red when not) ---
  const verColor = verified ? BRAND.green : BRAND.red;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <style>{`
        .page-wrap {
          width: 100%;
          max-width: 1120px;
          padding: ${screens.xs ? "12px" : "24px"};
        }

        /* HERO */
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

        /* Avatar Overlay */
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
          padding: 3px;
          display: grid;
          place-items: center;
          animation: slowspin 20s linear infinite;
        }
        .avatar-inner {
          width: 105px; height: 105px;
          border-radius: 50%;
          overflow: hidden;
          background: ${BRAND.soft};
          display: grid;
          place-items: center;
        }
        .change-avatar {
          position: absolute;
          right: -4px; bottom: -4px;
          border-radius: 50%;
          padding: 0;
          width: 32px; height: 32px;
          font-size: 14px;
          color: #fff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }

        /* Stats */
        .stats {
          margin-top: 88px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
        }
        .stat-card {
          flex: 1;
          min-width: 260px;
          border-radius: 20px;
          background: ${BRAND.card};
          text-align: center;
          box-shadow: 0 10px 25px rgba(16,24,40,0.08);
          border: 1px solid rgba(233,30,99,0.06);
          transition: transform 200ms ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
        }

        /* Settings */
        .main-card {
          margin-top: 20px;
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(16,24,40,0.08);
          border: 1px solid rgba(233,30,99,0.06);
          animation: fadeUp 400ms ease-out;
        }

        .section-head {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${BRAND.pink};
        }

        .btn-primary {
          background: ${BRAND.pink};
          border-color: ${BRAND.pink};
          border-radius: 12px;
          min-width: 170px;
          height: 40px;
          transition: transform 150ms ease;
        }
        .btn-primary:hover {
          transform: scale(1.02);
        }

        @keyframes slowspin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="page-wrap">
        {/* HERO */}
        <div className="hero">
          <div className="hero-inner">
            <div >
              <Title level={2} className="hero-title" style={{ minWidth: 0, color: "#fff" }}>{displayName}</Title>
              <Text className="hero-sub" style={{ minWidth: 0, color: "#fff" }}>Your safety & contact preferences in one place.</Text>
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
                {verified ? <CheckCircleTwoTone twoToneColor="#fff" /> : <CloseCircleTwoTone twoToneColor="#fff" />}{" "}
                {verified ? "Verified" : "Not Verified"}
              </Tag>

              <Button
                icon={<SafetyCertificateOutlined />}
                onClick={() => form.resetFields()}
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
                border: `3px solid ${verColor}25`
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
            <Statistic title="Trusted Contacts" value={1} suffix="/1" />
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
              <Title level={4} style={{ margin: 0 }}>Account Settings</Title>
              <Text type="secondary">
                Update your contact details and emergency contact
              </Text>
            </div>
          </div>

          <Divider />

          <Form layout="vertical" form={form} onFinish={onSave}>
            <Row gutter={[16, 12]}>
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
                <Form.Item name="contactNumber" label="Contact Number">
                  <Input prefix={<PhoneOutlined />} placeholder="+639123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="Email">
                  <Input prefix={<MailOutlined />} placeholder="you@example.com" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Divider plain orientation="left">Emergency Contact</Divider>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Name" name="emergencyContactName">
                  <Input prefix={<UserOutlined />} placeholder="Full name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Relationship" name="emergencyContactRelationship">
                  <Input placeholder="e.g. Mother, Friend" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Contact Number" name="emergencyContactNumber">
                  <Input prefix={<PhoneOutlined />} placeholder="09123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Email" name="emergencyContactEmail">
                  <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name="emergencyContactAddress">
                  <Input.TextArea rows={2} placeholder="Address (optional)" />
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
                  <Button onClick={() => form.resetFields()}>Discard</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>
    </div>
  );
}
