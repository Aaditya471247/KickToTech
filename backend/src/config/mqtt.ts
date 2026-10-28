import mqtt, { MqttClient } from 'mqtt';
import { env } from './env';

/**
 * Optional MQTT bridge for real hardware.
 *   Sensors publish  -> jalmitra/<farmId>/telemetry  { sensorId, moisture, temperature, batteryLevel?, signalQuality? }
 *   Server publishes -> jalmitra/<farmId>/valve/cmd  { action: "OPEN" | "CLOSE" }
 * The ESP32 / LoRa gateway subscribes to the command topic and drives the solenoid relay.
 */
let client: MqttClient | null = null;

export function initMqtt(onTelemetry: (payload: unknown) => Promise<unknown>): void {
  if (!env.MQTT_URL) {
    console.log('[mqtt] MQTT_URL not set, hardware bridge disabled (HTTP ingest still works)');
    return;
  }
  client = mqtt.connect(env.MQTT_URL);
  client.on('connect', () => {
    console.log('[mqtt] connected');
    client?.subscribe('jalmitra/+/telemetry');
  });
  client.on('error', (e) => console.error('[mqtt]', e.message));
  client.on('message', (_topic, message) => {
    try {
      onTelemetry(JSON.parse(message.toString())).catch((e) => console.error('[mqtt] ingest failed', e.message));
    } catch {
      console.error('[mqtt] ignoring malformed payload');
    }
  });
}

export function publishValveCommand(farmId: string, action: 'OPEN' | 'CLOSE'): void {
  client?.publish(`jalmitra/${farmId}/valve/cmd`, JSON.stringify({ action, at: new Date().toISOString() }), { qos: 1 });
}

export function closeMqtt(): void {
  client?.end(true);
}
