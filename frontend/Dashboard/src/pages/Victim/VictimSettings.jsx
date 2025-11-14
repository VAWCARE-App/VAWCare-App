import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Row,
  Col,
  message,
  Grid,
  Avatar,
  Upload,
  Divider,
  Tag,
} from "antd";
import {
  SafetyCertificateOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  CameraOutlined,
  DownloadOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import InstallButton from "../../components/InstallButton";

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

export default function VictimSettings() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [photoMimeType, setPhotoMimeType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [profileData, setProfileData] = useState(null); // Add state to track profile data
  const [form] = Form.useForm();


  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve(r.result);
      r.onerror = (e) => reject(e);
    });

  const onAvatarChange = async ({ file }) => {
    try {
      // Fast preview using object URL (instant), compute base64 in background
      if (previewObjectUrl) {
        try { URL.revokeObjectURL(previewObjectUrl); } catch (_) { }
      }
      const objUrl = URL.createObjectURL(file);
      setPreviewObjectUrl(objUrl);
      setAvatarUrl(objUrl);
      setSelectedFile(file);
      setIsFormDirty(true);
      message.info('Photo selected. Click "Save changes" to save to profile.');

      // compute base64 asynchronously and store for eventual save
      try {
        const b64 = await toBase64(file);
        let mimeType = file.type || "image/jpeg";
        let base64String = b64;
        if (b64.includes(";base64,")) {
          const matches = b64.match(/^data:(image\/[a-zA-Z0-9+/.-]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64String = matches[2];
          }
        }
        setPhotoData(base64String);
        setPhotoMimeType(mimeType);
      } catch (err) {
        console.debug('Failed to compute base64 preview in background', err && err.message);
      }
    } catch (err) {
      console.error('Avatar selection error', err);
      message.error('Failed to select photo');
    }
  };

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


  // Load profile info
  const loadProfile = async () => {
    try {
      const { data } = await api.get("/api/victims/profile");
      console.log("[VictimSettings] API response:", data);
      
      if (data?.success && data?.data) {
        const profile = { ...data.data };
        console.log("[VictimSettings] Profile data:", profile);

        setVerified(determineVerified(profile));

        if (profile.emergencyContacts?.length) {
          const ec = profile.emergencyContacts[0];
          profile.emergencyContactName = ec.name;
          profile.emergencyContactRelationship = ec.relationship;
          profile.emergencyContactNumber = ec.contactNumber;
          profile.emergencyContactEmail = ec.email;
          profile.emergencyContactAddress = ec.address;
        }

        console.log("[VictimSettings] Setting form values:", profile);
        form.setFieldsValue(profile);
        setProfileData(profile); // Update state to trigger displayName recalculation
        return profile;
      } else {
        console.warn("[VictimSettings] No data in response:", data);
      }
    } catch (err) {
      console.error("[VictimSettings] Failed to load profile:", err);
      message.error("Failed to load profile");
    }
    return null;
  };

  const loadAvatar = async () => {
    try {
      const { data } = await api.get('/api/victims/profile/photo');
      if (data?.success && data?.data && data.data.photoData) {
        const mime = data.data.photoMimeType || 'image/jpeg';
        const full = data.data.photoData.startsWith('data:') ? data.data.photoData : `data:${mime};base64,${data.data.photoData}`;
        setAvatarUrl(full);
        setPhotoData(data.data.photoData.startsWith('data:') ? data.data.photoData.split(',')[1] : data.data.photoData);
        setPhotoMimeType(data.data.photoMimeType || 'image/jpeg');
      }
    } catch (err) {
      console.debug('[VictimSettings] loadAvatar failed', err?.message);
    }
  };

  useEffect(() => {
    console.log("[VictimSettings] useEffect - Component mounted");
    
    // Immediately load profile from server (don't rely on sessionStorage)
    (async () => {
      try {
        console.log("[VictimSettings] Fetching profile from server...");
        const fresh = await loadProfile();
        if (fresh) {
          console.log("[VictimSettings] Profile loaded successfully:", fresh);
          form.setFieldsValue(fresh);
          setVerified(determineVerified(fresh));
          // try to load avatar for this victim
          try { 
            await loadAvatar(); 
          } catch (e) { 
            console.debug('[VictimSettings] Avatar load failed:', e?.message);
          }
        } else {
          console.warn("[VictimSettings] No profile data returned");
        }
      } catch (err) {
        console.error('[VictimSettings] Profile refresh failed:', err);
        message.error("Failed to load profile. Please try refreshing the page.");
      }
    })();
    
    setIsFormDirty(false);
    
    return () => {
      // cleanup any object URL created for preview
      try { if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); } } catch (_) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple function to check if form has changes
  const handleFormValuesChange = () => {
    setIsFormDirty(true);
  };

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

      // include photo data if present (admin-style save)
      // If user selected a file but base64 hasn't been computed yet, compute it now
      if (!photoData && selectedFile) {
        try {
          const b64data = await toBase64(selectedFile);
          let mime = selectedFile.type || 'image/jpeg';
          let cleanBase64 = b64data;
          if (cleanBase64.includes('data:image')) {
            const matches = cleanBase64.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
            if (matches) cleanBase64 = matches[1];
          }
          payload.photoData = cleanBase64;
          payload.photoMimeType = mime;
        } catch (e) {
          console.debug('Failed to compute photo base64 on save', e && e.message);
        }
      } else if (photoData) {
        let cleanBase64 = photoData;
        if (cleanBase64.includes('data:image')) {
          const matches = cleanBase64.match(/^data:image\/[a-zA-Z0-9+/.-]+;base64,(.+)$/);
          if (matches) cleanBase64 = matches[1];
        }
        payload.photoData = cleanBase64;
        payload.photoMimeType = photoMimeType || 'image/jpeg';
      }

      await api.put("/api/victims/profile", payload);
      message.success("Profile updated successfully!");
      // refresh profile from backend to pick up any verification changes
      const refreshed = await loadProfile();
      if (refreshed && determineVerified(refreshed)) setVerified(true);

      setIsFormDirty(false);
    } catch {
      message.error("Unable to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Photo upload removed

  const displayName = useMemo(() => {
    if (profileData) {
      const combo = [profileData.firstName, profileData.lastName].filter(Boolean).join(" ");
      return combo || "Anonymous User";
    }
    return "Anonymous User";
  }, [profileData]);

  // --- verification color (green when verified, red when not) ---
  const verColor = verified ? BRAND.green : BRAND.red;

  return (
    <div style={{ minHeight: "100vh", background: BRAND.pageBg, position: "relative", paddingBottom: 80 }}>
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
          background:linear-gradient(135deg, ${verColor}, ${BRAND.pink});
          padding:2px; box-shadow: 0 4px 12px rgba(122,90,248,0.15);
        }
        .avatar-shell .inner{
          width:100%; height:100%; border-radius:50%; overflow:hidden; background:#f8f9fa; display:grid; place-items:center;
        }

        .name-role{ display:flex; flex-direction:column; }
        .name-role .name{ margin:0; color:var(--panel-ink); font-weight:800; letter-spacing:.2px; }
        .name-role .role{ margin-top:2px; color:var(--muted-ink); font-size:13px; }

        .panel-actions{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
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
                      style={{ background: "#f3f4f6", color: verColor }}
                    />
                  </div>
                </div>

                <div className="name-role">
                  <Title level={4} className="name">
                    {displayName}
                  </Title>
                  <Tag
                    style={{
                      background: verColor,
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "2px 10px",
                      fontWeight: 600,
                      border: `1px solid ${verColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                    }}
                  >
                    {verified ? <CheckCircleTwoTone twoToneColor="#fff" /> : <CloseCircleTwoTone twoToneColor="#fff" />}
                    {verified ? "Verified" : "Not Verified"}
                  </Tag>
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
                      await loadProfile();
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
                    {profileData?.victimEmail || "—"}
                  </div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Phone Number</div>
                  <div className="value">{profileData?.contactNumber || "(—)"}</div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Role</div>
                  <div className="value">Victim</div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Trusted Contacts</div>
                  <div className="value">
                    {profileData?.emergencyContacts?.length ? "1/1" : "0/1"}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards - Removed Profile Completeness and Last Updated */}
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
                  Update your contact details and emergency contact information.
                </Text>
              </div>
            </div>

            <Divider style={{ borderColor: "rgba(122,90,248,0.15)" }} />

            <Form layout="vertical" form={form} onFinish={onSave} onValuesChange={handleFormValuesChange}>
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
                  <Form.Item name="victimEmail" label="Email">
                    <Input prefix={<MailOutlined />} placeholder="you@example.com" />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Divider plain orientation="left" style={{ color: BRAND.violet, fontWeight: 600 }}>
                    Emergency Contact
                  </Divider>
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
              </Row>
            </Form>

            <InstallButton />
          </Card>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.98)",
            borderTop: `1px solid ${BRAND.softBorder}`,
            padding: "12px 24px",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
            zIndex: 100,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button
              icon={<CloseOutlined />}
              onClick={async () => {
                form.resetFields();
                setIsFormDirty(false);
                try {
                  await loadProfile();
                } catch { }
              }}
              size="large"
              style={{ borderRadius: 10 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
              disabled={!isFormDirty}
              size="large"
              style={{
                background: BRAND.violet,
                borderColor: BRAND.violet,
                borderRadius: 10,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
