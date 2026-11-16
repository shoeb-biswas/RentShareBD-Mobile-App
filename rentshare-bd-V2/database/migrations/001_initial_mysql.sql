-- RentShare BD Migration 001: Initial MySQL Schema & Metadata Tables

SOURCE ../schema.sql;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO schema_migrations (version) VALUES ('001_initial_mysql');
