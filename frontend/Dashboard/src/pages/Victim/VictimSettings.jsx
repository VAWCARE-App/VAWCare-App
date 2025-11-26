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
  Modal,
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
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { api, clearAllStorage } from "../../lib/api";
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();


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
      messageApi.info('Photo selected. Click "Save changes" to save to profile.');

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
      messageApi.error('Failed to select photo');
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
      messageApi.error("Failed to load profile");
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
        messageApi.error("Failed to load profile. Please try refreshing the page.");
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
      messageApi.success("Profile updated successfully!");
      // refresh profile from backend to pick up any verification changes
      const refreshed = await loadProfile();
      if (refreshed && determineVerified(refreshed)) setVerified(true);

      setIsFormDirty(false);
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to update profile";

      messageApi.error(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  // Download profile info as JSON or PDF
  const handleDownload = async (format = "json") => {
    try {
      const formValues = form.getFieldsValue();
      // Merge latest form values over profileData fetched from server
      const exportObj = {
        ...(profileData || {}),
        ...(formValues || {}),
      };

      // Normalize emergency contacts if present as form fields
      if (
        formValues.emergencyContactName ||
        formValues.emergencyContactNumber ||
        formValues.emergencyContactRelationship ||
        formValues.emergencyContactEmail ||
        formValues.emergencyContactAddress
      ) {
        exportObj.emergencyContacts = [
          {
            name: formValues.emergencyContactName || (profileData?.emergencyContacts?.[0]?.name || ""),
            relationship:
              formValues.emergencyContactRelationship || (profileData?.emergencyContacts?.[0]?.relationship || ""),
            contactNumber:
              formValues.emergencyContactNumber || (profileData?.emergencyContacts?.[0]?.contactNumber || ""),
            email: formValues.emergencyContactEmail || (profileData?.emergencyContacts?.[0]?.email || ""),
            address: formValues.emergencyContactAddress || (profileData?.emergencyContacts?.[0]?.address || ""),
          },
        ];
      }

      // Include avatar/base64 if available
      if (photoData) {
        exportObj.photoData = photoData;
        exportObj.photoMimeType = photoMimeType || "image/jpeg";
      } else if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
        exportObj.photoData = avatarUrl.split(",")[1] || avatarUrl;
      }

      if (format === "json") {
        const filenameBase = (exportObj.victimEmail || exportObj.firstName || "victim").toString().replace(/[^a-z0-9@.\-_]/gi, "-");
        const filename = `vawcare-victim-${filenameBase}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        messageApi.success("Downloaded profile info");
        return;
      }

      // PDF flow: build a printable HTML and trigger print (users can save as PDF)
      if (format === "pdf") {
        const html = [];
        const css = `body{font-family:Inter,Roboto,Arial,sans-serif;color:#222;margin:20px} .card{border:1px solid rgba(0,0,0,0.06);padding:18px;border-radius:10px;max-width:800px;margin:0 auto} .header{display:flex;align-items:center;gap:12px} .avatar{width:84px;height:84px;border-radius:8px;object-fit:cover;border:1px solid #eee} .title{font-size:18px;font-weight:700;color:#7A5AF8} .meta{margin-top:8px;color:#555} .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #eee} .label{color:#777;font-weight:700;width:40%} .value{color:#111;width:60%}`;

        html.push(`<html><head><title>VAWCare - Victim Info</title><style>${css}</style></head><body>`);
        html.push(`<div class="card">`);
        html.push(`<div class="header">`);
        if (photoData || (avatarUrl && avatarUrl.startsWith("data:"))) {
          const src = photoData ? `data:${exportObj.photoMimeType || 'image/jpeg'};base64,${exportObj.photoData}` : avatarUrl;
          html.push(`<img class="avatar" src="${src}" alt="avatar" />`);
        } else {
          html.push(`<div style="width:84px;height:84px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#7A5AF8;font-weight:700">${(exportObj.firstName || '')[0] || ''}${(exportObj.lastName || '')[0] || ''}</div>`);
        }
        html.push(`<div><div class="title">${(exportObj.firstName || '') + ' ' + (exportObj.lastName || '')}</div><div class="meta">Victim Profile</div></div>`);
        html.push(`</div>`);

        // key fields
        const fields = [
          ['Email', exportObj.victimEmail || exportObj.email || '—'],
          ['Phone', exportObj.contactNumber || '—'],
          ['Role', 'Victim'],
          ['Trusted Contacts', exportObj.emergencyContacts && exportObj.emergencyContacts.length ? String(exportObj.emergencyContacts.length) : '0']
        ];

        html.push(`<div style="margin-top:12px">`);
        fields.forEach(([label, value]) => {
          html.push(`<div class="row"><div class="label">${label}</div><div class="value">${value}</div></div>`);
        });

        if (exportObj.emergencyContacts && exportObj.emergencyContacts.length) {
          html.push(`<div style="margin-top:12px;font-weight:700">Emergency Contact</div>`);
          const ec = exportObj.emergencyContacts[0];
          html.push(`<div class="row"><div class="label">Name</div><div class="value">${ec.name || '—'}</div></div>`);
          html.push(`<div class="row"><div class="label">Relationship</div><div class="value">${ec.relationship || '—'}</div></div>`);
          html.push(`<div class="row"><div class="label">Contact</div><div class="value">${ec.contactNumber || '—'}</div></div>`);
          html.push(`<div class="row"><div class="label">Email</div><div class="value">${ec.email || '—'}</div></div>`);
          if (ec.address) html.push(`<div class="row"><div class="label">Address</div><div class="value">${ec.address}</div></div>`);
        }

        html.push(`<div style="margin-top:18px;color:#999;font-size:12px">Generated: ${new Date().toLocaleString()}</div>`);
        html.push(`</div></div></body></html>`);

        const w = window.open('', '_blank');
        if (!w) {
          messageApi.error('Popup blocked. Allow popups to download PDF.');
          return;
        }
        w.document.open();
        w.document.write(html.join(''));
        w.document.close();
        // Wait a moment for images to load, then trigger print
        const triggerPrint = () => {
          try {
            w.focus();
            w.print();
            // optionally close after print
            // setTimeout(() => w.close(), 500);
          } catch (err) {
            console.debug('Print failed', err);
          }
        };
        // If image exists, wait until loaded
        const imgs = w.document.getElementsByTagName('img');
        if (imgs && imgs.length) {
          let loaded = 0;
          for (let i = 0; i < imgs.length; i++) {
            imgs[i].onload = imgs[i].onerror = () => {
              loaded++;
              if (loaded === imgs.length) triggerPrint();
            };
          }
          // fallback timeout
          setTimeout(() => triggerPrint(), 800);
        } else {
          setTimeout(() => triggerPrint(), 300);
        }
        messageApi.success('Preparing PDF (use Print -> Save as PDF)');
        return;
      }
    } catch (err) {
      console.error("Download failed", err);
      messageApi.error("Failed to download profile info");
    }
  };

  // Photo upload removed

  const showDeleteConfirm = () => {
    setDeleteModalOpen(true);
  };

  const performDeleteAccount = async () => {
    try {
      setLoading(true);
      const res = await api.delete('/api/victims/profile');
      if (res?.data?.success) {
        messageApi.success(res.data.message || 'Account deleted');
        try { await clearAllStorage(); } catch (e) { console.debug('clearAllStorage failed', e && e.message); }
        // close modal briefly then redirect
        setDeleteModalOpen(false);
        window.location.href = '/';
      } else {
        messageApi.error(res?.data?.message || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Delete account failed', err);
      messageApi.error(err?.response?.data?.message || err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

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
      {messageContextHolder}
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

        .panel-actions{ display:flex; align-items:center; gap:8px; flex-wrap: wrap; }
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
                    {screens.xs ? "Photo" : "Change Photo"}
                  </Button>
                </Upload>

                <Button className="download-btn" icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')}>
                  {screens.xs ? "Download" : "Download Info"}
                </Button>

                <Button
                  danger
                  style={{ borderRadius: 12, height: 36 }}
                  onClick={showDeleteConfirm}
                >
                  {screens.xs ? 'Delete' : 'Delete Account'}
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
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[
                      { required: true, message: "Please enter your first name" },
                      { max: 60, message: "First name cannot exceed 60 characters" },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="First name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: "Please enter your last name" }, { max: 60, message: "Last name cannot exceed 60 characters" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Last name" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="contactNumber"
                    label="Contact Number"
                    rules={[
                      { pattern: /^[+0-9()\s-]{7,20}$/, message: "Enter a valid phone number" },
                      { max: 20, message: "Phone number is too long" },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="+639123456789" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="victimEmail" label="Email">
                    <Input prefix={<MailOutlined />} placeholder="you@example.com" disabled />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Divider plain orientation="left" style={{ color: BRAND.violet, fontWeight: 600 }}>
                    Emergency Contact
                  </Divider>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Name"
                    name="emergencyContactName"
                    rules={[
                      { max: 80, message: "Name cannot exceed 80 characters" },
                      // If an emergency contact method is provided, name becomes required
                      {
                        validator: (_, value) => {
                          const email = form.getFieldValue("emergencyContactEmail");
                          const number = form.getFieldValue("emergencyContactNumber");
                          if ((email || number) && !value) {
                            return Promise.reject(new Error("Provide the emergency contact's name"));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Full name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Relationship"
                    name="emergencyContactRelationship"
                    rules={[{ max: 40, message: "Relationship text is too long" }]}
                  >
                    <Input placeholder="e.g. Mother, Friend" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Contact Number"
                    name="emergencyContactNumber"
                    rules={[
                      { pattern: /^[+0-9()\s-]{7,20}$/, message: "Enter a valid phone number for emergency contact" },
                      {
                        validator: (_, value) => {
                          const name = form.getFieldValue("emergencyContactName");
                          const email = form.getFieldValue("emergencyContactEmail");
                          // If name or email provided, number becomes required (at least one contact method recommended)
                          if ((name || email) && !value) {
                            return Promise.reject(new Error("Provide a contact number for the emergency contact"));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="09123456789" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Email"
                    name="emergencyContactEmail"
                    rules={[
                      { type: "email", message: "Enter a valid email address" },
                      {
                        validator: (_, value) => {
                          const name = form.getFieldValue("emergencyContactName");
                          const number = form.getFieldValue("emergencyContactNumber");
                          if ((name || number) && !value) {
                            return Promise.reject(new Error("Provide an email for the emergency contact"));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="Address"
                    name="emergencyContactAddress"
                    rules={[{ max: 250, message: "Address cannot exceed 250 characters" }]}
                  >
                    <Input.TextArea rows={2} placeholder="Address (optional)" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <InstallButton />
          </Card>

          {/* Delete Confirmation Modal (matches Admin UserManagement style) */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                <span>Confirm Delete</span>
              </div>
            }
            open={deleteModalOpen}
            onCancel={() => setDeleteModalOpen(false)}
            onOk={performDeleteAccount}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading }}
            centered
            zIndex={1200}
          >
            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>
                Are you sure you want to delete your account?
              </p>
              {profileData && (
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontWeight: 700 }}>{displayName}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>
                      @{profileData.victimUsername || ''} • {profileData.victimEmail || ''}
                    </div>
                    <div style={{ marginTop: 6 }}><Tag style={{ marginTop: 4 }}>Victim</Tag></div>
                  </div>
                </div>
              )}
              <p style={{ marginTop: 16, marginBottom: 0, color: '#666', fontSize: 13 }}>
                This action will soft-delete your account and can be restored by an administrator.
              </p>
            </div>
          </Modal>
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
