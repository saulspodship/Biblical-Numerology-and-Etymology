UPDATE numerology_system SET name='English · ordinal (A1–Z26)' WHERE id='latin-ordinal';
UPDATE numerology_system SET name='English · Pythagorean (1–9)' WHERE id='latin-pythagorean';
INSERT OR IGNORE INTO schema_migration(version) VALUES (4);
