ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS epub_cfi TEXT;
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS font_size INTEGER;
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS reader_theme VARCHAR(16);
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS color_temperature INTEGER;

