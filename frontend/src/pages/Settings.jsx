import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const defaultSettings = {
  webcam: true,
  tabSwitch: true,
  fullscreen: true,
  copyPaste: true,
  audioMonitor: false,
  aiDetection: true,
  multipleAttempts: false,
  emailAlerts: true,
  autoTerminate: false,
  resultEmail: true,
};

export default function Settings() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    setSaved(true);
    showToast('Settings saved successfully', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ id }) => (
    <label className="toggle">
      <input type="checkbox" checked={settings[id]} onChange={() => toggle(id)} />
      <span className="toggle-slider" />
    </label>
  );

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Configure proctoring and platform behavior</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Proctoring Settings */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">🎥 Proctoring Settings</span>
        </div>
        <div className="panel-body">
          {[
            { id: 'webcam', label: 'Require Webcam', desc: 'Candidates must have an active webcam during the exam' },
            { id: 'tabSwitch', label: 'Enable Tab Switch Detection', desc: 'Alert when candidate switches to another browser tab or window' },
            { id: 'fullscreen', label: 'Enable Fullscreen Mode', desc: 'Force fullscreen and detect if the candidate exits it' },
            { id: 'copyPaste', label: 'Disable Copy & Paste', desc: 'Prevent copying or pasting text during the exam' },
            { id: 'audioMonitor', label: 'Enable Audio Monitoring', desc: 'Monitor ambient sounds for suspicious activity' },
            { id: 'aiDetection', label: 'AI-Based Behavior Detection', desc: 'Use AI models to detect suspicious eye movement and behavior' },
          ].map(s => (
            <div key={s.id} className="toggle-row">
              <div>
                <div className="toggle-label">{s.label}</div>
                <div className="toggle-desc">{s.desc}</div>
              </div>
              <Toggle id={s.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Exam Settings */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">📋 Exam Settings</span>
        </div>
        <div className="panel-body">
          {[
            { id: 'multipleAttempts', label: 'Allow Multiple Attempts', desc: 'Candidates can retake the exam if they fail' },
            { id: 'autoTerminate', label: 'Auto-Terminate on High Risk', desc: 'Automatically end exam session when risk score exceeds threshold' },
          ].map(s => (
            <div key={s.id} className="toggle-row">
              <div>
                <div className="toggle-label">{s.label}</div>
                <div className="toggle-desc">{s.desc}</div>
              </div>
              <Toggle id={s.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">🔔 Notifications</span>
        </div>
        <div className="panel-body">
          {[
            { id: 'emailAlerts', label: 'Email Alerts for High Risk', desc: 'Receive email notifications when a candidate is flagged as high risk' },
            { id: 'resultEmail', label: 'Email Results to Candidates', desc: 'Automatically email exam results to candidates after completion' },
          ].map(s => (
            <div key={s.id} className="toggle-row">
              <div>
                <div className="toggle-label">{s.label}</div>
                <div className="toggle-desc">{s.desc}</div>
              </div>
              <Toggle id={s.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Admin Info */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">👤 Admin Account</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Admin Name</label>
              <input className="form-input" defaultValue="Admin User" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" defaultValue="admin@platform.io" type="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Organization</label>
              <input className="form-input" defaultValue="AI Assessment Platform" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Leave blank to keep current" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => setSettings(defaultSettings)}>Reset Defaults</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save All Settings'}
        </button>
      </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
