-- RentShare BD - Sample Demonstration Seed Data (MySQL 8.0)
-- Note: Demo password for seeded accounts is "Demo1234!" (hashed via bcrypt in runtime seeder).
USE rentshare_bd;

-- The application automatically seeds complete relational demo data on first startup via server/db/seedData.ts
-- so bcrypt hashes and foreign keys remain consistent across MySQL and local development.
SELECT 'Use application startup seeder or run npm start to populate demo accounts.' AS info;
