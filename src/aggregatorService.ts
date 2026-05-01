export interface AggregatedAlert {
  id: string;
  regionName: string;
  regionUid: string;
  startedAt: string;
  type: string;
  notes?: string;
  sources: string[];
}

export async function getAggregatedAlerts(): Promise<AggregatedAlert[]> {
  try {
    // @ts-ignore
    const config = await window.electronAPI.getConfig();
    
    if (!config.alertsApiKey) {
      console.warn('API keys not configured');
      return [];
    }

    const [alertsRes, uaRes] = await Promise.all([
      fetch(`https://api.alerts.in.ua/v1/alerts/active.json`, {
        headers: { 'Authorization': `Bearer ${config.alertsApiKey}` }
      }).catch(() => null),
      config.ukraineAlarmApiKey ? fetch(`https://api.ukrainealarm.com/api/v3/alerts`, {
        headers: {
          'Authorization': `${config.ukraineAlarmApiKey}`,
          'accept': 'application/json'
        }
      }).catch(() => null) : Promise.resolve(null)
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

    return Array.from(aggregated.values());
  } catch (error) {
    console.error('Aggregator error', error);
    return [];
  }
}
