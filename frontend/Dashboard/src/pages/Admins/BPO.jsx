import React, { useState } from "react";
import { Input, DatePicker, TimePicker, Typography, Button, Row, Col, message, notification } from "antd";
import { CheckCircleOutlined, CopyOutlined, EyeOutlined } from '@ant-design/icons';
import { api, getUserType } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function BPO() {
  const userType = getUserType();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (userType !== 'admin' && userType !== 'official') navigate('/', { replace: true });
  }, [userType, navigate]);

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
  // helper to copy ID to clipboard and show message
  const copyIdToClipboard = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      message.success('BPO ID copied to clipboard');
    } catch (e) {
      console.error('Copy failed', e);
      message.error('Could not copy to clipboard');
    }
  };

  const openBpoDetail = (id) => {
    // Navigate to the BPO detail route within the current tab
    navigate(`/admin/bpo/${id}`);
  };

  const update = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm((s) => ({ ...s, [k]: v }));
  };
  const updateDate = (k) => (date) => setForm((s) => ({ ...s, [k]: date }));
  const updateTime = (time) => setForm((s) => ({ ...s, attestTime: time }));

  const submit = async () => {
    // rudimentary validation
    if (!form.respondent || !form.applicant) {
      message.error("Please fill in at least the respondent and applicant fields.");
      return;
    }

    // Map frontend keys to backend model fields
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
      dateReceived: form.dateReceived ? form.dateReceived.toISOString() : undefined,
      servedBy: form.servedBy || undefined,
      punongBarangay: form.pbName || undefined,
      unavailabledate: form.attestDate ? form.attestDate.toISOString() : undefined,
      time: form.attestTime ? form.attestTime.format('hh:mm A') : undefined,
      barangaykagawad: form.kagawadName || undefined,
    };

    setLoading(true);
    setSavedId(null);
    try {
      const res = await api.post('/api/bpo', { data: mapped });
      const created = res?.data?.data;
      const id = created?.bpoID || created?._id;
      setSavedId(id || null);
      console.log('BPO saved', created);
      message.success(id ? `BPO saved (ID: ${id})` : 'BPO saved successfully');
      // show a non-blocking notification popup with the saved ID and brief info
      notification.success({
        message: 'BPO Saved',
        description: id ? `Saved successfully (ID: ${id})` : 'Saved successfully',
        duration: 6,
      });
      // If we have an id, open a printable popup titled with the BPOID and auto-print then close
      if (id) {
        try {
          printSavedBPO(id, created);
        } catch (e) {
          console.warn('Auto-print after save failed', e);
        }
      }
    } catch (err) {
      const srvMsg = err?.response?.data?.message || err?.message || 'Unknown error';
      console.error('Save failed:', err);
      message.error(`Save failed: ${srvMsg}`);
      notification.error({
        message: 'Save Failed',
        description: srvMsg,
        duration: 6,
      });
      // keep mapped payload in console for debugging
      console.log('BPO payload (not saved):', mapped);
    } finally {
      setLoading(false);
    }
  };

  // Open a popup with printable HTML for the just-saved BPO, set the document title to include BPOID
  const printSavedBPO = (id, created) => {
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    const fmtDate = (d) => {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString(); } catch(e) { return String(d); }
    };

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>BPO-${esc(id)}</title>
          <style>
            html,body{margin:0;padding:0;color:#000;font-family: 'Times New Roman', Times, serif}
            /* center the printable block on the page and keep a comfortable inner width */
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
              <div style="margin-bottom:10px"><strong>Name of Respondent:</strong> <span class="underline" style="width:68%;display:inline-block">${esc(form.respondent)}</span></div>
              <div style="margin-bottom:10px"><strong>Address:</strong> <span class="underline" style="width:75%;display:inline-block">${esc(form.address)}</span></div>

              <h3 style="text-align:center;margin-top:8px;margin-bottom:6px">ORDER</h3>

              <div style="margin-bottom:12px">
                <strong>Applicant Name:</strong>
                <span class="underline" style="width:260px;display:inline-block;margin-left:8px">${esc(form.applicant)}</span>
                <span style="margin-left:12px">applied for a BPO on</span>
                <span class="underline" style="margin-left:8px;width:140px;display:inline-block">${esc(fmtDate(form.appliedOn))}</span>
                <span style="margin-left:8px">under oath stating that:</span>
              </div>

              <div style="margin-bottom:12px"><textarea readonly style="width:100%;border:1px solid #ccc;padding:8px;font-family:'Times New Roman',Times,serif;font-size:15px;">${esc(form.statement)}</textarea></div>

              <div style="margin-bottom:8px">After having heard the application and the witnesses and evidence, the undersigned hereby issues this BPO ordering you to immediately cease and desist from causing or threatening the cause physical harm to <span class="underline" style="width:120px;display:inline-block;margin-left:8px;margin-right:8px">${esc(form.harmTo)}</span> and/or her child/children namely: <span class="underline" style="width:360px;display:inline-block;margin-left:8px">${esc(form.children)}</span></div>

              <div style="margin-top:12px"><strong>This BPO is effective for 15 days from receipt.</strong></div>

              <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center">
                <div></div>
                <div style="text-align:center">
                  <div style="font-weight:700">${esc(form.pbName)}</div>
                  <div>Punong Barangay</div>
                  <div style="margin-top:8px"><strong>Date Issued:</strong> <span class="underline" style="width:160px;display:inline-block;margin-left:8px">${esc(fmtDate(form.dateIssued))}</span></div>
                </div>
              </div>

              <!-- Receipt / Served -->
              <div style="margin-top:18px;padding-top:8px;display:flex;gap:12px;align-items:flex-start">
                <div style="flex:1">
                  <div style="display:flex;gap:8px;align-items:center"><strong>Copy received by:</strong><span class="underline" style="width:50%">${esc(form.receivedBy)}</span></div>
                  <div style="display:flex;gap:12px;align-items:center;margin-top:8px"><div style="display:flex;gap:8px;align-items:center"><strong>Date received:</strong><span class="underline" style="width:160px;display:inline-block">${esc(fmtDate(form.dateReceived))}</span></div><div style="display:flex;gap:8px;align-items:center"><strong>Served by:</strong><span class="underline" style="width:240px;display:inline-block">${esc(form.servedBy)}</span></div></div>
                </div>
                <div style="flex:0 0 36%;text-align:center">
                  <div style="height:8px"></div>
                  <div style="border-bottom:1px solid #000;margin:8px 12px"></div>
                  <div style="font-size:12px">Signature over Printed Name</div>
                  <div style="height:18px"></div>
                  <div style="border-bottom:1px solid #000;margin:8px 12px"></div>
                  <div style="font-size:12px">Signature over Printed Name</div>
                </div>
              </div>

              <!-- Attestation (short) -->
              <div style="margin-top:24px;text-align:center">
                <div style="font-weight:700;font-size:16px">ATTESTATION</div>
                <div style="margin-top:4px">(In Case the Punong Barangay is Unavailable)</div>
                <div style="margin-top:12px;text-align:left;max-width:760px;margin-left:auto;margin-right:auto">
                  <span>I hereby attest that Punong Barangay </span><span class="underline" style="width:260px;display:inline-block;margin-left:8px;margin-right:8px">${esc(form.pbName)}</span>
                  was unavailable to act on <span class="underline" style="width:140px;display:inline-block;margin-left:8px">${esc(fmtDate(form.attestDate))}</span> at <span class="underline" style="width:100px;display:inline-block;margin-left:8px">${esc(form.attestTime)}</span> a.m./p.m. and issue such order.
                </div>
                <div style="margin-top:18px;display:flex;justify-content:flex-end"><div style="width:260px;text-align:center"><span class="underline" style="width:100%;display:inline-block">${esc(form.kagawadName)}</span><div style="margin-top:6px">Barangay Kagawad</div></div></div>
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

                  // Close popup after print finishes or if user cancels (onafterprint)
                  function closeOnce(){ try{ window.close(); }catch(e){} }

                  if ('onafterprint' in window) {
                    window.onafterprint = closeOnce;
                  } else if (window.matchMedia) {
                    // matchMedia fallback: when print ends, the media no longer matches
                    try{
                      const mql = window.matchMedia('print');
                      const listener = function(m){ if (!m.matches) { closeOnce(); try{ mql.removeEventListener('change', listener); }catch(e){ try{ mql.removeListener(listener); }catch(e){} } } };
                      try{ mql.addEventListener('change', listener); }catch(e){ try{ mql.addListener(listener); }catch(e){} }
                    }catch(e){ /* ignore */ }
                  }

                  // Trigger print dialog
                  window.print();
                }catch(e){ console.error('print error',e); }

                // Final fallback: ensure the popup closes after a short delay
                setTimeout(function(){ try{ window.close(); }catch(e){} }, 3000);
              });
            })();
          </script>
        </body>
      </html>`;

    // Prevent duplicate print popups: reuse or close any existing one opened by this app
    try {
      if (window.__bpoPrintPopup && !window.__bpoPrintPopup.closed) {
        try { window.__bpoPrintPopup.close(); } catch (e) { /* ignore */ }
        window.__bpoPrintPopup = null;
      }
    } catch (e) {}

    const popup = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=900,height=1100');
    if (!popup) { window.print(); return; }
    // store reference so other calls won't open duplicates
    try { window.__bpoPrintPopup = popup; } catch (e) {}
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    // give the popup a moment to initialize its message listener, then request it to print once
    try {
      popup.focus();
      setTimeout(() => {
        try { popup.postMessage({ type: 'bpo-print' }, '*'); } catch (e) { console.warn('postMessage failed', e); }
      }, 250);
    } catch (e) {}
  };

  const underlineStyle = { border: 0, borderBottom: '1px solid #000', boxShadow: 'none', padding: 4 };

  return (
    <div className="bpo-printable" style={{ maxWidth: 900, margin: '18px auto', padding: 28, background: '#fff', fontFamily: "'Times New Roman', Times, serif", color: '#000' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14 }}>Republic of the Philippines</div>
        <div style={{ fontSize: 14 }}>Province of Nueva Vizcaya</div>
        <div style={{ fontSize: 14 }}>Municipality of Bayombong</div>
        <div style={{ fontSize: 14 }}>Barangay Bonfal Proper</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>OFFICE OF THE PUNONG BARANGAY</div>
      </div>

      <Title level={3} style={{ textAlign: 'center', marginTop: 10, marginBottom: 6 }}>BARANGAY PROTECTION ORDER</Title>

      {/* control no top bar: VAWC FORM #4 on left, Control No. on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <Text strong>VAWC FORM #4</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text>CONTROL NO.</Text>
          <Input value={form.controlNo} onChange={update('controlNo')} style={{ ...underlineStyle, width: 160 }} placeholder="CONTROL NO." />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <Text strong>Name of Respondent: </Text>
          <Input value={form.respondent} onChange={update('respondent')} style={{ ...underlineStyle, width: '68%' }} placeholder="Respondent full name" />
        </div>

        <div style={{ marginBottom: 10 }}>
          <Text strong>Address: </Text>
          <Input value={form.address} onChange={update('address')} style={{ ...underlineStyle, width: '75%' }} placeholder="Respondent address" />
        </div>

        <Title level={3} style={{ textAlign: 'center', marginTop: 8, marginBottom: 6 }}>ORDER</Title>

        <div style={{ marginBottom: 12 }}>
          <Text strong>Applicant Name: </Text>
          <Input value={form.applicant} onChange={update('applicant')} style={{ ...underlineStyle, width: 260 }} placeholder="Applicant" />
          <span style={{ marginLeft: 12 }}>applied for a BPO on</span>
          <DatePicker value={form.appliedOn} onChange={updateDate('appliedOn')} style={{ marginLeft: 8 }} />
          <span style={{ marginLeft: 8 }}>under oath stating that:</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <textarea rows={3} value={form.statement} onChange={(e)=> setForm(s => ({...s, statement: e.target.value}))} placeholder="Statement / facts under oath…" style={{ width: '100%', padding: 8, fontFamily: "'Times New Roman', Times, serif", fontSize: 15, border: '1px solid #ccc', resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <span>After having heard the application and the witnesses and evidence, the undersigned hereby issues this BPO ordering you to immediately cease and desist from causing or threatening the cause physical harm to </span>
          <Input value={form.harmTo} onChange={update('harmTo')} style={{ ...underlineStyle, width: 120, marginLeft: 8, marginRight: 8 }} placeholder="Her/His" />
          <span>and/or her child/children namely:</span>
          <Input value={form.children} onChange={update('children')} style={{ ...underlineStyle, width: 360, marginLeft: 8 }} placeholder="Names of children" />
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
              <DatePicker value={form.dateIssued} onChange={updateDate('dateIssued')} />
            </div>
          </div>
        </div>

  {/* Receipt / Served section (removed dashed divider) */}
  <div style={{ marginTop: 22, paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 320 }}>
              <Text strong>Copy received by:</Text>
              <Input value={form.receivedBy} onChange={update('receivedBy')} style={{ ...underlineStyle, width: '100%', marginTop: 8 }} placeholder="Printed name" />
              <div style={{ fontSize: 12, marginTop: 6 }}>Signature over Printed Name</div>

              <div style={{ marginTop: 10 }}>
                <Text strong>Date received:</Text>
                <div style={{ marginTop: 8 }}>
                  <DatePicker value={form.dateReceived} onChange={updateDate('dateReceived')} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <Text strong>Served by:</Text>
                <Input value={form.servedBy} onChange={update('servedBy')} style={{ ...underlineStyle, width: '100%', marginTop: 8 }} placeholder="Printed name" />
                <div style={{ fontSize: 12, marginTop: 6 }}>Signature over Printed Name</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              {/* right column intentionally left for layout balance or future fields */}
            </div>
          </div>
        </div>

        {/* Attestation */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>ATTESTATION</div>
          <div style={{ marginTop: 4 }}>(In Case the Punong Barangay is Unavailable)</div>

          <div style={{ marginTop: 12, textAlign: 'left', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
            <Text>I hereby attest that Punong Barangay </Text>
            <Input value={form.pbName} onChange={update('pbName')} style={{ ...underlineStyle, width: 260, marginLeft: 8, marginRight: 8 }} />
            was unavailable to act on
            <DatePicker value={form.attestDate} onChange={updateDate('attestDate')} style={{ marginLeft: 8 }} /> at
            <TimePicker
              value={form.attestTime}
              onChange={updateTime}
              format="hh:mm A"
              use12Hours
              style={{ marginLeft: 8 }}
            /> a.m./p.m. and issue such order.
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 260, textAlign: 'center' }}>
              <Input
                value={form.kagawadName}
                onChange={update('kagawadName')}
                style={{ ...underlineStyle, width: '100%', textAlign: 'center' }}
                placeholder="Printed name"
              />
              <div style={{ marginTop: 6 }}>Barangay Kagawad</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button type="primary" onClick={submit} disabled={loading} loading={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
          {/* Printing removed from the form; use the BPODetail page to print */}
          {savedId && (
            <div style={{ marginLeft: 12, marginTop: 6, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 22 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#237804' }}>Saved BPO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#52c41a' }}>{savedId}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyIdToClipboard(savedId)}>Copy ID</Button>
                  <Button size="small" icon={<EyeOutlined />} onClick={() => openBpoDetail(savedId)}>View</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications are shown via Ant Design notification (non-blocking) */}

      <style>{`
        @media print {
          button, .ant-btn { display: none !important; }
          .sider-modern, .ant-layout-header, .ant-layout-footer, .menu-modern, .ant-layout-sider { display: none !important; }
          input::placeholder, textarea::placeholder { color: transparent; }
          body, div { color: #000 !important; }
          @page { size: A4; margin: 12mm; }
          .bpo-printable { margin: 0; padding: 6mm; width: 100%; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
