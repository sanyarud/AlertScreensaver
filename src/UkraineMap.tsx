import { useState, useEffect } from 'react';
import {
  ComposableMap, Geographies, Geography,
  ZoomableGroup, Marker,
} from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import type { AggregatedAlert } from './aggregatorService';

const geoUrl = 'https://code.highcharts.com/mapdata/countries/ua/ua-all.topo.json';

// Fixed projection — Ukraine fits comfortably in the viewBox.
// At scale=2200, viewBox 900×580:
//   Ukraine width  ≈ 565 px  (63 % of viewBox)
//   Ukraine height ≈ 482 px  (83 % of viewBox)
// SVG scales to fill the container via CSS preserveAspectRatio="xMidYMid meet".
const MAP_SCALE                    = 2200;
const MAP_W                        = 900;
const MAP_H                        = 580;
const MAP_CENTER: [number, number] = [31.1656, 48.3794];

// alerts.in.ua-style colour palette
const COLOR = {
  regionNormal:    '#1e2a45',
  regionNormalHov: '#27355a',
  regionAlert:     '#8b1a1a',
  regionAlertHov:  '#a52222',
  stroke:          'rgba(255,255,255,0.12)',
  strokeHov:       'rgba(255,255,255,0.35)',
  labelNormal:     'rgba(180,195,220,0.8)',
  labelAlert:      'rgba(255,200,200,0.95)',
};

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

// Short label shown on the map
const toLabel = (name: string): string =>
  name
    .replace(' область', '')
    .replace('Автономна Республіка ', 'АР ')
    .replace('м. ', '');

// Manual coordinate overrides where d3 centroid is awkward
const centroidOverride: Record<string, [number, number]> = {
  'ua-kc': [30.52, 50.44],  // Kyiv city — tiny polygon
  'ua-sc': [33.52, 44.60],  // Sevastopol — very small
  'ua-kr': [34.10, 45.35],  // Crimea — centroid in sea
  'ua-kv': [31.00, 50.10],  // Kyiv oblast — hole from city cutout
};

// Font size per region in viewBox units.
// Screensaver renders at large physical size → 11 vbUnit ≈ 20px on 1080p.
const FONT_SIZE: Record<string, number> = {
  'ua-dp': 10, // Дніпропетровська — long name
  'ua-dt': 11,
  'ua-lh': 11,
  'ua-kr': 11,
};
const DEFAULT_FONT = 10;

export default function UkraineMap({ alerts }: { alerts: AggregatedAlert[] }) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ name: string; alert?: AggregatedAlert } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b0e14', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem',
    }}>
      Завантаження мапи...
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0b0e14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/*
        ComposableMap renders <svg viewBox="0 0 900 580">.
        With width/height 100%, the SVG fills the container while keeping
        the viewBox aspect ratio — no JS scale math required.
      */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: MAP_SCALE, center: MAP_CENTER }}
        width={MAP_W}
        height={MAP_H}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup center={MAP_CENTER} zoom={1} minZoom={0.5} maxZoom={8}>
          <Geographies geography={geoUrl}>
            {({ geographies }) => (
              <>
                {/* ── Region fills ── */}
                {geographies.map((geo) => {
                  const hcKey      = geo.properties['hc-key'];
                  const regionName = hcKeyToRegionMap[hcKey] || geo.properties.name;
                  const alert      = alerts.find(a =>
                    a.regionName === regionName ||
                    a.regionName.includes(regionName.replace(' область', ''))
                  );
                  const isAlert = !!alert;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setTooltip({ name: regionName, alert })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill:        isAlert ? COLOR.regionAlert    : COLOR.regionNormal,
                          stroke:      COLOR.stroke,
                          strokeWidth: 0.5,
                          outline:     'none',
                          transition:  'fill 0.3s',
                        },
                        hover: {
                          fill:        isAlert ? COLOR.regionAlertHov : COLOR.regionNormalHov,
                          stroke:      COLOR.strokeHov,
                          strokeWidth: 0.8,
                          outline:     'none',
                          cursor:      'pointer',
                        },
                        pressed: {
                          fill:    isAlert ? COLOR.regionAlertHov : COLOR.regionNormalHov,
                          outline: 'none',
                        },
                      }}
                    />
                  );
                })}

                {/* ── Region name labels ── */}
                {geographies.map((geo) => {
                  const hcKey      = geo.properties['hc-key'];
                  const regionName = hcKeyToRegionMap[hcKey] || geo.properties.name;
                  const alert      = alerts.find(a =>
                    a.regionName === regionName ||
                    a.regionName.includes(regionName.replace(' область', ''))
                  );
                  const isAlert  = !!alert;
                  const label    = toLabel(regionName);
                  const fontSize = FONT_SIZE[hcKey] ?? DEFAULT_FONT;
                  const coords: [number, number] =
                    centroidOverride[hcKey] ?? geoCentroid(geo);

                  if (Math.abs(coords[0]) < 1 && Math.abs(coords[1]) < 1) return null;

                  const parts = label.split(' ');
                  const line1 = parts[0];
                  const line2 = parts.slice(1).join(' ');

                  const textStyle: React.CSSProperties = {
                    fontFamily:    'Inter, system-ui, sans-serif',
                    fontSize:      `${fontSize}px`,
                    fontWeight:    500,
                    fill:          isAlert ? COLOR.labelAlert : COLOR.labelNormal,
                    pointerEvents: 'none',
                    userSelect:    'none',
                    letterSpacing: '0.03em',
                  };

                  return (
                    <Marker key={hcKey + '-lbl'} coordinates={coords}>
                      <text textAnchor="middle" dy={line2 ? '-0.3em' : '0.35em'} style={textStyle}>
                        {line1}
                      </text>
                      {line2 && (
                        <text textAnchor="middle" dy="1.15em" style={textStyle}>
                          {line2}
                        </text>
                      )}
                    </Marker>
                  );
                })}
              </>
            )}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip — larger for screensaver display */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          bottom: '40px', right: '40px',
          background: 'rgba(10,14,28,0.96)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '20px 24px',
          borderRadius: '14px',
          pointerEvents: 'none',
          minWidth: '260px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 1000,
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            {tooltip.name}
          </h4>
          {tooltip.alert ? (
            <>
              <div style={{ color: '#ff6060', fontWeight: 'bold', marginBottom: '6px', fontSize: '1rem' }}>
                🚨 {tooltip.alert.type === 'air_raid' ? 'Повітряна тривога' : tooltip.alert.type}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
                Початок: {new Date(tooltip.alert.startedAt).toLocaleTimeString('uk-UA')}
              </div>
              {tooltip.alert.notes && (
                <div style={{
                  fontSize: '0.88rem', color: '#ffcc00',
                  marginTop: '10px', padding: '10px 12px',
                  background: 'rgba(255,204,0,0.08)',
                  borderRadius: '6px', borderLeft: '3px solid #ffcc00',
                }}>
                  <strong>Ціль/Напрямок:</strong> {tooltip.alert.notes}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#2ed573', fontSize: '1rem' }}>✅ Немає тривоги</div>
          )}
        </div>
      )}
    </div>
  );
}
