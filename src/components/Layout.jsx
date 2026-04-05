import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, activePage, onNavigate, theme, onThemeChange }) {
  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      <main className="main-content" style={{flex: 1, minWidth: 0, overflow: 'hidden', height: '100%'}}>
        {children}
      </main>
    </div>
  );
}
