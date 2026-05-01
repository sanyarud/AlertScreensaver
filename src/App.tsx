import { useState, useEffect } from 'react';
import UkraineMap from './UkraineMap';
import { getAggregatedAlerts } from './aggregatorService';
import type { AggregatedAlert } from './aggregatorService';

function App() {
  const [alerts, setAlerts] = useState<AggregatedAlert[]>([]);
  // @ts-ignore
  const [isSettings, setIsSettings] = useState(window.electronAPI?.isSettings || window.location.hash.includes('settings'));

  const [alertsKey, setAlertsKey] = useState('');
  const [uaKey, setUaKey] = useState('');

  useEffect(() => {
    // @ts-ignore
    const handleHashChange = () => setIsSettings(window.electronAPI?.isSettings || window.location.hash.includes('settings'));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isSettings) {
      // @ts-ignore
      window.electronAPI.getConfig().then(config => {
        setAlertsKey(config.alertsApiKey || '');
        setUaKey(config.ukraineAlarmApiKey || '');
      });
    } else {
      // Fetch alerts
      const fetchAlerts = async () => {
        const data = await getAggregatedAlerts();
        setAlerts(data);
      };
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 15000);
      return () => clearInterval(interval);
    }
  }, [isSettings]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    // @ts-ignore
    await window.electronAPI.saveConfig({ alertsApiKey: alertsKey, ukraineAlarmApiKey: uaKey });
    alert('Налаштування збережено! Ви можете закрити це вікно.');
  };

  if (isSettings) {
    return (
      <div style={{ padding: '24px', color: 'white', fontFamily: 'sans-serif' }}>
        <h2>Налаштування API (AlertUA Screensaver)</h2>
        <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>alerts.in.ua API Key:</label>
            <input 
              type="text" 
              value={alertsKey} 
              onChange={e => setAlertsKey(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>api.ukrainealarm.com API Key:</label>
            <input 
              type="text" 
              value={uaKey} 
              onChange={e => setUaKey(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px', background: '#5e6ad2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>
            Зберегти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      <UkraineMap alerts={alerts} />
      {alerts.length === 0 && (
        <div style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--success)', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '8px' }}>
          Немає активних тривог
        </div>
      )}
    </div>
  );
}

export default App;
