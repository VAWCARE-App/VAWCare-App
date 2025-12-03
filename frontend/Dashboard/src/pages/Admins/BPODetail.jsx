import React, { useEffect, useState } from 'react';
import { Input, Typography, Button, message, Layout, Space, Divider, Grid } from 'antd';
import { PrinterOutlined, ArrowLeftOutlined, MenuOutlined, DownloadOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { api, getUserType } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

// ==== brand colors ====
const BRAND = {
  violet: '#7A5AF8',
  pink: '#e91e63',
  pageBg: 'linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)',
  softBorder: 'rgba(122,90,248,0.18)',
};

export default function BPODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const [form, setForm] = useState({});
  const [originalForm, setOriginalForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const handlePrint = () => {
    const el = document.querySelector('.bpo-printable');
    if (!el) return window.print();
    const clone = el.cloneNode(true);
    try {
      const originals = el.querySelectorAll('input, textarea, select');
      const clones = clone.querySelectorAll('input, textarea, select');
      originals.forEach((orig, i) => {
        const c = clones[i];
        if (!c) return;
        if (orig.tagName.toLowerCase() === 'textarea') {
          c.textContent = orig.value || orig.textContent || '';
        } else if (orig.tagName.toLowerCase() === 'select') {
          Array.from(c.options).forEach(opt => opt.selected = false);
          const val = orig.value;
          Array.from(c.options).forEach(opt => { if (opt.value === val) opt.selected = true; });
        } else {
          c.setAttribute('value', orig.value || '');
          c.value = orig.value || '';
        }
      });
    } catch (e) {
      console.warn('Could not copy input values for print clone', e);
    }

    const printableHTML = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barangay Protection Order</title>
          <style>
            html,body{margin:0;padding:0;color:#000;font-family: 'Times New Roman', Times, serif}
            .bpo-printable{box-sizing:border-box;width:186mm;padding:12mm;margin:0 auto}
            button, .ant-btn{display:none !important}
            input::placeholder, textarea::placeholder{color:transparent !important}
            .bpo-printable *{break-inside:avoid}
            @page{size:A4;margin:12mm}
          </style>
        </head>
        <body>
          <div class="bpo-printable">${clone.innerHTML}</div>
          <script>
            (function(){
              function mmToPx(mm){ return mm * 96 / 25.4; }
              function whenReady(fn){ if (document.readyState === 'complete') return fn(); window.addEventListener('load', fn); setTimeout(fn, 500); }
              function doPrint(){
                try{
                  const marginMM = 12;
                  const pageW = mmToPx(210 - marginMM*2);
                  const pageH = mmToPx(297 - marginMM*2);
                  const container = document.querySelector('.bpo-printable');
                  if (container) {
                    const contentW = container.scrollWidth;
                    const contentH = container.scrollHeight;
                    const scaleW = pageW / contentW;
                    const scaleH = pageH / contentH;
                    const scale = Math.min(1, Math.min(scaleW, scaleH));
                    if (scale < 1) {
                      container.style.transformOrigin = 'top left';
                      container.style.transform = 'scale(' + scale + ')';
                      document.body.style.width = (210 / scale) + 'mm';
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
                }catch(e){ console.error('print error', e); }
                setTimeout(function(){ try{ window.close(); }catch(e){} }, 3000);
              }
              window.addEventListener('message', function(evt){
                try{
                  if (evt && evt.data && evt.data.type === 'bpo-print') {
                    whenReady(doPrint);
                  }
                }catch(e){}
              }, false);
            })();
          </script>
        </body>
      </html>`;

    try {
      if (window.__bpoPrintPopup && !window.__bpoPrintPopup.closed) {
        try { window.__bpoPrintPopup.close(); } catch (e) { }
        window.__bpoPrintPopup = null;
      }
    } catch (e) { }

    const popup = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=900,height=1100');
    if (!popup) { window.print(); return; }
    try { window.__bpoPrintPopup = popup; } catch (e) { }
    popup.document.open();
    popup.document.write(printableHTML);
    popup.document.close();
    try {
      popup.focus();
      setTimeout(() => {
        try { popup.postMessage({ type: 'bpo-print' }, '*'); } catch (e) { console.warn('postMessage failed', e); }
      }, 250);
    } catch (e) { }
  };

  useEffect(() => {
    const fetchBPO = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/bpo/${id}`);
        const data = res?.data?.data;
        if (data) {
          const formData = {
            controlNo: data.controlNO || '',
            respondent: data.nameofRespondent || '',
            address: data.address || '',
            applicant: data.applicationName || '',
            appliedOn: data.orderDate ? new Date(data.orderDate) : null,
            statement: data.statement || '',
            harmTo: data.hisOrher || '',
            children: data.nameofChildren || '',
            dateIssued: data.dateIssued ? new Date(data.dateIssued) : null,
            receivedBy: data.copyReceivedBy || '',
            dateReceived: data.dateReceived ? new Date(data.dateReceived) : null,
            servedBy: data.servedBy || '',
            pbName: data.punongBarangay || 'REGINA CRISTINA D. TUMACDER',
            attestDate: data.unavailabledate ? new Date(data.unavailabledate) : null,
            attestTime: data.time || '',
            kagawadName: data.barangaykagawad || '',
            status: data.status || '',
            bpoID: data.bpoID || data._id || '',
          };
          setForm(formData);
          setOriginalForm(formData);
        }
      } catch (err) {
        console.error('Failed to load BPO', err);
        message.error('Failed to load BPO');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBPO();
  }, [id]);

  const handleSaveChanges = async () => {
    setSaveLoading(true);
    try {
      const updateData = {
        nameofRespondent: form.respondent,
        address: form.address,
        applicationName: form.applicant,
        orderDate: form.appliedOn,
        statement: form.statement,
        hisOrher: form.harmTo,
        nameofChildren: form.children,
        dateIssued: form.dateIssued,
        copyReceivedBy: form.receivedBy,
        dateReceived: form.dateReceived,
        servedBy: form.servedBy,
        punongBarangay: form.pbName,
        unavailabledate: form.attestDate,
        time: form.attestTime,
        barangaykagawad: form.kagawadName,
      };

      await api.put(`/api/bpo/${form.bpoID}`, updateData);
      message.success('BPO updated successfully');
      setOriginalForm(form);
      setIsEditMode(false);
    } catch (err) {
      console.error('Failed to update BPO', err);
      message.error('Failed to update BPO');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(originalForm);
    setIsEditMode(false);
  };

  const handleFieldChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "visible",
      }}
    >
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
              {isXs ? "BPO Details" : "Barangay Protection Order Details"}
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                View and edit BPO information.
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!screens.md && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ borderColor: BRAND.violet, color: BRAND.violet }}
            />
          )}
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={async () => {
              const downloadUrl = `${import.meta.env.VITE_API_URL}/api/bpo/${form.bpoID}/pdf`;

              try {
                const response = await fetch(downloadUrl, {
                  headers: {
                    "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY,
                  },
                });

                if (!response.ok) throw new Error("Failed to fetch PDF");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = url;
                link.download = `bpo_${form.bpoID}.pdf`;
                link.click();

                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
              }
            }}
            style={{ background: BRAND.violet, borderColor: BRAND.violet }}
          >
            {screens.md ? "Download PDF" : null}
          </Button>

          {!isEditMode ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditMode(true)}
              style={{ borderColor: BRAND.violet, color: BRAND.violet }}
            >
              {screens.md ? "Edit" : null}
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveLoading}
                onClick={handleSaveChanges}
                style={{ background: BRAND.violet, borderColor: BRAND.violet }}
              >
                {screens.md ? "Save" : null}
              </Button>
              <Button onClick={handleCancel}>
                {screens.md ? "Cancel" : null}
              </Button>
            </>
          )}
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
          <div
            className="bpo-printable"
            style={{
              maxWidth: 900,
              margin: '18px auto',
              padding: 28,
              background: '#fff',
              fontFamily: "'Times New Roman', Times, serif",
              color: '#000'
            }}
          >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14 }}>Republic of the Philippines</div>
          <div style={{ fontSize: 14 }}>Province of Nueva Vizcaya</div>
          <div style={{ fontSize: 14 }}>Municipality of Bayombong</div>
          <div style={{ fontSize: 14 }}>Barangay Bonfal Proper</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>OFFICE OF THE PUNONG BARANGAY</div>
        </div>

        <Title level={3} style={{ textAlign: 'center', marginTop: 10, marginBottom: 6 }}>BARANGAY PROTECTION ORDER</Title>

        {!loading && !form.bpoID && (
          <div style={{ textAlign: 'center', margin: '8px 0', color: BRAND.violet }}>
            <Text>No BPO data loaded — check the browser console and ensure the URL contains the correct bpo id.</Text>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <Text strong>VAWC FORM #4</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>CONTROL NO.</Text>
            <Input value={form.controlNo} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 160 }} />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 10 }}>
            <Text strong>Name of Respondent: </Text>
            <Input 
              value={form.respondent} 
              onChange={(e) => handleFieldChange('respondent', e.target.value)}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', width: '68%', background: isEditMode ? '#fff' : 'transparent' }} 
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <Text strong>Address: </Text>
            <Input 
              value={form.address} 
              onChange={(e) => handleFieldChange('address', e.target.value)}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', width: '75%', background: isEditMode ? '#fff' : 'transparent' }} 
            />
          </div>

          <Title level={3} style={{ textAlign: 'center', marginTop: 8, marginBottom: 6 }}>ORDER</Title>

          <div style={{ marginBottom: 12 }}>
            <Text strong>Applicant Name: </Text>
            <Input 
              value={form.applicant} 
              onChange={(e) => handleFieldChange('applicant', e.target.value)}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', width: 260, background: isEditMode ? '#fff' : 'transparent' }} 
            />
            <span style={{ marginLeft: 12 }}>applied for a BPO on</span>
            <Input 
              value={form.appliedOn ? new Date(form.appliedOn).toLocaleDateString() : ''} 
              onChange={(e) => handleFieldChange('appliedOn', new Date(e.target.value))}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 140, background: isEditMode ? '#fff' : 'transparent' }} 
            />
            <span style={{ marginLeft: 8 }}>under oath stating that:</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <textarea 
              rows={3} 
              value={form.statement} 
              onChange={(e) => handleFieldChange('statement', e.target.value)}
              readOnly={!isEditMode}
              placeholder="Statement / facts under oath…" 
              style={{ width: '100%', padding: 8, fontFamily: "'Times New Roman', Times, serif", fontSize: 15, border: '1px solid #ccc', resize: 'none', background: isEditMode ? '#fff' : 'transparent' }} 
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>After having heard the application and the witnesses and evidence, the undersigned hereby issues this BPO ordering you to immediately cease and desist from causing or threatening the cause physical harm to </span>
            <Input 
              value={form.harmTo} 
              onChange={(e) => handleFieldChange('harmTo', e.target.value)}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', width: 120, marginLeft: 8, marginRight: 8, background: isEditMode ? '#fff' : 'transparent' }} 
            />
            <span>and/or her child/children namely:</span>
            <Input 
              value={form.children} 
              onChange={(e) => handleFieldChange('children', e.target.value)}
              readOnly={!isEditMode}
              style={{ border: 0, borderBottom: '1px solid #000', width: 360, marginLeft: 8, background: isEditMode ? '#fff' : 'transparent' }} 
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Text strong>This BPO is effective for 15 days from receipt.</Text>
          </div>

          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <div style={{ textTransform: 'uppercase', fontWeight: 700 }}>Violation of this order is punishable by law</div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div />
            <div style={{ textAlign: 'center' }}>
              <Input 
                value={form.pbName} 
                onChange={(e) => handleFieldChange('pbName', e.target.value)}
                readOnly={!isEditMode}
                style={{ border: 0, borderBottom: isEditMode ? '1px solid #000' : 0, width: '100%', textAlign: 'center', fontWeight: 700, background: isEditMode ? '#fff' : 'transparent' }}
              />
              <div>Punong Barangay</div>
              <div style={{ marginTop: 8 }}>
                <Text>Date Issued: </Text>
                <Input 
                  value={form.dateIssued ? new Date(form.dateIssued).toLocaleDateString() : ''} 
                  onChange={(e) => handleFieldChange('dateIssued', new Date(e.target.value))}
                  readOnly={!isEditMode}
                  style={{ border: 0, borderBottom: '1px solid #000', width: 160, background: isEditMode ? '#fff' : 'transparent' }} 
                />
              </div>
            </div>
          </div>

          {/* Receipt / Served section */}
          <div style={{ marginTop: 22, paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 320 }}>
                <Text strong>Copy received by:</Text>
                <Input 
                  value={form.receivedBy} 
                  onChange={(e) => handleFieldChange('receivedBy', e.target.value)}
                  readOnly={!isEditMode}
                  style={{ border: 0, borderBottom: '1px solid #000', width: '100%', marginTop: 8, background: isEditMode ? '#fff' : 'transparent' }} 
                />
                <div style={{ fontSize: 12, marginTop: 6 }}>Signature over Printed Name</div>

                <div style={{ marginTop: 10 }}>
                  <Text strong>Date received:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Input 
                      value={form.dateReceived ? new Date(form.dateReceived).toLocaleDateString() : ''} 
                      onChange={(e) => handleFieldChange('dateReceived', new Date(e.target.value))}
                      readOnly={!isEditMode}
                      style={{ border: 0, borderBottom: '1px solid #000', width: 160, background: isEditMode ? '#fff' : 'transparent' }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Text strong>Served by:</Text>
                  <Input 
                    value={form.servedBy} 
                    onChange={(e) => handleFieldChange('servedBy', e.target.value)}
                    readOnly={!isEditMode}
                    style={{ border: 0, borderBottom: '1px solid #000', width: '100%', marginTop: 8, background: isEditMode ? '#fff' : 'transparent' }} 
                  />
                  <div style={{ fontSize: 12, marginTop: 6 }}>Signature over Printed Name</div>
                </div>
              </div>

              <div style={{ flex: 1 }} />
            </div>
          </div>

          {/* Attestation */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>ATTESTATION</div>
            <div style={{ marginTop: 4 }}>(In Case the Punong Barangay is Unavailable)</div>

            <div style={{ marginTop: 12, textAlign: 'left', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
              <Text>I hereby attest that Punong Barangay </Text>
              <Input 
                value={form.pbName} 
                onChange={(e) => handleFieldChange('pbName', e.target.value)}
                readOnly={!isEditMode}
                style={{ border: 0, borderBottom: '1px solid #000', width: 260, marginLeft: 8, marginRight: 8, background: isEditMode ? '#fff' : 'transparent' }} 
              />
              was unavailable to act on
              <Input 
                value={form.attestDate ? new Date(form.attestDate).toLocaleDateString() : ''} 
                onChange={(e) => handleFieldChange('attestDate', new Date(e.target.value))}
                readOnly={!isEditMode}
                style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 140, background: isEditMode ? '#fff' : 'transparent' }} 
              /> at
              <Input 
                value={form.attestTime || ''} 
                onChange={(e) => handleFieldChange('attestTime', e.target.value)}
                readOnly={!isEditMode}
                style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 100, background: isEditMode ? '#fff' : 'transparent' }} 
              /> a.m./p.m. and issue such order.
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 260, textAlign: 'center' }}>
                <Input
                  value={form.kagawadName}
                  onChange={(e) => handleFieldChange('kagawadName', e.target.value)}
                  readOnly={!isEditMode}
                  style={{ border: 0, borderBottom: '1px solid #000', width: '100%', textAlign: 'center', background: isEditMode ? '#fff' : 'transparent' }}
                  placeholder="Printed name"
                />
                <div style={{ marginTop: 6 }}>Barangay Kagawad</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
          </div>
        </div>
          </div>
        </div>

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

        @media print {
          button, .ant-btn { display: none !important; }
          .sider-modern, .ant-layout-header, .ant-layout-footer, .menu-modern, .ant-layout-sider { display: none !important; }
          input::placeholder, textarea::placeholder { color: transparent; }
          body, div { color: #000 !important; }
          @page { size: A4; margin: 12mm; }
          .bpo-printable { margin: 0; padding: 6mm; width: 100%; box-shadow: none !important; }
          .bpo-printable * { break-inside: avoid; }
        }
        .bpo-printable { box-shadow: 0 0 0 1px rgba(0,0,0,0.05); }
      `}</style>
      </Content>
    </Layout>
  );
}
