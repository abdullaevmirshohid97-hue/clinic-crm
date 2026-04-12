import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';

export default function Help() {
  const { t } = useTranslation();

  const shortcuts = [
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'
  ];

  return (
    <div className="page page-help">
      <div className="page-header">
        <h1>❓ {t('sidebar.help')}</h1>
      </div>

      <div className="page-body">
        <div className="card glass-card">
          <div className="card-header">
            <h3>⌨️ Keyboard Shortcuts</h3>
          </div>
          <div className="card-body">
            <div className="shortcuts-grid">
              {shortcuts.map(key => (
                <div key={key} className="shortcut-item">
                  <kbd className="shortcut-key">{key.toUpperCase()}</kbd>
                  <span className="shortcut-desc">{t('keyboard.' + key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
