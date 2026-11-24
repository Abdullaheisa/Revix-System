ALTER TABLE vehicle_colors DROP COLUMN IF EXISTS hex_code;
ALTER TABLE vehicle_colors ALTER COLUMN color_type TYPE VARCHAR(120);
