// src/pages/official/OfficialSettings.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null);

  const [form] = Form.useForm();
  const originalProfileRef = useRef(null);

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

        if (profile.adminEmail && !profile.email) profile.email = profile.adminEmail;

        setUser(profile);
        originalProfileRef.current = profile;
        form.setFieldsValue(profile);
        return profile;
      }
    } catch (err) {
      console.debug("loadProfile failed", err?.message);
    }
    return null;
  };

  const loadAvatar = async () => {
    try {
      const { data } = await api.get('/api/admin/profile/photo');
      if (data?.success && data?.data && data.data.photoData) {
        const mime = data.data.photoMimeType || 'image/jpeg';
        const full = data.data.photoData.startsWith('data:') 
          ? data.data.photoData 
          : `data:${mime};base64,${data.data.photoData}`;
        setAvatarUrl(full);
        setPhotoData(data.data.photoData.startsWith('data:') 
          ? data.data.photoData.split(',')[1] 
          : data.data.photoData);
        setPhotoMimeType(data.data.photoMimeType || 'image/jpeg');
      }
    } catch (err) {
      console.debug('[AdminSettings] loadAvatar failed', err?.message);
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("user");
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        originalProfileRef.current = parsed;
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

    // Refresh profile from server
    (async () => {
      try {
        const fresh = await loadProfile();
        if (fresh) {
          if (fresh.adminEmail && !fresh.email) fresh.email = fresh.adminEmail;
          setUser(fresh);
          originalProfileRef.current = fresh;
          form.setFieldsValue(fresh);
          // try to load avatar
          try { await loadAvatar(); } catch (e) { /* ignore avatar load errors */ }
        }
      } catch (err) {
        console.debug('[AdminSettings] profile refresh failed', err?.message);
      }
    })();
    setIsFormDirty(false);
    
    return () => {
      // cleanup any object URL created for preview
      try { if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); } } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormValuesChange = () => setIsFormDirty(true);

  // Download profile info as JSON or PDF (print)
  const handleDownload = async (format = "pdf") => {
    try {
      const formValues = form.getFieldsValue();
      const exportObj = {
        ...(user || {}),
        ...(formValues || {}),
      };

      if (photoData) {
        exportObj.photoData = photoData;
        exportObj.photoMimeType = photoMimeType || "image/jpeg";
      } else if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
        exportObj.photoData = avatarUrl.split(",")[1] || avatarUrl;
      }

      if (format === "json") {
        const filenameBase = (exportObj.adminEmail || exportObj.email || exportObj.adminID || "admin").toString().replace(/[^a-z0-9@.\-_]/gi, "-");
        const filename = `vawcare-admin-${filenameBase}-${new Date().toISOString().slice(0,19).replace(/[:T]/g, "-")}.json`;
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        message.success("Downloaded profile info");
        return;
      }

      // PDF via print preview
      if (format === "pdf") {
        const html = [];
        const css = `body{font-family:Inter,Roboto,Arial,sans-serif;color:#222;margin:20px} .card{border:1px solid rgba(0,0,0,0.06);padding:18px;border-radius:10px;max-width:800px;margin:0 auto} .header{display:flex;align-items:center;gap:12px} .avatar{width:84px;height:84px;border-radius:8px;object-fit:cover;border:1px solid #eee} .title{font-size:18px;font-weight:700;color:#7A5AF8} .meta{margin-top:8px;color:#555} .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #eee} .label{color:#777;font-weight:700;width:40%} .value{color:#111;width:60%}`;

        html.push(`<html><head><title>VAWCare - Admin Info</title><style>${css}</style></head><body>`);
        html.push(`<div class="card">`);
        html.push(`<div class="header">`);
        if (exportObj.photoData || (avatarUrl && avatarUrl.startsWith('data:'))) {
          const src = exportObj.photoData ? `data:${exportObj.photoMimeType || 'image/jpeg'};base64,${exportObj.photoData}` : avatarUrl;
          html.push(`<img class="avatar" src="${src}" alt="avatar" />`);
        } else {
          html.push(`<div style="width:84px;height:84px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#7A5AF8;font-weight:700">${(exportObj.firstName||'')[0]||''}${(exportObj.lastName||'')[0]||''}</div>`);
        }
        html.push(`<div><div class="title">${(exportObj.firstName || '') + ' ' + (exportObj.lastName || '')}</div><div class="meta">Admin Profile</div></div>`);
        html.push(`</div>`);

        const fields = [
          ['Email', exportObj.adminEmail || exportObj.email || '—'],
          ['Phone', exportObj.phoneNumber || exportObj.phone || '—'],
          ['Admin ID', exportObj.adminID || '—'],
          ['Role', exportObj.adminRole || '—']
        ];

        html.push(`<div style="margin-top:12px">`);
        fields.forEach(([label, value]) => {
          html.push(`<div class="row"><div class="label">${label}</div><div class="value">${value}</div></div>`);
        });

        html.push(`<div style="margin-top:18px;color:#999;font-size:12px">Generated: ${new Date().toLocaleString()}</div>`);
        html.push(`</div></div></body></html>`);

        const w = window.open('', '_blank');
        if (!w) {
          message.error('Popup blocked. Allow popups to download PDF.');
          return;
        }
        w.document.open();
        w.document.write(html.join(''));
        w.document.close();
        const triggerPrint = () => { try { w.focus(); w.print(); } catch (err) { console.debug('Print failed', err); } };
        const imgs = w.document.getElementsByTagName('img');
        if (imgs && imgs.length) {
          let loaded = 0;
          for (let i = 0; i < imgs.length; i++) { imgs[i].onload = imgs[i].onerror = () => { loaded++; if (loaded === imgs.length) triggerPrint(); }; }
          setTimeout(() => triggerPrint(), 800);
        } else { setTimeout(() => triggerPrint(), 300); }
        message.success('Preparing PDF (use Print -> Save as PDF)');
        return;
      }
    } catch (err) {
      console.error('[AdminSettings] Download failed', err);
      message.error('Failed to download profile info');
    }
  };



  const onSave = async (values) => {
    setLoading(true);
    try {
      // Defensive validation - ensure no gibberish data gets saved
      const validationErrors = [];
      
      const checkGibberish = (fieldName, value) => {
        if (!value) return;
        const strValue = String(value).trim();
        if (/(.)\1\1/.test(strValue)) {
          validationErrors.push(`${fieldName}: repeated characters detected`);
        }
        if ((/(.{2,3})\1{2,}/.test(strValue))) {
          validationErrors.push(`${fieldName}: repeating pattern detected`);
        }
        const letters = strValue.replace(/[^a-zA-Z]/g, '');
        const vowels = strValue.replace(/[^aeiouAEIOU]/g, '');
        if (letters.length > 3 && vowels.length / letters.length < 0.25) {
          validationErrors.push(`${fieldName}: appears to be gibberish`);
        }
      };
      
      checkGibberish('firstName', values.firstName);
      checkGibberish('lastName', values.lastName);
      
      if (validationErrors.length > 0) {
        throw new Error('Validation failed: ' + validationErrors.join(', '));
      }
      
      const payload = { ...values };
      if (payload.email && !payload.adminEmail) payload.adminEmail = payload.email;

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
          console.log("[AdminSettings] Computed photo base64 on save - size:", cleanBase64.length);
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
        
        console.log("[AdminSettings] Saving profile with photo - size:", cleanBase64.length);
      }

      console.log("[AdminSettings] Saving profile with photoData:", !!payload.photoData);
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
              Account Settings
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Manage your profile information and account preferences.
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
                await loadProfile();
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
        /* Custom scrollbar styling */
        .ant-layout-content::-webkit-scrollbar,
        .ant-table-body::-webkit-scrollbar,
        .ant-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .ant-layout-content::-webkit-scrollbar-track,
        .ant-table-body::-webkit-scrollbar-track,
        .ant-modal-body::-webkit-scrollbar-track {
          background: #f1eeff;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb,
        .ant-table-body::-webkit-scrollbar-thumb,
        .ant-modal-body::-webkit-scrollbar-thumb {
          background: #a78bfa;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb:hover,
        .ant-table-body::-webkit-scrollbar-thumb:hover,
        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
        /* Firefox */
        .ant-layout-content,
        .ant-table-body,
        .ant-modal-body {
          scrollbar-width: thin;
          scrollbar-color: #a78bfa #f1eeff;
        }

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

        /* REMOVED the .avatar-uploader badge (no overlay on the photo) */

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
                  {screens.xs ? "Photo" : "Change Photo"}
                </Button>
              </Upload>

              <Button className="download-btn" icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')}>
                {screens.xs ? "Download" : "Download Info"}
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

          <Form layout="vertical" form={form} onFinish={onSave} onValuesChange={handleFormValuesChange} validateTrigger={['onChange', 'onBlur']}>
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
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[
                    { required: true, message: "Please enter first name" },
                    { min: 2, message: "First name must be at least 2 characters" },
                    { pattern: /^[a-zA-Z\s-]*$/, message: "First name can only contain letters, spaces, and hyphens" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const strValue = String(value).trim();
                        if (/(.)\1{2}/.test(strValue)) {
                          return Promise.reject(new Error('First name cannot contain repeated characters'));
                        }
                        if ((/(.{2,3})\1{2,}/.test(strValue))) {
                          return Promise.reject(new Error('First name appears to be gibberish'));
                        }
                        const letters = strValue.replace(/[^a-zA-Z]/g, '');
                        const vowels = strValue.replace(/[^aeiouAEIOU]/g, '');
                        if (letters.length > 3 && vowels.length / letters.length < 0.25) {
                          return Promise.reject(new Error('First name appears to be gibberish'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="First name" onChange={() => form.validateFields(['firstName'])} onKeyPress={(e) => {
                    if (!/^[a-zA-Z\s-]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[
                    { required: true, message: "Please enter last name" },
                    { min: 2, message: "Last name must be at least 2 characters" },
                    { pattern: /^[a-zA-Z\s-]*$/, message: "Last name can only contain letters, spaces, and hyphens" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const strValue = String(value).trim();
                        if (/(.)\1{2}/.test(strValue)) {
                          return Promise.reject(new Error('Last name cannot contain repeated characters'));
                        }
                        if ((/(.{2,3})\1{2,}/.test(strValue))) {
                          return Promise.reject(new Error('Last name appears to be gibberish'));
                        }
                        const letters = strValue.replace(/[^a-zA-Z]/g, '');
                        const vowels = strValue.replace(/[^aeiouAEIOU]/g, '');
                        if (letters.length > 3 && vowels.length / letters.length < 0.25) {
                          return Promise.reject(new Error('Last name appears to be gibberish'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Last name" onChange={() => form.validateFields(['lastName'])} onKeyPress={(e) => {
                    if (!/^[a-zA-Z\s-]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="middleInitial"
                  label="Middle Initial"
                  rules={[
                    { pattern: /^[A-Za-z]$/, message: "Middle initial must be a single letter" },
                  ]}
                >
                  <Input maxLength={1} placeholder="M" onKeyPress={(e) => {
                    if (!/^[a-zA-Z]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: "Please enter an email address" },
                    { type: "email", message: "Please enter a valid email address" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="you@example.com" disabled />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="phoneNumber"
                  label="Phone Number"
                  rules={[
                    {
                      pattern: /^[+0-9\s\-()]*$/,
                      message: "Phone number can only contain digits, spaces, +, (), and dashes",
                    },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const phPattern = /^(\+63|0)[0-9]{10}$/;
                        return phPattern.test(value.replace(/[\s()-]/g, ''))
                          ? Promise.resolve()
                          : Promise.reject(new Error("Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)"));
                      },
                    },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="+63 (234) 567-8900" onKeyPress={(e) => {
                    if (!/^[+0-9\s\-()]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }} />
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
