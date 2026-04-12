import React, { useState } from 'react';

export default function ClinicProfileModal({ isOpen, onClose, onNavigate }: { isOpen: boolean, onClose: () => void, onNavigate: (page: string) => void }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 650, background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' }}
      >
        <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏥</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Klinika Profili</h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>ID: <strong style={{ color: 'var(--text-primary)' }}>CL-24098</strong></p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 28, cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Klinika Nomi</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>MedCenter InnoClinic</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Telefon Raqam</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>+998 90 123 45 67</div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 25, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
             <div>
               <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5, letterSpacing: 1 }}>BALANS NAZORATI</div>
               <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>1,250,000 <span style={{ fontSize: 16, color: '#64748b' }}>UZS</span></div>
             </div>
             <button onClick={() => { onClose(); onNavigate('subscription'); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
               Balans To'ldirish
             </button>
          </div>

          <div>
            <h3 style={{ fontSize: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, marginBottom: 15, color: 'var(--text-primary)' }}>So'nggi To'lovlar Tarixi</h3>
            <div className="table-wrapper" style={{ maxHeight: 180, overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: 13, width: '100%' }}>
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>To'lov turi</th>
                    <th style={{ textAlign: 'right' }}>Miqdor</th>
                    <th style={{ textAlign: 'center' }}>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-primary)' }}>15-Mar, 2026</td>
                    <td>Payme</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>600,000 UZS</td>
                    <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Tasdiqlangan</span></td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-primary)' }}>15-Fev, 2026</td>
                    <td>Click</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>600,000 UZS</td>
                    <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Tasdiqlangan</span></td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-primary)' }}>15-Yan, 2026</td>
                    <td>Mastercard</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>250,000 UZS</td>
                    <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Tasdiqlangan</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
