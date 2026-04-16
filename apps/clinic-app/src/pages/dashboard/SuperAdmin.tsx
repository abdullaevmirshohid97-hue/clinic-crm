import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

interface FeatureFlag {
  id: number;
  name: string;
  label?: string;
  category?: string;
}

type PermissionMap = Record<string, Record<string, boolean>>;

export default function SuperAdmin() {
  const { t } = useTranslation();
  const toast = useToast();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [roles] = useState(['super_admin', 'admin', 'doctor', 'receptionist', 'cashier']);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const feats = await window.electronAPI.auth?.getFeatures?.();
        setFeatures((feats as FeatureFlag[]) || []);

        const permsMap: PermissionMap = {};
        for (const role of roles) {
          const rolePerms = await window.electronAPI.auth?.getRolePermissions?.(role) || [];
          permsMap[role] = (rolePerms as Array<{ feature_name: string; canAccess: boolean }>)
            .reduce<Record<string, boolean>>((acc, p) => ({ ...acc, [p.feature_name]: p.canAccess }), {});
        }
        setPermissions(permsMap);
      }
    } catch (e: unknown) {
      toast.error('Ma\'lumotlarni yuklashda xatolik');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function togglePermission(role: string, feature: string, current: boolean) {
    try {
      if (window.electronAPI) {
        await window.electronAPI.auth?.updatePermission?.({
          roleName: role,
          featureName: feature,
          canAccess: !current
        });
        setPermissions((prev) => ({
          ...prev,
          [role]: { ...prev[role], [feature]: !current }
        }));
        toast.success('Ruxsat yangilandi');
      }
    } catch (e: unknown) {
      toast.error('O\'zgartirishda xatolik');
      console.error(e);
    }
  }

  if (loading) return <div className="p-10 text-center">Yuklanmoqda...</div>;

  return (
    <div className="page p-6">
      <div className="page-header mb-6">
        <h1>🔐 Super Admin Panel</h1>
        <p className="text-muted">Tizim rollari va ruxsatlarini boshqarish</p>
      </div>

      <div className="card glass-card">
        <div className="card-header">
          <h3>Ruxsatlar matritsasi</h3>
        </div>
        <div className="card-body overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Funksiya / Bo'lim</th>
                {roles.map(r => (
                  <th key={r} className="text-center">{r.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.name}>
                  <td>
                    <div className="font-bold">{f.label || f.name}</div>
                    <div className="text-xs text-muted">{f.category}</div>
                  </td>
                  {roles.map(role => (
                    <td key={role} className="text-center">
                      <input 
                        type="checkbox" 
                        checked={!!permissions[role]?.[f.name]} 
                        disabled={role === 'super_admin'}
                        onChange={() => togglePermission(role, f.name, permissions[role]?.[f.name] ?? false)}
                        style={{ width: 20, height: 20, cursor: role === 'super_admin' ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="card glass-card">
          <div className="card-header"><h3>⚙️ Tizim holati</h3></div>
          <div className="card-body">
            <div className="flex justify-between p-2 border-bottom">
              <span>Ma'lumotlar bazasi:</span>
              <span className="text-success font-bold">SQLite (Connected)</span>
            </div>
            <div className="flex justify-between p-2 border-bottom">
              <span>Supabase Cloud:</span>
              <span className="text-success font-bold">Active</span>
            </div>
            <div className="flex justify-between p-2 border-bottom">
              <span>Versiya:</span>
              <span>1.2.0 STABLE</span>
            </div>
          </div>
        </div>

        <div className="card glass-card border-danger">
          <div className="card-header"><h3 className="text-danger">⚠️ Xavfli amallar</h3></div>
          <div className="card-body">
            <button className="btn btn-outline-danger w-full mb-3" onClick={() => toast.error('Hozircha o\'chirilgan')}>Keshni tozalash</button>
            <button className="btn btn-danger w-full" onClick={() => toast.error('Hozircha o\'chirilgan')}>Tizimni qayta yuklash</button>
          </div>
        </div>
      </div>
    </div>
  );
}
