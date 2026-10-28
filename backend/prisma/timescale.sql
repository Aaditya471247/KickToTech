-- Optional: turns Telemetry into a TimescaleDB hypertable. Safe to re-run.
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('"Telemetry"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
