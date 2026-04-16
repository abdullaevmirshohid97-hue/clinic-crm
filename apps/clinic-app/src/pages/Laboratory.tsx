import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { db } from '../utils/db';
import type { LabTest, LabTestTemplate, LabTestTemplateField, LabPatient, TemplateFieldDraft, LabResultMap, PrintResultField } from '../types/clinic';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';

export default function Laboratory() {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('workflow'); // workflow, templates
  const [tests, setTests] = useState<LabTest[]>([]);
  const [templates, setTemplates] = useState<LabTestTemplate[]>([]);
  const [patients, setPatients] = useState<LabPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({ patientId: '', testName: '', isUrgent: false });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState<{ id: number | null; testName: string; category: string; price: number; fields: TemplateFieldDraft[] }>({ id: null, testName: '', category: '', price: 0, fields: [] });

  const [showResultModal, setShowResultModal] = useState(false);
  const [activeTest, setActiveTest] = useState<LabTest | null>(null);
  const [resultData, setResultData] = useState<LabResultMap>({});

  useEffect(() => { loadData(); }, [activeTab]);

  // --- Barcode Scanner Listener ---
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || showResultModal) return;
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = ''; // slow = human typing
      lastKeyTime = currentTime;
      if (e.key === 'Enter' && buffer.length > 2) {
        const sid = buffer; buffer = '';
        const found = tests.find(t => t.laboratoryId === sid || t.id.toString() === sid);
        if (found) {
          if(!showResultModal) {
             toast.success(`Skanda topildi: ${sid}`);
             openWriteResult(found);
          }
        } else {
          toast.error(`Bunday tahlil yo'q: ${sid}`);
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tests, showResultModal]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'workflow') {
        const ts = await db.query(`
          SELECT lt.*, p.fullName as patientName, p.phone, p.gender, p.birthDate, d.fullName as doctorName 
          FROM laboratory_tests lt
          LEFT JOIN patients p ON lt.patientId = p.id
          LEFT JOIN doctors d ON lt.orderedBy = d.id
          ORDER BY lt.createdAt DESC
        `);
        setTests(ts as LabTest[]);
        const pt = await db.query<LabPatient>("SELECT * FROM patients ORDER BY fullName ASC");
        setPatients(pt);
      }
      // Always load templates
      const tpls = await db.query("SELECT * FROM laboratory_templates");
      setTemplates(tpls as LabTestTemplate[]);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }

  // --- Templates ---
  function addTemplateField() {
    setTemplateForm({
      ...templateForm,
      fields: [...templateForm.fields, { id: Date.now(), name: '', type: 'number', formula: '', options: '', minM: 0, maxM: 0, minF: 0, maxF: 0, panicL: '', panicH: '', unit: '' }]
    });
  }
  function updateTemplateField(id: number, key: string, val: string | number | boolean) {
    setTemplateForm({
      ...templateForm,
      fields: templateForm.fields.map(f => f.id === id ? { ...f, [key]: val } : f)
    });
  }
  function removeTemplateField(id: number) {
    setTemplateForm({
      ...templateForm,
      fields: templateForm.fields.filter(f => f.id !== id)
    });
  }

  async function saveTemplate() {
    if (!templateForm.testName) return toast.error("Nomi kiriting");
    const jsonStr = JSON.stringify(templateForm.fields);
    try {
      if (templateForm.id) {
        await db.run("UPDATE laboratory_templates SET testName=?, category=?, price=?, fieldsJson=? WHERE id=?",
          [templateForm.testName, templateForm.category, templateForm.price, jsonStr, templateForm.id]);
        toast.success("Yangilandi");
      } else {
        await db.insert("laboratory_templates", {
          testName: templateForm.testName, category: templateForm.category, 
          price: templateForm.price, fieldsJson: jsonStr
        });
        toast.success("Qo'shildi");
      }
      setShowTemplateModal(false);
      loadData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  function openEditTemplate(tpl: LabTestTemplate) {
    let parsedFields: TemplateFieldDraft[] = [];
    try { parsedFields = JSON.parse(tpl.fieldsJson || '[]') as TemplateFieldDraft[]; } catch(_e){}
    setTemplateForm({
      id: tpl.id, testName: tpl.testName, category: tpl.category || '', price: tpl.price || 0, fields: parsedFields
    });
    setShowTemplateModal(true);
  }

  // --- Tests Workflow ---
  async function saveTest() {
    if (!testForm.patientId || !testForm.testName) return toast.error("To'ldiring");
    try {
      const p = patients.find(x => x.id === parseInt(testForm.patientId));
      const labId = `LAB-${Date.now().toString().slice(-6)}-${p ? p.id : '0'}`;
      await db.insert('laboratory_tests', {
        patientId: testForm.patientId,
        testName: testForm.testName,
        laboratoryId: labId,
        isUrgent: testForm.isUrgent ? 1 : 0,
        status: 'pending' // pending -> sampled -> processing -> ready
      });
      setShowTestModal(false);
      toast.success("Tahlil qo'shildi");
      loadData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  async function updateTestStatus(id: number | string, newStatus: string) {
    try {
      const q = newStatus === 'ready'
        ? "UPDATE laboratory_tests SET status=?, completedAt=datetime('now','localtime') WHERE id=?"
        : "UPDATE laboratory_tests SET status=? WHERE id=?";
      await db.run(q, [newStatus, id]);
      loadData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  async function openWriteResult(tst: LabTest) {
    setActiveTest(tst);
    const existingData: LabResultMap = {};
    try {
      const resultObj = JSON.parse(tst.resultJson || '{}') as { fields?: Array<{ name: string; value?: string }>; legacy?: string };
      if (resultObj.fields) {
        resultObj.fields.forEach((f) => { existingData[f.name] = f.value ?? ''; });
      }
      if (resultObj.legacy) existingData['__legacy'] = resultObj.legacy;
    } catch(_e){}

    if (tst.resultValue && Object.keys(existingData).length === 0) {
      existingData['__legacy'] = tst.resultValue;
    }

    let historicalData: LabTestTemplateField[] = [];
    try {
      const hist = await db.query(`SELECT resultJson FROM laboratory_tests WHERE patientId=? AND testName=? AND id!=? AND status='ready' ORDER BY createdAt DESC LIMIT 1`, [tst.patientId, tst.testName, tst.id]);
      if (hist && hist.length > 0) {
        historicalData = (JSON.parse(String(hist[0].resultJson) || '{}') as { fields?: LabTestTemplateField[] })?.fields || [];
      }
    } catch(_e) {}

    setResultData({ ...existingData, __historicalFields: historicalData });
    setShowResultModal(true);
  }

  async function saveResultData() {
    if(!activeTest) return;
    try {
      const tpl = templates.find(x => x.testName === activeTest.testName);
      let tplFields: TemplateFieldDraft[] = [];
      if(tpl) try { tplFields = JSON.parse(tpl.fieldsJson || '[]') as TemplateFieldDraft[]; } catch(_e){}

      const processedResults: Array<{ name: string; value: string; flag: string; unit: string; min: string; max: string }> = [];

      // First pass: Resolve Formulas for the final save
      const resolvedData: LabResultMap = { ...resultData };
      tplFields.forEach((f) => {
        if (f.type === 'formula' && f.formula) {
           try {
              let expr = f.formula;
              tplFields.forEach((otherF) => {
                 if (otherF.name !== f.name) {
                    const rawVal = resolvedData[otherF.name];
                    const otherVal = parseFloat(Array.isArray(rawVal) ? '0' : String(rawVal ?? 0));
                    expr = expr.replace(new RegExp(`\\[${otherF.name}\\]`, 'g'), String(otherVal));
                 }
              });
              // Basic sanitize and eval
              const calculated = eval(expr.replace(/[^-+*/().0-9]/g, ''));
              if (!isNaN(calculated)) resolvedData[f.name] = calculated.toFixed(2);
           } catch(e) { resolvedData[f.name] = 'Err'; }
        }
      });

      for (const fDef of tplFields) {
          const rawFieldVal = resolvedData[fDef.name];
          const val = Array.isArray(rawFieldVal) ? '' : String(rawFieldVal ?? '');
          let flag = 'N'; 
          let min = '', max = '';
          
          if (val !== '' && (fDef.type === 'number' || fDef.type === 'formula')) {
             const vNum = parseFloat(val);
             const gender = activeTest?.gender?.toLowerCase() || '';
             
             min = String((gender === 'ayol' || gender === 'f' || gender === 'female') ? (fDef.minF ?? '') : (fDef.minM ?? ''));
             max = String((gender === 'ayol' || gender === 'f' || gender === 'female') ? (fDef.maxF ?? '') : (fDef.maxM ?? ''));

             min = min || String(fDef.minM ?? '') || String(fDef.minF ?? '') || '';
             max = max || String(fDef.maxM ?? '') || String(fDef.maxF ?? '') || '';

             const vMin = parseFloat(min);
             const vMax = parseFloat(max);
             const pLow = parseFloat(fDef.panicL ?? '');
             const pHigh = parseFloat(fDef.panicH ?? '');

             if (!isNaN(vNum)) {
                if (!isNaN(pLow) && vNum <= pLow) flag = 'LL';
                else if (!isNaN(vMin) && vNum < vMin) flag = 'L';
                else if (!isNaN(pHigh) && vNum >= pHigh) flag = 'HH';
                else if (!isNaN(vMax) && vNum > vMax) flag = 'H';
             }
          }
          processedResults.push({ 
            name: fDef.name, 
            value: val, 
            flag, 
            unit: fDef.unit || '', 
            min: (fDef.type === 'number' || fDef.type === 'formula') ? min : '', 
            max: (fDef.type === 'number' || fDef.type === 'formula') ? max : '' 
          });
      }

      await db.run("UPDATE laboratory_tests SET resultJson=?, status='ready', completedAt=datetime('now','localtime') WHERE id=?", 
        [JSON.stringify({ fields: processedResults, legacy: resultData['__legacy'] }), activeTest.id]);
      
      // Audit LOG
      try {
        await db.insert('audit_log', {
          action: 'update',
          tableName: 'laboratory_tests',
          recordId: activeTest.id,
          userName: 'Laborant',
          reason: 'LIMS Natija kiritildi / Tahrirlandi'
        });
      } catch(e){}

      toast.success("Natija saqlandi!");
      setShowResultModal(false);
      loadData();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  function printPDF(tst: LabTest) {
    let resObj: { fields: PrintResultField[]; legacy: string } = { fields: [], legacy: '' };
    try { resObj = JSON.parse(tst.resultJson || '{"fields":[]}'); } catch(e){}

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${tst.patientName} - Tahlil Natijasi</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
            .clinic-name { font-size: 26px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;}
            .title { font-size: 22px; text-transform: uppercase; margin: 30px 0; text-align: center; font-weight: bold; background: #f1f5f9; padding:10px; border-radius: 8px;}
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 14px; }
            .info-box { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .result-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 15px; }
            .result-table th, .result-table td { border: 1px solid #cbd5e1; padding: 14px; text-align: left; }
            .result-table th { background: #f8fafc; font-weight: 700; color:#475569;}
            .flag-LL { color: #b91c1c; font-weight: 900; background: #fef2f2;}
            .flag-L { color: #ea580c; font-weight: bold;}
            .flag-H { color: #ea580c; font-weight: bold;}
            .flag-HH { color: #b91c1c; font-weight: 900; background: #fef2f2;}
            .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
            .qr-placeholder { width: 140px; text-align: center; font-family: monospace; }
            .qr-box { border: 2px solid #000; height:140px; margin-bottom: 5px; display:flex; align-items:center; justify-content:center; flex-direction:column; background:url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VERIFIED_${tst.laboratoryId}') center center/cover no-repeat; }
            .signature { border-top: 2px solid #000; padding-top: 10px; width: 250px; text-align: center; font-weight: 600; position:relative;}
            .signature::after { content: ''; position:absolute; bottom:20px; left:20px; width:150px; height:80px; background: url('https://upload.wikimedia.org/wikipedia/commons/f/f8/Stylized_signature_sample.svg') no-repeat center; background-size:contain; opacity:0.8; z-index:-1;}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic-name">🏥 GLOBAL LIMS SYSTEM</div>
            <div style="color:#64748b; font-weight:600; margin-top:5px;">Professional Laboratoriya Markazi</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <div style="font-size:12px; color:#64748b; margin-bottom:5px;">BEMOR MA'LUMOTLARI</div>
              <strong style="font-size:18px;">${tst.patientName}</strong><br/>
              <strong>Telefon:</strong> ${tst.phone || '—'}<br/>
            </div>
            <div class="info-box">
              <div style="font-size:12px; color:#64748b; margin-bottom:5px;">TAHLIL MA'LUMOTLARI</div>
              <strong>Laboratoriya ID:</strong> ${tst.laboratoryId || `LAB-${tst.id}`}<br/>
              <strong>Sana yozilgan:</strong> ${tst.completedAt ? new Date(tst.completedAt).toLocaleString('uz-UZ') : ''}<br/>
            </div>
          </div>
          
          <div class="title">${tst.testName}</div>

          ${resObj.legacy ? `<div style="padding:20px; border:1px solid #ddd; margin-bottom:20px;"><pre>${resObj.legacy}</pre></div>` : ''}

          ${resObj.fields && resObj.fields.length > 0 ? `
            <table class="result-table">
              <tr>
                <th>Parametr (Ko'rsatkich)</th>
                <th>Natija</th>
                <th>Tahlil (Flag)</th>
                <th>O'lchov bir.</th>
                <th>Referens (Norma)</th>
              </tr>
              ${resObj.fields.map(f => {
                let fLabel = '';
                if(f.flag==='LL') fLabel='Juda Past ⚠️'; else if(f.flag==='L') fLabel='Past ↓'; else if (f.flag==='H') fLabel='Baland ↑'; else if (f.flag==='HH') fLabel='Juda Baland ⚠️';
                return `
                <tr class="flag-${f.flag}">
                  <td style="font-weight:600;">${f.name}</td>
                  <td style="font-size:16px;">${f.value}</td>
                  <td style="font-size:12px; font-weight:bold;">${fLabel}</td>
                  <td>${f.unit}</td>
                  <td style="color:#64748b;">${f.min ? f.min + ' - ' + f.max : '—'}</td>
                </tr>
              `}).join('')}
            </table>
          ` : ''}

          <div class="footer">
            <div class="qr-placeholder">
               <div class="qr-box"></div>
               <span style="font-size:10px">SHA-256 Kriptografik Himoya<br/>${tst.laboratoryId || 'TIZIM-ID'}</span>
            </div>
            <div class="signature">
              Laborant / Shifokor imzosi
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const columns = [
    { id: 'pending', title: 'Kutilmoqda', color: 'var(--accent-info)', icon: '📋' },
    { id: 'sampled', title: 'Namuna olindi', color: 'var(--accent-warning)', icon: '🩸' },
    { id: 'processing', title: 'Jarayonda', color: 'var(--accent-secondary)', icon: '🔬' },
    { id: 'ready', title: 'Tayyor', color: 'var(--accent-success)', icon: '✅' }
  ];

  const activeTestTpl = templates.find(x => x.testName === activeTest?.testName);
  let tplFields: TemplateFieldDraft[] = [];
  if (activeTestTpl) { try { tplFields = JSON.parse(activeTestTpl.fieldsJson || '[]') as TemplateFieldDraft[]; } catch(_e){} }

  return (
    <div className="page page-laboratory">
      <div className="page-header">
        <h1>🧪 Professional LIMS</h1>
        <div style={{display:'flex', gap: 10}}>
           {activeTab === 'workflow' ? (
              <button className="btn btn-primary" onClick={() => { setTestForm({patientId:'', testName:'', isUrgent:false}); setShowTestModal(true); }}>+ Tahlil boshlash</button>
           ) : (
              <button className="btn btn-primary" onClick={() => { setTemplateForm({id:null, testName:'', category:'', price:0, fields:[]}); setShowTemplateModal(true); }}>+ Shablon (Konstruktor)</button>
           )}
        </div>
      </div>

      <div className="settings-layout" style={{display: 'flex', gap: 20}}>
        {/* Sidebar Nav */}
        <div className="settings-sidebar card glass-card" style={{width: 320, alignSelf:'flex-start', padding: 20}}>
          <div className="settings-nav" style={{display:'flex', flexDirection:'column', gap: 12}}>
             <button 
               onClick={() => setActiveTab('workflow')}
               style={{
                 textAlign:'left', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding:'16px 20px', 
                 borderRadius:'14px', border: activeTab==='workflow' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', 
                 background: activeTab==='workflow' ? 'var(--accent-primary-glow)' : 'var(--bg-input)', 
                 display:'flex', gap:15, alignItems:'center', cursor:'pointer', 
                 boxShadow: activeTab==='workflow' ? '0 4px 15px rgba(37,99,235,0.1)' : 'none'
               }}>
                <span style={{fontSize:32, padding:10, background:'rgba(255,255,255,0.1)', borderRadius:'12px'}}>🔄</span>
                <div>
                  <div style={{fontWeight:800, fontSize:15, color: activeTab==='workflow' ? 'var(--accent-primary)' : 'var(--text-primary)'}}>Gibrid Ish Oqimi</div>
                  <div style={{fontSize:12, opacity:0.7, marginTop:4}}>Shtrix-kodlarni biriktirish va mashina natijalarini ulash.</div>
                </div>
             </button>
             <button 
               onClick={() => setActiveTab('templates')}
               style={{
                 textAlign:'left', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding:'16px 20px', 
                 borderRadius:'14px', border: activeTab==='templates' ? '1px solid var(--accent-success)' : '1px solid var(--border-color)', 
                 background: activeTab==='templates' ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)', 
                 display:'flex', gap:15, alignItems:'center', cursor:'pointer',
                 boxShadow: activeTab==='templates' ? '0 4px 15px rgba(34,197,94,0.1)' : 'none'
               }}>
                <span style={{fontSize:32, padding:10, background:'rgba(255,255,255,0.1)', borderRadius:'12px'}}>📐</span>
                <div>
                  <div style={{fontWeight:800, fontSize:15, color: activeTab==='templates' ? 'var(--accent-success)' : 'var(--text-primary)'}}>Shablon Konstruktori</div>
                  <div style={{fontSize:12, opacity:0.7, marginTop:4}}>Demografik normativlar va analiz parametrlarini yaratish.</div>
                </div>
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="settings-content" style={{flex: 1, minWidth: 0}}>
           
           {activeTab === 'workflow' && (
              <div className="lims-kanban" style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16}}>
                 {columns.map(col => {
                    const colTests = tests.filter(t => t.status === col.id);
                    const progressPx = tests.length > 0 ? (colTests.length / tests.length) * 100 : 0;
                    return (
                     <div key={col.id} className="kanban-col card glass-card" style={{borderTop:`0px solid ${col.color}`, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                        <div style={{height:3, width:'100%', background:'var(--border-color)'}}>
                           <div style={{height:'100%', width:`${progressPx}%`, background:col.color, transition:'width 0.4s ease'}} />
                        </div>
                        <div className="p-3" style={{fontWeight:600, borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                           <span>{col.icon} {col.title}</span> 
                           <span className="badge badge-outline" style={{borderColor:col.color, color:col.color}}>{colTests.length}</span>
                        </div>
                        <div className="p-3" style={{display:'flex', flexDirection:'column', gap: 10, flex:1, overflowY:'auto'}}>
                           {colTests.map(tst => (
                              <div key={tst.id} className="kanban-card p-3 bg-input" style={{borderRadius:8, border:'1px solid var(--border-color)', position:'relative', borderLeft:`3px solid ${col.color}`}}>
                                 {tst.isUrgent === 1 && <div style={{position:'absolute', top:8, right:8, fontSize:9, fontWeight:800, color:'var(--bg-card)', background:'var(--accent-danger)', padding:'2px 6px', borderRadius:8, animation:'pulse 2s infinite'}}>CITO! 🔴</div>}
                                 
                                 <div style={{fontWeight:800, fontSize:14, paddingRight: tst.isUrgent===1 ? 40 : 0}}>{tst.patientName}</div>
                                 <div style={{fontSize:11, color:'var(--text-muted)'}}>{tst.testName}</div>
                                 <div style={{fontSize:10, fontFamily:'monospace', background:'rgba(0,0,0,0.1)', padding:'2px 5px', borderRadius:4, display:'inline-block', margin:'5px 0'}}>{tst.laboratoryId || `LAB-${tst.id}`}</div>
                                 
                                 <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:8}}>
                                    {col.id === 'pending' && <button className="btn btn-sm btn-info w-100" style={{flex:1, background:'var(--accent-warning)', color:'#fff', border:'none'}} onClick={()=>updateTestStatus(tst.id, 'sampled')}>Namuna olindi →</button>}
                                    {col.id === 'sampled' && <button className="btn btn-sm btn-primary w-100" style={{flex:1, background:'var(--accent-secondary)', color:'#fff', border:'none'}} onClick={()=>updateTestStatus(tst.id, 'processing')}>Jarayonga ishga →</button>}
                                    {col.id === 'processing' && <button className="btn btn-sm btn-success w-100" style={{flex:1}} onClick={()=>openWriteResult(tst)}>Natijani kiritish!</button>}
                                    
                                    {col.id === 'ready' && (
                                       <div style={{display:'flex', gap:6, flex:1}}>
                                          <button className="btn btn-sm btn-ghost" style={{flex:1}} onClick={()=>openWriteResult(tst)}>✏️</button>
                                          <button className="btn btn-sm btn-outline text-success" style={{flex:8, borderColor:'var(--accent-success)'}} onClick={()=>printPDF(tst)}>🖨️ PDF Chop etish</button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}
                           {colTests.length === 0 && (
                              <div className="text-center p-4 mt-2" style={{opacity:0.5}}>
                                 <div style={{fontSize:32, marginBottom:8, filter:'grayscale(1)'}}>{col.icon}</div>
                                 <div style={{fontSize:12, fontWeight:600}}>Hozircha tahlillar yo'q</div>
                              </div>
                           )}
                        </div>
                     </div>
                  )})}
              </div>
           )}

           {activeTab === 'templates' && (
              <div className="card glass-card">
                 <div className="p-3 bg-primary-glow" style={{borderBottom:'1px solid var(--border-color)', fontSize:13}}>
                   <b>LIMS Shablonlar:</b> Bu parametrlar orqali har bir analizning ichki ko'rsatkichlari tuziladi. Bemorga qog'oz chiqarayotganda ushbu qismlar avtomatik jadvallashadi.
                 </div>
                 <div className="table-wrapper">
                   <table className="data-table">
                     <thead>
                       <tr>
                         <th>Tahlil Nomi</th>
                         <th>Kategoriya</th>
                         <th>Parametrlar Soni</th>
                         <th>Narxi</th>
                         <th>Amallar</th>
                       </tr>
                     </thead>
                     <tbody>
                       {templates.map(tpl => {
                           let f = [];
                           try { f = JSON.parse(tpl.fieldsJson||'[]') } catch(e){}
                           return (
                             <tr key={tpl.id}>
                               <td><div style={{fontWeight:600}}>{tpl.testName}</div></td>
                               <td><span className="badge badge-outline">{tpl.category || '—'}</span></td>
                               <td style={{fontWeight:700}}>{f.length} ta xususiyat</td>
                               <td style={{color:'var(--accent-success)'}}>{Number(tpl.price||0).toLocaleString()} so'm</td>
                               <td>
                                 <button className="btn-icon-only text-primary" onClick={() => openEditTemplate(tpl)}>✏️ Yig'ish</button>
                               </td>
                             </tr>
                           )
                       })}
                       {templates.length === 0 && !loading && <tr><td colSpan={5} className="p-10 text-center opacity-50">Shablonlar yo'q...</td></tr>}
                     </tbody>
                   </table>
                 </div>
              </div>
           )}

        </div>
      </div>

      {/* Test Create Modal */}
      <Modal isOpen={showTestModal} onClose={() => setShowTestModal(false)} title="Yangi tahlilni boshlash">
        <div className="p-4" style={{display:'flex', flexDirection:'column', gap: 12}}>
           <div className="form-group">
              <label>Bemor</label>
              <select className="form-input" value={testForm.patientId} onChange={e=>setTestForm({...testForm, patientId: e.target.value})}>
                 <option value="">Tanlang...</option>
                 {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.phone})</option>)}
              </select>
           </div>
           <div className="form-group">
              <label>Tahlil turi (Shablonlar bazasidan)</label>
              <select className="form-input" value={testForm.testName} onChange={e=>setTestForm({...testForm, testName: e.target.value})}>
                 <option value="">Katalogdan tanlang...</option>
                 {templates.map(t => <option key={t.id} value={t.testName}>{t.testName}</option>)}
              </select>
           </div>
           <div className="form-group" style={{display:'flex', alignItems:'center', gap:10, marginTop:10}}>
              <input type="checkbox" id="urgentCheck" checked={testForm.isUrgent} onChange={e=>setTestForm({...testForm, isUrgent: e.target.checked})} />
              <label htmlFor="urgentCheck" style={{margin:0, color:'var(--accent-danger)', fontWeight:800}}>CITO! (Shoshilinch tahlil)</label>
           </div>
        </div>
        <div className="form-actions p-4" style={{borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'flex-end', gap:10}}>
           <button className="btn btn-ghost" onClick={() => setShowTestModal(false)}>Yopish</button>
           <button className="btn btn-primary" onClick={saveTest}>Boshlash va Shtrix-kod ajratish</button>
        </div>
      </Modal>

      {/* Template Constructor Modal */}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="LIMS Shablon Konstruktori (Form Builder)" width={1000}>
        <div className="p-4" style={{display:'flex', flexDirection:'column', gap: 12, maxHeight: '70vh', overflowY:'auto'}}>
           <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12}}>
              <div className="form-group">
                 <label>Guruh nomi (Masalan: Qonning umumiy tahlili)</label>
                 <input type="text" className="form-input" value={templateForm.testName} onChange={e=>setTemplateForm({...templateForm, testName: e.target.value})} />
              </div>
              <div className="form-group">
                 <label>Bo'lim</label>
                 <input type="text" className="form-input" value={templateForm.category} onChange={e=>setTemplateForm({...templateForm, category: e.target.value})} placeholder="Gematologiya, Bioximya..."/>
              </div>
              <div className="form-group">
                 <label>Kassa narxi</label>
                 <input type="number" className="form-input" value={templateForm.price} onChange={e=>setTemplateForm({...templateForm, price: parseFloat(e.target.value)})} />
              </div>
           </div>
           
           <h4 style={{marginTop:15, borderBottom:'1px solid var(--border-color)', paddingBottom:5}}>Ichki Parametrlar (Referens/Norma)</h4>
           
           {templateForm.fields.map((f, index) => (
             <div key={f.id} style={{display:'flex', flexDirection:'column', gap: 10, background:'var(--bg-card)', padding:15, borderRadius:8, border:'1px solid var(--border-color)', position:'relative', marginBottom: 10}}>
                <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                  <div className="form-group" style={{flex: 2}}>
                     <label>Parametr #{index+1}</label>
                     <input type="text" className="form-input" value={f.name || ''} onChange={e=>updateTemplateField(f.id, 'name', e.target.value)} placeholder="WBC, Gemoglobin..." />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                     <label>Turi</label>
                     <select className="form-input" value={f.type || 'number'} onChange={e=>updateTemplateField(f.id, 'type', e.target.value)}>
                       <option value="number">📈 Raqam</option>
                       <option value="text">📝 Matn</option>
                       <option value="select">🔽 Tanlov</option>
                       <option value="formula">🧮 Formula</option>
                     </select>
                  </div>
                  <button className="btn-icon-only text-danger" style={{marginTop: 20}} onClick={()=>removeTemplateField(f.id)}>✕</button>
                </div>

                {f.type === 'formula' && (
                  <div className="form-group">
                     <label>Formula (Masalan: [bil_dir] + [bil_ind])</label>
                     <input type="text" className="form-input" value={f.formula || ''} onChange={e=>updateTemplateField(f.id, 'formula', e.target.value)} placeholder="Matematik formula..." />
                  </div>
                )}

                {f.type === 'select' && (
                  <div className="form-group">
                     <label>Variantlar (Vergul bilan ajrating)</label>
                     <input type="text" className="form-input" value={f.options || ''} onChange={e=>updateTemplateField(f.id, 'options', e.target.value)} placeholder="Musbat, Manfiy, Shubhali..." />
                  </div>
                )}

                {(f.type === 'number' || f.type === 'formula') && (
                  <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
                     <div className="form-group">
                        <label>Erkak Min/Max</label>
                        <div style={{display:'flex', gap:5}}>
                          <input type="text" className="form-input" value={f.minM || f.min || ''} onChange={e=>updateTemplateField(f.id, 'minM', e.target.value)} placeholder="Min" />
                          <input type="text" className="form-input" value={f.maxM || f.max || ''} onChange={e=>updateTemplateField(f.id, 'maxM', e.target.value)} placeholder="Max" />
                        </div>
                     </div>
                     <div className="form-group">
                        <label>Ayol Min/Max</label>
                        <div style={{display:'flex', gap:5}}>
                          <input type="text" className="form-input" value={f.minF || f.min || ''} onChange={e=>updateTemplateField(f.id, 'minF', e.target.value)} placeholder="Min" />
                          <input type="text" className="form-input" value={f.maxF || f.max || ''} onChange={e=>updateTemplateField(f.id, 'maxF', e.target.value)} placeholder="Max" />
                        </div>
                     </div>
                     <div className="form-group">
                        <label>Vahima (Panic L/H)</label>
                        <div style={{display:'flex', gap:5}}>
                          <input type="text" className="form-input" value={f.panicL || ''} onChange={e=>updateTemplateField(f.id, 'panicL', e.target.value)} placeholder="LL" />
                          <input type="text" className="form-input" value={f.panicH || ''} onChange={e=>updateTemplateField(f.id, 'panicH', e.target.value)} placeholder="HH" />
                        </div>
                     </div>
                     <div className="form-group">
                        <label>Birlik</label>
                        <input type="text" className="form-input" value={f.unit || ''} onChange={e=>updateTemplateField(f.id, 'unit', e.target.value)} placeholder="mg/dl" />
                     </div>
                  </div>
                )}
             </div>
           ))}
           <button className="btn btn-outline" style={{alignSelf:'flex-start'}} onClick={addTemplateField}>+ Parametr Qator Qo'shish</button>
        </div>
        <div className="form-actions p-4" style={{borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'flex-end', gap:10}}>
           <button className="btn btn-ghost" onClick={() => setShowTemplateModal(false)}>Yopish</button>
           <button className="btn btn-success" onClick={saveTemplate}>💾 Konstruksiyani Saqlash</button>
        </div>
      </Modal>

      {/* Write Result Modal */}
      <Modal isOpen={showResultModal} onClose={() => setShowResultModal(false)} title="Natijalarni Kiritish & Tasdiqlash" width={1000}>
        {activeTest && (
           <div className="p-4" style={{display:'flex', flexDirection:'column', gap: 12, maxHeight:'70vh', overflowY:'auto'}}>
              <div className="bg-input p-3" style={{borderRadius:8, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <div>
                    <div style={{fontWeight:800}}>{activeTest.patientName}</div>
                    <div style={{fontSize:12, color:'var(--text-muted)'}}>{activeTest.testName}</div>
                 </div>
                 <div style={{textAlign:'right', fontFamily:'monospace'}}>
                    ID: <b>{activeTest.laboratoryId || `LAB-${activeTest.id}`}</b>
                 </div>
              </div>
              
              {tplFields.length > 0 ? (
                 <div className="lims-forms">
                    <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
                       <thead>
                          <tr>
                             <th style={{paddingBottom:10}}>Ko'rsatkich</th>
                             <th style={{paddingBottom:10}}>Natija</th>
                             <th style={{paddingBottom:10}}>Dinamika (Tarix)</th>
                             <th style={{paddingBottom:10}}>Norma / Meyor</th>
                          </tr>
                       </thead>
                       <tbody>
                          {tplFields.map((f) => {
                             const rawVal = resultData[f.name];
                             const val: string = Array.isArray(rawVal) ? '' : String(rawVal ?? '');

                             // Formula calculation logic for real-time display
                             let currentVal = val;
                             if (f.type === 'formula' && f.formula) {
                                try {
                                   let expr = f.formula;
                                   tplFields.forEach((otherF) => {
                                      if (otherF.name !== f.name) {
                                         const rv = resultData[otherF.name];
                                         const otherVal = parseFloat(Array.isArray(rv) ? '0' : String(rv ?? 0));
                                         expr = expr.replace(new RegExp(`\\[${otherF.name}\\]`, 'g'), String(otherVal));
                                      }
                                   });
                                   const calculated = eval(expr.replace(/[^-+*/().0-9]/g, ''));
                                   if (!isNaN(calculated)) currentVal = calculated.toFixed(2);
                                } catch(_e) { currentVal = 'Err'; }
                             }

                             const vNum = parseFloat(currentVal);
                             const gender = activeTest?.gender?.toLowerCase() || '';
                             const min = parseFloat(String((gender === 'ayol' || gender === 'f' || gender === 'female') ? (f.minF ?? f.minM ?? f.min ?? '') : (f.minM ?? f.minF ?? f.min ?? '')));
                             const max = parseFloat(String((gender === 'ayol' || gender === 'f' || gender === 'female') ? (f.maxF ?? f.maxM ?? f.max ?? '') : (f.maxM ?? f.maxF ?? f.max ?? '')));

                             let flag = 'N';
                             if (currentVal !== '' && !isNaN(vNum)) {
                                if ((!isNaN(min) && vNum < min)) flag = 'L';
                                if ((!isNaN(max) && vNum > max)) flag = 'H';
                             }

                             const historicalFields = Array.isArray(resultData['__historicalFields'])
                               ? (resultData['__historicalFields'] as LabTestTemplateField[])
                               : [];
                             let deltaHtml = null;
                             const hF = historicalFields.find((hf) => hf.name === f.name) as (LabTestTemplateField & { value?: string }) | undefined;
                             if(hF && hF.value && !isNaN(parseFloat(hF.value))) {
                                 const hNum = parseFloat(hF.value);
                                 if(!isNaN(vNum)) {
                                    if(vNum > hNum) deltaHtml = <span className="text-danger" style={{fontWeight:'bold'}}>↑ O'sgan ({hF.value})</span>;
                                    else if(vNum < hNum) deltaHtml = <span className="text-success" style={{fontWeight:'bold'}}>↓ Tushgan ({hF.value})</span>;
                                    else deltaHtml = <span className="text-muted">= O'zgarmagan</span>;
                                 }
                             }

                             return (
                               <tr key={f.name}>
                                 <td style={{padding:'8px 0', fontWeight:600}}>{f.name}</td>
                                 <td style={{padding:'8px 5px'}}>
                                    {f.type === 'select' ? (
                                       <select className="form-input" value={val} onChange={e=>setResultData({...resultData, [f.name]: e.target.value})}>
                                          <option value="">Tanlang...</option>
                                          {(f.options || '').split(',').map((opt: string) => <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>)}
                                       </select>
                                    ) : f.type === 'text' ? (
                                       <input type="text" className="form-input" value={val} onChange={e=>setResultData({...resultData, [f.name]: e.target.value})} />
                                    ) : f.type === 'formula' ? (
                                       <div style={{fontWeight:800, fontSize:16, color:'var(--accent-primary)'}}>{currentVal} {f.unit}</div>
                                    ) : (
                                       <input
                                         type="number" step="0.01" className="form-input" style={{borderColor: flag!=='N' ? 'var(--accent-danger)' : '', background: flag!=='N' ? 'rgba(220,38,38,0.1)' : ''}}
                                         value={val}
                                         onChange={e=>setResultData({...resultData, [f.name]: e.target.value})}
                                         placeholder="Raqam.."
                                       />
                                    )}
                                    {flag==='L' && <span style={{color:'var(--accent-warning)', fontSize:12, fontWeight:'bold', marginLeft:5}}>⚠️ PAST</span>}
                                    {flag==='H' && <span style={{color:'var(--accent-danger)', fontSize:12, fontWeight:'bold', marginLeft:5}}>⚠️ BALAND</span>}
                                 </td>
                                 <td style={{padding:'8px 0', fontSize:12}}>{deltaHtml || <span style={{opacity:0.4}}>—</span>}</td>
                                 <td style={{padding:'8px 0', fontSize:12, color:'var(--text-muted)'}}>
                                    {(f.type === 'number' || f.type === 'formula') ? `${min || '?'} - ${max || '?'} (${f.unit})` : '—'}
                                 </td>
                               </tr>
                             )
                          })}
                       </tbody>
                    </table>
                 </div>
              ) : (
                 <div className="form-group mt-2">
                    <label>Strukturavsiz (Matnlik) Natija / Izoh</label>
                    <textarea className="form-input" rows={6} value={(() => { const v = resultData['__legacy']; return Array.isArray(v) ? '' : String(v ?? ''); })()} onChange={e=>setResultData({...resultData, '__legacy': e.target.value})} placeholder="Xulosa..."></textarea>
                 </div>
              )}
           </div>
        )}
        <div className="form-actions p-4" style={{borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'flex-end', gap:10}}>
           <button className="btn btn-ghost" onClick={() => setShowResultModal(false)}>Yopish</button>
           <button className="btn btn-success" onClick={saveResultData}>Tasdiqlash & Tayyorlash</button>
        </div>
      </Modal>

    </div>
  );
}
