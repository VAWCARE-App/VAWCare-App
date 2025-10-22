import React, { useEffect, useState } from 'react';
import { Input, Typography, Button, message, Layout, Space, Divider } from 'antd';
import { PrinterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { api, getUserType } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const { Title, Text } = Typography;
const { Content } = Layout;

// ==== brand colors (only change) ====
const BRAND_PRIMARY = '#7A5AF8';     // violet
const BRAND_PAGE_BG = '#F6F3FF';     // soft violet background

export default function BPODetail() {
  const { id } = useParams();
  const userType = getUserType();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (userType !== 'admin' && userType !== 'official') navigate('/', { replace: true });
  }, [userType, navigate]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

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
          setForm({
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
          });
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

  return (
    <Layout style={{ width: "100%", background: BRAND_PAGE_BG, minHeight: "100vh" }}>
      <Content style={{ maxWidth: "100%", paddingTop: 32, paddingBottom: 32, paddingLeft: 16, paddingRight: 16 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          {/* Back button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderColor: BRAND_PRIMARY, color: BRAND_PRIMARY }}
          >
            Back
          </Button>

          {/* Download PDF button */}
          <Button
            type="primary"
            onClick={() => {
              const downloadUrl = `http://localhost:5000/api/bpo/${form.bpoID}/pdf`;
              window.open(downloadUrl, "_blank");
            }}
            style={{ backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY }}
          >
            Download PDF
          </Button>

          {/* Title */}
          <Title level={3} style={{ margin: 0, color: BRAND_PRIMARY }}>
            BPO Details
          </Title>
        </Space>

        <Divider />
      </Content>

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
          <div style={{ textAlign: 'center', margin: '8px 0', color: BRAND_PRIMARY }}>
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
            <Input value={form.respondent} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: '68%' }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <Text strong>Address: </Text>
            <Input value={form.address} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: '75%' }} />
          </div>

          <Title level={3} style={{ textAlign: 'center', marginTop: 8, marginBottom: 6 }}>ORDER</Title>

          <div style={{ marginBottom: 12 }}>
            <Text strong>Applicant Name: </Text>
            <Input value={form.applicant} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 260 }} />
            <span style={{ marginLeft: 12 }}>applied for a BPO on</span>
            <Input value={form.appliedOn ? new Date(form.appliedOn).toLocaleDateString() : ''} readOnly style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 140 }} />
            <span style={{ marginLeft: 8 }}>under oath stating that:</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <textarea rows={3} value={form.statement} readOnly placeholder="Statement / facts under oath…" style={{ width: '100%', padding: 8, fontFamily: "'Times New Roman', Times, serif", fontSize: 15, border: '1px solid #ccc', resize: 'none' }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <span>After having heard the application and the witnesses and evidence, the undersigned hereby issues this BPO ordering you to immediately cease and desist from causing or threatening the cause physical harm to </span>
            <Input value={form.harmTo} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 120, marginLeft: 8, marginRight: 8 }} />
            <span>and/or her child/children namely:</span>
            <Input value={form.children} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 360, marginLeft: 8 }} />
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
              <div style={{ fontWeight: 700 }}>{form.pbName}</div>
              <div>Punong Barangay</div>
              <div style={{ marginTop: 8 }}>
                <Text>Date Issued: </Text>
                <Input value={form.dateIssued ? new Date(form.dateIssued).toLocaleDateString() : ''} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 160 }} />
              </div>
            </div>
          </div>

          {/* Receipt / Served section */}
          <div style={{ marginTop: 22, paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 320 }}>
                <Text strong>Copy received by:</Text>
                <Input value={form.receivedBy} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: '100%', marginTop: 8 }} />
                <div style={{ fontSize: 12, marginTop: 6 }}>Signature over Printed Name</div>

                <div style={{ marginTop: 10 }}>
                  <Text strong>Date received:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Input value={form.dateReceived ? new Date(form.dateReceived).toLocaleDateString() : ''} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 160 }} />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Text strong>Served by:</Text>
                  <Input value={form.servedBy} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: '100%', marginTop: 8 }} />
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
              <Input value={form.pbName} readOnly style={{ border: 0, borderBottom: '1px solid #000', width: 260, marginLeft: 8, marginRight: 8 }} />
              was unavailable to act on
              <Input value={form.attestDate ? new Date(form.attestDate).toLocaleDateString() : ''} readOnly style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 140 }} /> at
              <Input value={form.attestTime || ''} readOnly style={{ border: 0, borderBottom: '1px solid #000', marginLeft: 8, width: 100 }} /> a.m./p.m. and issue such order.
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 260, textAlign: 'center' }}>
                <Input
                  value={form.kagawadName}
                  readOnly
                  style={{ border: 0, borderBottom: '1px solid #000', width: '100%', textAlign: 'center' }}
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

        <style>{`
        @media print {
          button, .ant-btn { display: none !important; }
          .sider-modern, .ant-layout-header, .ant-layout-footer, .menu-modern { display: none !important; }
          input::placeholder, textarea::placeholder { color: transparent; }
          body, div { color: #000 !important; }
          @page { size: A4; margin: 12mm; }
          .bpo-printable { margin: 0; padding: 6mm; width: 100%; box-shadow: none !important; }
          .bpo-printable * { break-inside: avoid; }
        }
        .bpo-printable { box-shadow: 0 0 0 1px rgba(0,0,0,0.05); }
      `}</style>
      </div>
    </Layout>
  );
}
