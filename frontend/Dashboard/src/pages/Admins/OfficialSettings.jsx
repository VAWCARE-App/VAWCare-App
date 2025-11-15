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
    PhoneOutlined,
    UserOutlined,
    CameraOutlined,
    DownloadOutlined,
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

  export default function OfficialSettings() {
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
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewObjectUrl, setPreviewObjectUrl] = useState(null);

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
        const token = sessionStorage.getItem("token") || sessionStorage.getItem("token");
        console.debug("[OfficialSettings] loadProfile: token exists?", !!token);
        if (!token) {
          console.warn("[OfficialSettings] No token in sessionStorage");
        }
        
        const { data } = await api.get("/api/officials/profile");
        if (data?.success && data?.data) {
          const profile = { ...data.data };
          console.debug("[OfficialSettings] Profile loaded successfully:", profile);
          
          // Handle photoData for display and storage
          if (profile.photoData) {
            console.log("[OfficialSettings] photoData found, type:", typeof profile.photoData, "length:", profile.photoData?.length);
            
            let displayUrl = profile.photoData;
            let storeBase64 = profile.photoData;
            
            // If it's raw base64 (doesn't start with data:), construct the data URL
            if (!profile.photoData.startsWith('data:image')) {
              const mimeType = profile.photoMimeType || "image/jpeg";
              displayUrl = `data:${mimeType};base64,${profile.photoData}`;
              console.log("[OfficialSettings] Constructed data URL for display");
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
            console.log("[OfficialSettings] Avatar URL set, will display photo");
          } else if (profile.photoURL) {
            setAvatarUrl(profile.photoURL);
            setPhotoData(null);
            setPhotoMimeType(null);
          } else {
            setPhotoData(null);
            setPhotoMimeType(null);
          }
          
          if (profile.officialEmail && !profile.email) profile.email = profile.officialEmail;
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

    const loadAvatar = async () => {
      try {
        const { data } = await api.get('/api/officials/profile/photo');
        if (data?.success && data?.data && data.data.photoData) {
          const mime = data.data.photoMimeType || 'image/jpeg';
          setAvatarUrl(data.data.photoData.startsWith('data:') ? data.data.photoData : `data:${mime};base64,${data.data.photoData}`);
          setPhotoData(data.data.photoData.startsWith('data:') ? data.data.photoData.split(',')[1] : data.data.photoData);
          setPhotoMimeType(data.data.photoMimeType || 'image/jpeg');
        }
      } catch (err) {
        console.debug('[OfficialSettings] loadAvatar failed', err?.message);
      }
    };

    // on mount: show cached profile immediately (if available) then refresh from backend
    useEffect(() => {
      try {
        const cached = sessionStorage.getItem("user");
        if (cached) {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          form.setFieldsValue(parsed);
          
          // Handle cached photo data
          if (parsed.photoData) {
            const mime = parsed.photoMimeType || "image/jpeg";
            const displayUrl = parsed.photoData.startsWith('data:') 
              ? parsed.photoData 
              : `data:${mime};base64,${parsed.photoData}`;
            setAvatarUrl(displayUrl);
            
            const base64Only = parsed.photoData.startsWith('data:') 
              ? parsed.photoData.split(',')[1] 
              : parsed.photoData;
            setPhotoData(base64Only);
            setPhotoMimeType(mime);
          } else if (parsed.photoURL) {
            setAvatarUrl(parsed.photoURL);
          }
          
          setVerified(determineVerified(parsed));
          setIsFormDirty(false);
        }
      } catch (e) {
        console.warn('[OfficialSettings] Failed to parse cached user:', e);
      }

      // Fetch fresh data from backend
      (async () => {
        try {
          const fresh = await loadProfile();
          if (fresh) {
            if (fresh.officialEmail && !fresh.email) fresh.email = fresh.officialEmail;
            setUser(fresh);
            setVerified(determineVerified(fresh));
            form.setFieldsValue(fresh);
            setIsFormDirty(false);
            
            // try to load avatar
            try { await loadAvatar(); } catch (e) { /* ignore avatar load errors */ }
            
            // Update sessionStorage with fresh data
            try {
              sessionStorage.setItem("user", JSON.stringify(fresh));
            } catch (_) {}
          }
        } catch (err) {
          console.warn('[OfficialSettings] Failed to fetch profile:', err);
        }
      })();
      
      return () => {
        // cleanup any object URL created for preview
        try { if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); } } catch (_) {}
      };
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
        if (payload.email && !payload.officialEmail) payload.officialEmail = payload.email;
        
        // Don't send position - it should not be editable
        delete payload.position;
        
        // include photo data if present (VictimSettings-style save)
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
            console.log("[OfficialSettings] Computed photo base64 on save - size:", cleanBase64.length);
          } catch (e) {
            console.debug('Failed to compute photo base64 on save', e && e.message);
          }
        } else if (photoData) {
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
          
          console.log("[OfficialSettings] Saving profile with photo - size:", cleanBase64.length);
        }

        console.log("[OfficialSettings] Saving profile with photoData:", !!payload.photoData);
        await api.put("/api/officials/profile", payload);
        message.success("Profile updated successfully!");

        // Reload the profile to get the saved data including photo
        const refreshed = await loadProfile();
        if (refreshed) {
          if (refreshed.officialEmail && !refreshed.email) refreshed.email = refreshed.officialEmail;
          setUser(refreshed);
          setVerified(determineVerified(refreshed));
          form.setFieldsValue(refreshed);
          
          // Update sessionStorage with the refreshed data
          try {
            sessionStorage.setItem("user", JSON.stringify(refreshed));
          } catch (_) {}
        }
        
        setIsFormDirty(false);
      } catch (err) {
        console.error("[OfficialSettings] Save failed:", err);
        message.error("Unable to update profile");
      } finally {
        setLoading(false);
      }
    };

    /** Upload avatar */
    const onAvatarChange = async ({ file }) => {
      try {
        // Fast preview using object URL (instant), compute base64 in background
        if (previewObjectUrl) {
          try { URL.revokeObjectURL(previewObjectUrl); } catch (_) {}
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
                  minWidth: screens.md ? 40 : 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: "#ffffffcc",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                  padding: 0,
                  fontSize: 18,
                }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
                Official Settings
              </Title>
              {screens.md && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Manage your official profile and contact information.
                </Text>
              )}
            </div>
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
              {screens.md ? "Cancel" : null}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
              disabled={!isFormDirty}
              style={{ background: BRAND.violet, borderColor: BRAND.violet, color: "#fff" }}
            >
              {screens.md ? "Save Changes" : "Save"}
            </Button>
          </div>
        </Header>

        <Content>
          <div style={{ display: "flex", justifyContent: "center" }}>
        <style>{`
          /* Remove button outlines */
          .ant-btn:focus,
          .ant-btn:active,
          .ant-btn-text:focus,
          .ant-btn-text:active,
          button:focus,
          button:active {
            outline: none !important;
            box-shadow: none !important;
          }

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

          .name-role{ display:flex; flex-direction:column; }
          .name-role .name{ margin:0; color:var(--panel-ink); font-weight:800; letter-spacing:.2px; }
          .name-role .role{ margin-top:2px; color:var(--muted-ink); font-size:13px; }

          .panel-actions{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
          .soft-btn{
            height:36px; border-radius:10px; padding:0 12px;
            background:var(--chip-bg); color:var(--chip-ink); border:1px solid var(--soft-border);
            font-size: ${screens.xs ? "13px" : "14px"};
            white-space: nowrap;
          }
          .download-btn{
            height:36px; border-radius:12px; padding:0 14px;
            background:${BRAND.green}; color:#fff; font-weight:700; border:1px solid rgba(76,175,80,0.3);
            box-shadow:0 2px 8px rgba(76,175,80,0.2);
            font-size: ${screens.xs ? "13px" : "14px"};
            white-space: nowrap;
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
                    {form.getFieldValue("position") || user?.position || "Barangay Official"}
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
                    {screens.xs ? "Photo" : "Change Photo"}
                  </Button>
                </Upload>

                <Button className="download-btn" icon={<DownloadOutlined />}>
                  {screens.xs ? "Download" : "Download Info"}
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
                    {form.getFieldValue("email") || user?.email || user?.officialEmail || "—"}
                  </div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Contact Number</div>
                  <div className="value">{user?.contactNumber || user?.phone || "(—)"}</div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Official ID</div>
                  <div className="value">{form.getFieldValue("officialID") || user?.officialID || "—"}</div>
                </div>
              </div>

              <div className="meta-chip">
                <div>
                  <div className="label">Position</div>
                  <div className="value">
                    {form.getFieldValue("position") || user?.position || "—"}
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
                  Update your official details and contact information.
                </Text>
              </div>
            </div>

            <Divider style={{ borderColor: "rgba(122,90,248,0.15)" }} />

            <Form layout="vertical" form={form} onFinish={onSave} onValuesChange={handleFormValuesChange}>
              <Row gutter={[16, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item name="officialID" label="Official ID">
                    <Input disabled prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="position" label="Position">
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
                  <Form.Item name="contactNumber" label="Contact Number">
                    <Input prefix={<PhoneOutlined />} placeholder="+639123456789" />
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
