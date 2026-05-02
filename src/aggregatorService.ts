export interface AggregatedAlert {
  id: string;
  regionName: string;
  regionUid: string;
  startedAt: string;
  type: string;
  notes?: string;
  sources: string[];
}

export type IotStatus = 'A' | 'P' | 'N';

export interface AggregatedResult {
  alerts: AggregatedAlert[];
  // Per-oblast classification from alerts.in.ua's IoT compact endpoint —
  // 'A' = full alert, 'P' = partial, 'N' = clear. Drives map colour so
  // it matches alerts.in.ua's own widget (raw active.json gives raion-level
  // events that don't trivially map back to oblasts).
  iotStatus: Record<string, IotStatus>;
}

// Order is alphabetical Ukrainian, with АР Крим at 0 and м. Київ /
// м. Севастополь alphabetised by their leading К/С (NOT by "м.").
const IOT_ORDER: readonly string[] = [
  'Автономна Республіка Крим',
  'Волинська область',
  'Вінницька область',
  'Дніпропетровська область',
  'Донецька область',
  'Житомирська область',
  'Закарпатська область',
  'Запорізька область',
  'Івано-Франківська область',
  'м. Київ',
  'Київська область',
  'Кіровоградська область',
  'Луганська область',
  'Львівська область',
  'Миколаївська область',
  'Одеська область',
  'Полтавська область',
  'Рівненська область',
  'м. Севастополь',
  'Сумська область',
  'Тернопільська область',
  'Харківська область',
  'Херсонська область',
  'Хмельницька область',
  'Черкаська область',
  'Чернівецька область',
  'Чернігівська область',
];

async function fetchIotStatus(apiKey: string): Promise<Record<string, IotStatus>> {
  try {
    // The IoT compact endpoint takes the token as a query parameter, not Bearer.
    const r = await fetch(
      `https://api.alerts.in.ua/v1/iot/active_air_raid_alerts_by_oblast.json?token=${apiKey}`
    );
    if (!r.ok) return {};
    const raw = (await r.text()).replace(/[^APN]/g, '');
    if (raw.length !== 27) return {};
    const result: Record<string, IotStatus> = {};
    for (let i = 0; i < 27; i++) result[IOT_ORDER[i]] = raw[i] as IotStatus;
    return result;
  } catch (e) {
    console.error('IoT status fetch failed', e);
    return {};
  }
}

export async function getAggregatedAlerts(): Promise<AggregatedResult> {
  try {
    // @ts-ignore
    const config = await window.electronAPI.getConfig();

    if (!config.alertsApiKey) {
      console.warn('API keys not configured');
      return { alerts: [], iotStatus: {} };
    }

    const [alertsRes, uaRes, iotStatus] = await Promise.all([
      fetch(`https://api.alerts.in.ua/v1/alerts/active.json`, {
        headers: { 'Authorization': `Bearer ${config.alertsApiKey}` }
      }).catch(() => null),
      config.ukraineAlarmApiKey ? fetch(`https://api.ukrainealarm.com/api/v3/alerts`, {
        headers: {
          'Authorization': `${config.ukraineAlarmApiKey}`,
          'accept': 'application/json'
        }
      }).catch(() => null) : Promise.resolve(null),
      fetchIotStatus(config.alertsApiKey),
    ]);

    let alertsInUa = [];
    if (alertsRes && alertsRes.ok) {
      const data = await alertsRes.json();
      alertsInUa = data.alerts || [];
    }

    let ukraineAlarm = [];
    if (uaRes && uaRes.ok) {
      ukraineAlarm = await uaRes.json() || [];
    }

    const aggregated: Map<string, AggregatedAlert> = new Map();

    for (const alert of alertsInUa) {
      aggregated.set(alert.location_uid, {
        id: alert.id.toString(),
        regionName: alert.location_title,
        regionUid: alert.location_uid,
        startedAt: alert.started_at,
        type: alert.alert_type,
        notes: alert.notes,
        sources: ['alerts.in.ua']
      });
    }

    for (const region of ukraineAlarm) {
      for (const activeAlert of region.activeAlerts) {
        const existing = aggregated.get(region.regionId);
        if (existing) {
          if (!existing.sources.includes('ukrainealarm.com')) {
            existing.sources.push('ukrainealarm.com');
          }
        } else {
          aggregated.set(region.regionId, {
            id: `${region.regionId}-${activeAlert.type}`,
            regionName: region.regionName,
            regionUid: region.regionId,
            startedAt: activeAlert.lastUpdate,
            type: activeAlert.type,
            sources: ['ukrainealarm.com']
          });
        }
      }
    }

    return { alerts: Array.from(aggregated.values()), iotStatus };
  } catch (error) {
    console.error('Aggregator error', error);
    return { alerts: [], iotStatus: {} };
  }
}
