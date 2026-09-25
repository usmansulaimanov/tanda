ALTER TABLE reading_progress
    ADD COLUMN IF NOT EXISTS epub_cfi         TEXT,
    ADD COLUMN IF NOT EXISTS font_size        INTEGER,
    ADD COLUMN IF NOT EXISTS reader_theme     VARCHAR(16),
    ADD COLUMN IF NOT EXISTS color_temperature INTEGER;
