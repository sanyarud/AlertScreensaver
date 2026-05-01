'use client';

import { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import type { AggregatedAlert } from './aggregatorService';

const geoUrl = 'https://code.highcharts.com/mapdata/countries/ua/ua-all.topo.json';

const hcKeyToRegionMap: Record<string, string> = {
  'ua-my': 'Одеська область',
  'ua-ks': 'Херсонська область',
  'ua-kc': 'м. Київ',
  'ua-zt': 'Житомирська область',
  'ua-sm': 'Сумська область',
  'ua-dt': 'Донецька область',
  'ua-dp': 'Дніпропетровська область',
  'ua-kk': 'Харківська область',
  'ua-lh': 'Луганська область',
  'ua-pl': 'Полтавська область',
  'ua-zp': 'Запорізька область',
  'ua-sc': 'м. Севастополь',
  'ua-kr': 'Автономна Республіка Крим',
  'ua-ch': 'Чернігівська область',
  'ua-rv': 'Рівненська область',
  'ua-cv': 'Чернівецька область',
  'ua-if': 'Івано-Франківська область',
  'ua-km': 'Хмельницька область',
  'ua-lv': 'Львівська область',
  'ua-tp': 'Тернопільська область',
  'ua-zk': 'Закарпатська область',
  'ua-vo': 'Волинська область',
  'ua-ck': 'Черкаська область',
  'ua-kh': 'Кіровоградська область',
  'ua-kv': 'Київська область',
  'ua-mk': 'Миколаївська область',
  'ua-vi': 'Вінницька область',
};

export default function UkraineMap({ alerts }: { alerts: AggregatedAlert[] }) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ name: string; alert?: AggregatedAlert } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Завантаження мапи...</div>;

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0b0e14',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 2200, center: [31.1656, 48.3794] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup center={[31.1656, 48.3794]} zoom={1} minZoom={0.5} maxZoom={8}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const hcKey = geo.properties['hc-key'];
                  const regionName = hcKeyToRegionMap[hcKey] || geo.properties.name;
                  const alert = alerts.find(a => a.regionName === regionName || a.regionName.includes(regionName.replace(' область', '')));
                  
                  const isAlert = !!alert;
                  const fill = isAlert ? '#ff4d4d' : 'rgba(94, 106, 210, 0.15)';
                  const hoverFill = isAlert ? '#ff6b81' : 'rgba(94, 106, 210, 0.3)';

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setTooltip({ name: regionName, alert })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill,
                          stroke: 'rgba(255, 255, 255, 0.3)',
                          strokeWidth: 0.5,
                          outline: 'none',
                          transition: 'all 0.3s'
                        },
                        hover: {
                          fill: hoverFill,
                          stroke: 'rgba(255, 255, 255, 0.8)',
                          strokeWidth: 1,
                          outline: 'none',
                          cursor: 'pointer'
                        },
                        pressed: {
                          fill: hoverFill,
                          outline: 'none'
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            right: '40px',
            background: 'rgba(15, 17, 26, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            pointerEvents: 'none',
            minWidth: '240px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 1000
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#fff' }}>{tooltip.name}</h4>
            {tooltip.alert ? (
              <>
                <div style={{ color: '#ff4d4d', fontWeight: 'bold', marginBottom: '6px', fontSize: '1rem' }}>
                  {tooltip.alert.type === 'air_raid' ? '🚨 Повітряна тривога' : tooltip.alert.type}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                  Початок: {new Date(tooltip.alert.startedAt).toLocaleTimeString('uk-UA')}
                </div>
                {tooltip.alert.notes && (
                  <div style={{ fontSize: '0.9rem', color: '#ffcc00', marginTop: '10px', padding: '10px', background: 'rgba(255,204,0,0.1)', borderRadius: '6px', borderLeft: '3px solid #ffcc00' }}>
                    <strong>Ціль/Напрямок:</strong> {tooltip.alert.notes}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#00cc66', fontSize: '1rem' }}>✅ Немає тривоги</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
