import React, { useState, useEffect } from "react";
import {
  Input,
  DatePicker,
  TimePicker,
  Typography,
  Button,
  message,
  notification,
  Layout,
  Space,
  Divider,
  Select,
  Card,
  Spin,
  Grid,
} from "antd";
import {
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  DownloadOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { api, getUserType } from "../../lib/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Header, Content } = Layout;
const { Option } = Select;

// Brand (matches the rest of your pages)
const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  softBorder: "rgba(122,90,248,0.18)",
};

export default function BPO() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  
  React.useEffect(() => {
    const checkUser = async () => {
      const type = await getUserType(); // wait for the Promise
      if (type !== "admin" && type !== "official") {
        navigate("/", { replace: true });
      }
    };
    checkUser();
  }, [navigate]);


  const [form, setForm] = useState({
    controlNo: "",
    respondent: "",
    address: "",
    applicant: "",
    appliedOn: null,
    statement: "",
    harmTo: "",
    children: "",
    dateIssued: null,
    receivedBy: "",
    dateReceived: null,
    servedBy: "",
    pbName: "REGINA CRISTINA D. TUMACDER",
    attestDate: null,
    attestTime: null,
    kagawadName: "",
  });
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [officials, setOfficials] = useState([]);

  // -------- Validation helper --------
  const validateField = (fieldName, value) => {
    if (!value || value.trim() === "") return null;
    
    const strValue = String(value).trim();
    
    // Get field label for error messages
    const fieldLabels = {
      respondent: "Respondent name",
      applicant: "Applicant name",
      statement: "Statement",
      harmTo: "Name",
      children: "Children names",
      kagawadName: "Kagawad name",
      address: "Address",
    };
    const fieldLabel = fieldLabels[fieldName] || fieldName;
    
    // Check for 3+ repeated characters (e.g., "aaa", "bbb")
    if (/(.)\1{2}/.test(strValue)) {
      return `${fieldLabel} cannot contain repeated characters`;
    }
    
    return null;
  };

  const handleValidatedUpdate = (fieldName) => (e) => {
    const v = e && e.target ? e.target.value : e;
    const error = validateField(fieldName, v);
    
    setValidationErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
    
    setForm((s) => ({ ...s, [fieldName]: v }));
  };

  // -------- Fetch cases and officials on mount --------
  useEffect(() => {
    fetchCases();
    fetchOfficials();
    generateControlNumber();
  }, []);

  // -------- Auto-select case from URL parameter --------
  useEffect(() => {
    const caseIdParam = searchParams.get("caseId");
    if (caseIdParam && cases.length > 0) {
      // Auto-select the case from URL
      handleCaseSelect(caseIdParam);
    }
  }, [searchParams, cases]);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await api.get("/api/cases", {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = res?.data?.data || [];
      setCases(data);
    } catch (err) {
      console.error("Failed to fetch cases", err);
      messageApi.error("Failed to load cases");
    } finally {
      setLoadingCases(false);
    }
  };

  // -------- Fetch officials and auto-fill positions --------
  const fetchOfficials = async () => {
    try {
      const res = await api.get("/api/admin/officials", {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = res?.data?.data || [];
      setOfficials(data);
      
      // Find Barangay Captain and VAWC Chairman
      const captain = data.find(
        (official) => 
          official.position === "Barangay Captain" && 
          official.status === "approved" && 
          !official.isDeleted
      );
      const chairman = data.find(
        (official) => 
          official.position === "VAWC Chairman" && 
          official.status === "approved" && 
          !official.isDeleted
      );
      
      // Auto-fill the form with official names
      if (captain || chairman) {
        setForm((prevForm) => ({
          ...prevForm,
          pbName: captain 
            ? `${captain.firstName}${captain.middleInitial ? ' ' + captain.middleInitial + '.' : ''} ${captain.lastName}`.toUpperCase()
            : prevForm.pbName,
          kagawadName: chairman 
            ? `${chairman.firstName}${chairman.middleInitial ? ' ' + chairman.middleInitial + '.' : ''} ${chairman.lastName}`.toUpperCase()
            : prevForm.kagawadName,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch officials", err);
      // Don't show error message to user, just use default values
    }
  };

  // -------- Generate Control Number --------
  const generateControlNumber = async () => {
    try {
      const res = await api.get("/api/bpo", {
        headers: { "Cache-Control": "no-cache" },
      });
      const bpos = res?.data?.data || [];
      
      if (bpos.length === 0) {
        // First BPO - start with BPO-0001
        setForm((s) => ({ ...s, controlNo: "BPO-0001" }));
      } else {
        // Extract numeric parts from existing control numbers
        const numbers = bpos
          .map((bpo) => {
            const controlNo = bpo.controlNO || "";
            const match = controlNo.match(/BPO-(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => !isNaN(num));
        
        // Get the highest number and increment
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const newNum = maxNum + 1;
        const controlNo = `BPO-${String(newNum).padStart(4, "0")}`;
        
        setForm((s) => ({ ...s, controlNo }));
      }
    } catch (err) {
      console.error("Failed to generate control number", err);
      // Fallback to timestamp-based control number
      const timestamp = Date.now().toString().slice(-4);
      setForm((s) => ({ ...s, controlNo: `BPO-${timestamp}` }));
    }
  };

  // -------- Handle case selection and autofill --------
  const handleCaseSelect = (caseId) => {
    if (!caseId) {
      // Clear selection
      setSelectedCase(null);
      return;
    }
    
    const selectedCaseData = cases.find((c) => (c.caseID || c._id) === caseId);
    if (!selectedCaseData) {
      setSelectedCase(null);
      return;
    }
    
    setSelectedCase(selectedCaseData);
    
    // Autofill form fields based on case data
    setForm((prevForm) => ({
      ...prevForm,
      // Applicant is the victim from the case
      applicant: selectedCaseData.victimName || "",
      // Respondent is the victim from the case
      respondent: selectedCaseData.victimName || "",
      // Statement/description from the case
      statement: selectedCaseData.description || "",
      // Address from case location
      address: selectedCaseData.location || "",
      // Use incident type and other details to build more context
      harmTo: selectedCaseData.victimName ? selectedCaseData.victimName.split(" ")[0] : "",
      // Set applied on date to current date
      appliedOn: dayjs(),
      // Set date issued to today
      dateIssued: dayjs(),
      // Set receivedBy to the victim's name
      receivedBy: selectedCaseData.victimName || "",
      // Set servedBy assigned officer
      servedBy: selectedCaseData.assignedOfficer || "",
    }));
    
    messageApi.success(`Case ${selectedCaseData.caseID || caseId} selected and form autofilled`);
  };

  // -------- helpers --------
  const update = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm((s) => ({ ...s, [k]: v }));
  };
  const updateDate = (k) => (date) => setForm((s) => ({ ...s, [k]: date }));
  const updateTime = (time) => setForm((s) => ({ ...s, attestTime: time }));

  const copyIdToClipboard = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      messageApi.success("BPO ID copied to clipboard");
    } catch {
      messageApi.error("Could not copy to clipboard");
    }
  };
  const openBpoDetail = (id) => navigate(`/admin/bpo/${id}`);

  // -------- save --------
  const submit = async () => {
    // Check for validation errors
    if (Object.values(validationErrors).some((err) => err !== null)) {
      messageApi.error("Please fix validation errors before saving.");
      return;
    }
    
    if (!form.respondent || !form.applicant) {
      messageApi.error(
        "Please fill in at least the respondent and applicant fields."
      );
      return;
    }
    const mapped = {
      controlNO: form.controlNo || undefined,
      nameofRespondent: form.respondent || undefined,
      address: form.address || undefined,
      applicationName: form.applicant || undefined,
      orderDate: form.appliedOn ? form.appliedOn.toISOString() : undefined,
      statement: form.statement || undefined,
      hisOrher: form.harmTo || undefined,
      nameofChildren: form.children || undefined,
      dateIssued: form.dateIssued ? form.dateIssued.toISOString() : undefined,
      copyReceivedBy: form.receivedBy || undefined,
      dateReceived: form.dateReceived
        ? form.dateReceived.toISOString()
        : undefined,
      servedBy: form.servedBy || undefined,
      punongBarangay: form.pbName || undefined,
      unavailabledate: form.attestDate
        ? form.attestDate.toISOString()
        : undefined,
      time: form.attestTime ? form.attestTime.format("hh:mm A") : undefined,
      barangaykagawad: form.kagawadName || undefined,
    };

    setLoading(true);
    setSavedId(null);
    try {
      const res = await api.post("/api/bpo", { data: mapped });
      const created = res?.data?.data;
      const id = created?.bpoID || created?._id;
      setSavedId(id || null);
      messageApi.success(id ? `BPO saved (ID: ${id})` : "BPO saved successfully");
      notification.success({
        message: "BPO Saved",
        description: id ? `Saved successfully (ID: ${id})` : "Saved successfully",
        duration: 6,
      });
    } catch (err) {
      const srvMsg =
        err?.response?.data?.message || err?.message || "Unknown error";
      messageApi.error(`Save failed: ${srvMsg}`);
      notification.error({
        message: "Save Failed",
        description: srvMsg,
        duration: 6,
      });
    } finally {
      setLoading(false);
    }
  };

  // -------- export current form (print -> Save as PDF) --------
  const exportCurrent = () => {
    const esc = (v) =>
      v == null
        ? ""
        : String(v)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
    const fmtDate = (d) => {
      if (!d) return "";
      try {
        if (typeof d?.format === "function") return d.format("MM/DD/YYYY");
        const dd = d?.$d ? d.$d : d;
        return new Date(dd).toLocaleDateString();
      } catch {
        return String(d);
      }
    };
    const fmtTime = (t) => {
      if (!t) return "";
      try {
        if (typeof t?.format === "function") return t.format("hh:mm A");
        return String(t);
      } catch {
        return String(t);
      }
    };

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>BPO-Export</title>
<style>
  html,body{margin:0;padding:0;color:#000;font-family:'Times New Roman', Times, serif}
  .bpo-printable{box-sizing:border-box;width:186mm;padding:12mm;margin:0 auto}
  .underline{border-bottom:1px solid #000;display:inline-block}
  textarea{white-space:pre-wrap}
  @page{size:A4;margin:12mm}
</style>
</head>
<body>
  <div class="bpo-printable">
    <div style="text-align:center">
      <div style="font-size:14px">Republic of the Philippines</div>
      <div style="font-size:14px">Province of Nueva Vizcaya</div>
      <div style="font-size:14px">Municipality of Bayombong</div>
      <div style="font-size:14px">Barangay Bonfal Proper</div>
      <div style="font-size:14px;font-weight:700;margin-top:6px">OFFICE OF THE PUNONG BARANGAY</div>
    </div>
    <h3 style="text-align:center;margin-top:10px;margin-bottom:6px">BARANGAY PROTECTION ORDER</h3>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div><strong>VAWC FORM #4</strong></div>
      <div style="display:flex;align-items:center;gap:8px"><span>CONTROL NO.</span><span class="underline" style="width:160px">${esc(form.controlNo)}</span></div>
    </div>

    <div style="margin-top:8px">
      <div style="margin-bottom:10px"><strong>Name of Respondent:</strong> <span class="underline" style="width:68%">${esc(form.respondent)}</span></div>
      <div style="margin-bottom:10px"><strong>Address:</strong> <span class="underline" style="width:75%">${esc(form.address)}</span></div>

      <h3 style="text-align:center;margin-top:8px;margin-bottom:6px">ORDER</h3>

      <div style="margin-bottom:12px">
        <strong>Applicant Name:</strong>
        <span class="underline" style="width:260px; margin-left:8px">${esc(form.applicant)}</span>
        <span style="margin-left:12px">applied for a BPO on</span>
        <span class="underline" style="margin-left:8px;width:140px">${esc(fmtDate(form.appliedOn))}</span>
        <span style="margin-left:8px">under oath stating that:</span>
      </div>

      <div style="margin-bottom:12px"><textarea readonly style="width:100%;border:1px solid #ccc;padding:8px;font-family:'Times New Roman',Times,serif;font-size:15px;">${esc(form.statement)}</textarea></div>

      <div style="margin-bottom:8px">After having heard the application and the witnesses and evidence, the undersigned hereby issues this BPO ordering you to immediately cease and desist from causing or threatening the cause physical harm to <span class="underline" style="width:120px;margin:0 8px">${esc(form.harmTo)}</span> and/or her child/children namely: <span class="underline" style="width:360px;margin-left:8px">${esc(form.children)}</span></div>

      <div style="margin-top:12px"><strong>This BPO is effective for 15 days from receipt.</strong></div>

      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center">
        <div></div>
        <div style="text-align:center">
          <div style="font-weight:700">${esc(form.pbName)}</div>
          <div>Punong Barangay</div>
          <div style="margin-top:8px"><strong>Date Issued:</strong> <span class="underline" style="width:160px; margin-left:8px">${esc(fmtDate(form.dateIssued))}</span></div>
        </div>
      </div>

      <div style="margin-top:18px;padding-top:8px;display:flex;gap:12px;align-items:flex-start">
        <div style="flex:1">
          <div style="display:flex;gap:8px;align-items:center"><strong>Copy received by:</strong><span class="underline" style="width:50%">${esc(form.receivedBy)}</span></div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:8px">
            <div style="display:flex;gap:8px;align-items:center"><strong>Date received:</strong><span class="underline" style="width:160px">${esc(fmtDate(form.dateReceived))}</span></div>
            <div style="display:flex;gap:8px;align-items:center"><strong>Served by:</strong><span class="underline" style="width:240px">${esc(form.servedBy)}</span></div>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;text-align:center">
        <div style="font-weight:700;font-size:16px">ATTESTATION</div>
        <div style="margin-top:4px">(In Case the Punong Barangay is Unavailable)</div>
        <div style="margin-top:12px;text-align:left;max-width:760px;margin-left:auto;margin-right:auto">
          <span>I hereby attest that Punong Barangay </span><span class="underline" style="width:260px;margin:0 8px">${esc(form.pbName)}</span>
          was unavailable to act on <span class="underline" style="width:140px;margin-left:8px">${esc(fmtDate(form.attestDate))}</span> at <span class="underline" style="width:100px;margin-left:8px">${esc(fmtTime(form.attestTime))}</span> a.m./p.m. and issue such order.
        </div>
        <div style="margin-top:18px;display:flex;justify-content:flex-end">
          <div style="width:260px;text-align:center">
            <span class="underline" style="width:100%;display:inline-block">${esc(form.kagawadName)}</span>
            <div style="margin-top:6px">Barangay Kagawad</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function(){
      function mmToPx(mm){ return mm * 96 / 25.4; }
      function whenReady(fn){ if (document.readyState === 'complete') return fn(); window.addEventListener('load', fn); setTimeout(fn, 500); }
      whenReady(function(){
        try{
          const marginMM=12;
          const pageW=mmToPx(210-marginMM*2);
          const pageH=mmToPx(297-marginMM*2);
          const container=document.querySelector('.bpo-printable');
          if(container){
            const contentW=container.scrollWidth;
            const contentH=container.scrollHeight;
            const scaleW=pageW/contentW;
            const scaleH=pageH/contentH;
            const scale=Math.min(1,Math.min(scaleW,scaleH));
            if(scale<1){
              container.style.transformOrigin='top left';
              container.style.transform='scale('+scale+')';
              document.body.style.width=(210/scale)+'mm';
            }
          }
          window.focus();
          function closeOnce(){ try{ window.close(); }catch(e){} }
          if ('onafterprint' in window) {
            window.onafterprint = closeOnce;
          } else if (window.matchMedia) {
            try{
              const mql = window.matchMedia('print');
              const listener = function(m){ if (!m.matches) { closeOnce(); try{ mql.removeEventListener('change', listener); }catch(e){ try{ mql.removeListener(listener); }catch(e){} } } };
              try{ mql.addEventListener('change', listener); }catch(e){ try{ mql.addListener(listener); }catch(e){} }
            }catch(e){}
          }
          window.print();
        }catch(e){ console.error('print error',e); }
        setTimeout(function(){ try{ window.close(); }catch(e){} }, 3000);
      });
    })();
  </script>
</body>
</html>`;

    const popup = window.open(
      "",
      "_blank",
      "toolbar=0,location=0,menubar=0,width=900,height=1100"
    );
    if (!popup) {
      message.info("Please allow popups to export.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    try {
      popup.focus();
    } catch { }
  };

  const underlineStyle = {
    border: 0,
    borderBottom: "1px solid #000",
    boxShadow: "none",
    padding: 4,
  };

  /*** LAYOUT with sticky header ***/
  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "visible",
      }}
    >
      {contextHolder}
      {/* Sticky header */}
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
          {/* sidebar toggle (visible only on small screens) */}
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

          {/* Back button for desktop */}
          {screens.md && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{
                borderColor: BRAND.violet,
                color: BRAND.violet,
                borderRadius: 10,
              }}
            >
              Back
            </Button>
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              {isXs ? "New BPO" : "Create New BPO"}
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Fill in the details to create a Barangay Protection Order.
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: isXs ? 6 : 8 }}>
          {!screens.md && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ 
                borderColor: BRAND.violet, 
                color: BRAND.violet,
                height: isXs ? 32 : 36,
                minWidth: isXs ? 32 : 36,
                padding: 0,
                fontSize: isXs ? 14 : 16,
                borderRadius: 8,
              }}
            />
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={exportCurrent}
            style={{ 
              borderColor: BRAND.violet, 
              color: BRAND.violet,
              height: isXs ? 32 : 36,
              fontSize: isXs ? 13 : 14,
              padding: isXs ? "0 10px" : "4px 15px",
              borderRadius: isXs ? 8 : 10,
              fontWeight: 600,
            }}
          >
            {screens.md ? "Export" : null}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={submit}
            disabled={loading}
            loading={loading}
            style={{ 
              background: BRAND.violet, 
              borderColor: BRAND.violet,
              height: isXs ? 32 : 36,
              fontSize: isXs ? 13 : 14,
              padding: isXs ? "0 10px" : "4px 15px",
              borderRadius: isXs ? 8 : 10,
              fontWeight: 600,
            }}
          >
            {screens.md ? (loading ? "Saving..." : "Save") : null}
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: 12,
          paddingTop: 12,
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingInline: screens.xs ? 6 : 12,
            boxSizing: "border-box",
          }}
        >
        {/* Case Selection Card */}
        <Card
          style={{
            maxWidth: 900,
            margin: "0 auto 24px",
            background: "#fff",
            borderRadius: isXs ? 12 : 18,
            borderColor: BRAND.softBorder,
            boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
          }}
          bodyStyle={{ padding: isXs ? 12 : 20 }}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileTextOutlined style={{ fontSize: 18, color: BRAND.violet }} />
              <Title level={5} style={{ margin: 0, color: BRAND.violet }}>
                Select a Case (Optional)
              </Title>
            </div>
            <Text type="secondary">
              Choose an existing case to automatically fill in the BPO details, or leave blank to create a new BPO manually.
            </Text>
            <Select
              showSearch
              allowClear
              placeholder="Search and select a case..."
              style={{ width: "100%" }}
              loading={loadingCases}
              onChange={handleCaseSelect}
              value={selectedCase ? (selectedCase.caseID || selectedCase._id) : undefined}
              filterOption={(input, option) => {
                const searchText = input.toLowerCase();
                return (
                  option.children.toLowerCase().includes(searchText) ||
                  option.value.toLowerCase().includes(searchText)
                );
              }}
              notFoundContent={loadingCases ? <Spin size="small" /> : "No cases available"}
            >
              {cases.map((caseItem) => (
                <Option
                  key={caseItem._id || caseItem.caseID}
                  value={caseItem.caseID || caseItem._id}
                >
                  {`${caseItem.caseID || caseItem._id} - ${caseItem.victimName || "Unknown"} (${caseItem.incidentType || "N/A"})`}
                </Option>
              ))}
            </Select>
            {selectedCase && (
              <Card
                size="small"
                style={{
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                }}
              >
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Text strong style={{ color: "#237804" }}>
                    Selected Case Details:
                  </Text>
                  <div>
                    <Text type="secondary">Case ID: </Text>
                    <Text strong>{selectedCase.caseID || selectedCase._id}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Victim: </Text>
                    <Text>{selectedCase.victimName || "N/A"}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Perpetrator: </Text>
                    <Text>{selectedCase.perpetrator || "N/A"}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Incident Type: </Text>
                    <Text>{selectedCase.incidentType || "N/A"}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Status: </Text>
                    <Text>{selectedCase.status || "N/A"}</Text>
                  </div>
                </Space>
              </Card>
            )}
          </Space>
        </Card>

        {/* FORM CONTENT (unchanged) */}
        <div
          className="bpo-printable"
          style={{
            maxWidth: 900,
            margin: isXs ? "12px auto" : "18px auto",
            padding: isXs ? "16px 12px" : "28px",
            background: "#fff",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14 }}>Republic of the Philippines</div>
            <div style={{ fontSize: 14 }}>Province of Nueva Vizcaya</div>
            <div style={{ fontSize: 14 }}>Municipality of Bayombong</div>
            <div style={{ fontSize: 14 }}>Barangay Bonfal Proper</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              OFFICE OF THE PUNONG BARANGAY
            </div>
          </div>

          <Title level={3} style={{ textAlign: "center", marginTop: 10, marginBottom: 6 }}>
            BARANGAY PROTECTION ORDER
          </Title>

          {/* control no top bar */}
          <div
            style={{
              display: "flex",
              flexDirection: isXs ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isXs ? "flex-start" : "center",
              marginBottom: 6,
              gap: isXs ? 6 : 0,
            }}
          >
            <div>
              <Text strong>VAWC FORM #4</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: isXs ? "wrap" : "nowrap" }}>
              <Text>CONTROL NO.</Text>
              <Input
                value={form.controlNo}
                onChange={update("controlNo")}
                style={{ ...underlineStyle, width: isXs ? 120 : 160 }}
                placeholder="CONTROL NO."
                readOnly
                disabled
              />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 10 }}>
              <Text strong>Name of Respondent: </Text>
              <Input
                value={form.respondent}
                onChange={handleValidatedUpdate("respondent")}
                style={{ 
                  ...underlineStyle, 
                  width: isXs ? "100%" : "68%",
                  borderColor: validationErrors.respondent ? "#ff4d4f" : undefined,
                }}
                placeholder="Respondent full name"
              />
              {validationErrors.respondent && (
                <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                  {validationErrors.respondent}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <Text strong>Address: </Text>
              <Input
                value={form.address}
                onChange={handleValidatedUpdate("address")}
                style={{ 
                  ...underlineStyle, 
                  width: isXs ? "100%" : "75%",
                  borderColor: validationErrors.address ? "#ff4d4f" : undefined,
                }}
                placeholder="Respondent address"
              />
              {validationErrors.address && (
                <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                  {validationErrors.address}
                </div>
              )}
            </div>

            <Title level={3} style={{ textAlign: "center", marginTop: 8, marginBottom: 6 }}>
              ORDER
            </Title>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0 }}>
                <Text strong>Applicant Name: </Text>
                <Input
                  value={form.applicant}
                  onChange={handleValidatedUpdate("applicant")}
                  style={{ 
                    ...underlineStyle, 
                    width: isXs ? "100%" : 260,
                    marginLeft: isXs ? 0 : undefined,
                    borderColor: validationErrors.applicant ? "#ff4d4f" : undefined,
                  }}
                  placeholder="Applicant"
                />
                {validationErrors.applicant && (
                  <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                    {validationErrors.applicant}
                  </div>
                )}
              </div>
              <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0, marginTop: isXs ? 8 : 0 }}>
                <span style={{ marginLeft: isXs ? 0 : 12 }}>applied for a BPO on</span>
                <DatePicker value={form.appliedOn} onChange={updateDate("appliedOn")} style={{ marginLeft: isXs ? 0 : 8, width: isXs ? "100%" : "auto" }} />
                <span style={{ marginLeft: isXs ? 0 : 8, marginTop: isXs ? 8 : 0 }}>under oath stating that:</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <textarea
                rows={3}
                value={form.statement}
                onChange={(e) => {
                  const error = validateField("statement", e.target.value);
                  setValidationErrors((prev) => ({ ...prev, statement: error }));
                  setForm((s) => ({ ...s, statement: e.target.value }));
                }}
                placeholder="Statement / facts under oath…"
                style={{
                  width: "100%",
                  padding: 8,
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: 15,
                  border: validationErrors.statement ? "2px solid #ff4d4f" : "1px solid #ccc",
                  resize: "vertical",
                }}
              />
              {validationErrors.statement && (
                <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                  {validationErrors.statement}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0 }}>
                <span>
                  After having heard the application and the witnesses and
                  evidence, the undersigned hereby issues this BPO ordering you to
                  immediately cease and desist from causing or threatening the
                  cause physical harm to{" "}
                </span>
                <Input
                  value={form.harmTo}
                  onChange={handleValidatedUpdate("harmTo")}
                  style={{ 
                    ...underlineStyle, 
                    width: isXs ? "100%" : 120, 
                    marginLeft: isXs ? 0 : 8, 
                    marginRight: isXs ? 0 : 8,
                    borderColor: validationErrors.harmTo ? "#ff4d4f" : undefined,
                  }}
                  placeholder="Her/His"
                />
                {validationErrors.harmTo && (
                  <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                    {validationErrors.harmTo}
                  </div>
                )}
              </div>
              <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0, marginTop: isXs ? 8 : 0 }}>
                <span>and/or her child/children namely:</span>
                <Input
                  value={form.children}
                  onChange={handleValidatedUpdate("children")}
                  style={{ 
                    ...underlineStyle, 
                    width: isXs ? "100%" : 360, 
                    marginLeft: isXs ? 0 : 8,
                    borderColor: validationErrors.children ? "#ff4d4f" : undefined,
                  }}
                  placeholder="Names of children"
                />
                {validationErrors.children && (
                  <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                    {validationErrors.children}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Text strong>This BPO is effective for 15 days from receipt.</Text>
            </div>

            <div style={{ marginTop: 8, textAlign: "center" }}>
              <div style={{ textTransform: "uppercase", fontWeight: 700 }}>
                Violation of this order is punishable by law
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>{form.pbName}</div>
                <div>Punong Barangay</div>
                <div style={{ marginTop: 8, display: isXs ? "flex" : "block", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0 }}>
                  <Text>Date Issued: </Text>
                  <DatePicker
                    value={form.dateIssued}
                    onChange={updateDate("dateIssued")}
                    style={{ width: isXs ? "100%" : "auto" }}
                  />
                </div>
              </div>
            </div>

            {/* Receipt / Served */}
            <div style={{ marginTop: 22, paddingTop: 12 }}>
              <div style={{ display: "flex", flexDirection: isXs ? "column" : "row", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: isXs ? "100%" : 320 }}>
                  <Text strong>Copy received by:</Text>
                  <Input
                    value={form.receivedBy}
                    onChange={handleValidatedUpdate("receivedBy")}
                    style={{ 
                      ...underlineStyle, 
                      width: "100%", 
                      marginTop: 8,
                      borderColor: validationErrors.receivedBy ? "#ff4d4f" : undefined,
                    }}
                    placeholder="Printed name"
                  />
                  {validationErrors.receivedBy && (
                    <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                      {validationErrors.receivedBy}
                    </div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Signature over Printed Name
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <Text strong>Date received:</Text>
                    <div style={{ marginTop: 8 }}>
                      <DatePicker
                        value={form.dateReceived}
                        onChange={updateDate("dateReceived")}
                        style={{ width: isXs ? "100%" : "auto" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Text strong>Served by:</Text>
                    <Input
                      value={form.servedBy}
                      onChange={handleValidatedUpdate("servedBy")}
                      style={{ 
                        ...underlineStyle, 
                        width: "100%", 
                        marginTop: 8,
                        borderColor: validationErrors.servedBy ? "#ff4d4f" : undefined,
                      }}
                      placeholder="Printed name"
                    />
                    {validationErrors.servedBy && (
                      <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                        {validationErrors.servedBy}
                      </div>
                    )}
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      Signature over Printed Name
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1 }}>{/* reserved */}</div>
              </div>
            </div>

            {/* Attestation */}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>ATTESTATION</div>
              <div style={{ marginTop: 4 }}>
                (In Case the Punong Barangay is Unavailable)
              </div>

              <div
                style={{
                  marginTop: 12,
                  textAlign: "left",
                  maxWidth: 760,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0 }}>
                  <Text>I hereby attest that Punong Barangay </Text>
                  <Input
                    value={form.pbName}
                    onChange={update("pbName")}
                    style={{ ...underlineStyle, width: isXs ? "100%" : 260, marginLeft: isXs ? 0 : 8, marginRight: isXs ? 0 : 8 }}
                  />
                </div>
                <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0, marginTop: isXs ? 8 : 0 }}>
                  <span>was unavailable to act on</span>
                  <DatePicker
                    value={form.attestDate}
                    onChange={updateDate("attestDate")}
                    style={{ marginLeft: isXs ? 0 : 8, width: isXs ? "100%" : "auto" }}
                  />
                </div>
                <div style={{ display: isXs ? "flex" : "inline", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 0, marginTop: isXs ? 8 : 0 }}>
                  <span>at</span>
                  <TimePicker
                    value={form.attestTime}
                    onChange={updateTime}
                    format="hh:mm A"
                    use12Hours
                    style={{ marginLeft: isXs ? 0 : 8, width: isXs ? "100%" : "auto" }}
                  />
                  <span style={{ marginLeft: isXs ? 0 : 4 }}>a.m./p.m. and issue such order.</span>
                </div>
              </div>

              {/* Barangay Kagawad Signature */}
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <div style={{ width: isXs ? "100%" : 260, textAlign: "center" }}>
                  <Input
                    value={form.kagawadName}
                    onChange={handleValidatedUpdate("kagawadName")}
                    style={{ 
                      ...underlineStyle, 
                      width: "100%",
                      borderColor: validationErrors.kagawadName ? "#ff4d4f" : undefined,
                    }}
                    placeholder="VAWC Chairman name"
                  />
                  {validationErrors.kagawadName && (
                    <div style={{ color: "#ff4d4f", fontSize: 12, marginTop: 4 }}>
                      {validationErrors.kagawadName}
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: 12 }}>Barangay Kagawad</div>
                </div>
              </div>

              {/* Saved banner */}
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {savedId && (
                  <div style={{ marginTop: 6, width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                      }}
                    >
                      <CheckCircleOutlined
                        style={{ color: "#52c41a", fontSize: 22 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#237804",
                          }}
                        >
                          Saved BPO
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#52c41a",
                          }}
                        >
                          {savedId}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: isXs ? "column" : "row", gap: isXs ? 6 : 8 }}>
                        <Button
                          size="small"
                          onClick={() => copyIdToClipboard(savedId)}
                          icon={<CopyOutlined />}
                          style={{ width: isXs ? "100%" : "auto" }}
                        >
                          Copy ID
                        </Button>
                        <Button
                          size="small"
                          onClick={() => openBpoDetail(savedId)}
                          icon={<EyeOutlined />}
                          style={{ width: isXs ? "100%" : "auto" }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* print overrides (for export popup too) */}
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

          /* Responsive adjustments for mobile */
          @media (max-width: 576px) {
            .ant-input-search,
            .ant-input,
            .ant-select-selector,
            .ant-picker {
              font-size: 14px !important;
            }
            
            .ant-card-head-title {
              font-size: 15px !important;
            }
            
            .ant-typography {
              font-size: 14px;
            }
          }

          @media print {
            button, .ant-btn { display: none !important; }
            .sider-modern, .ant-layout-header, .ant-layout-footer, .menu-modern, .ant-layout-sider { display: none !important; }
            input::placeholder, textarea::placeholder { color: transparent; }
            body, div { color: #000 !important; }
            @page { size: A4; margin: 12mm; }
            .bpo-printable { margin: 0; padding: 6mm; width: 100%; box-shadow: none !important; }
          }
        `}</style>
      </Content>
    </Layout>
  );
}
