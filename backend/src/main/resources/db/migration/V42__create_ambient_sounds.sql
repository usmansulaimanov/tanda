-- V42: Create ambient_sounds table for Paraqta reading background audio
CREATE TABLE ambient_sounds (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    audio_url VARCHAR(500) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Waves',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ambient_sounds_active ON ambient_sounds(is_active, sort_order);

-- Initial default ambient sounds (using standard high quality CDN audio files)
INSERT INTO ambient_sounds (name, audio_url, icon, sort_order, is_active)
VALUES 
('Теңіз толқыны', 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg', 'Waves', 1, true),
('Жаңбыр дыбысы', 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg', 'CloudRain', 2, true),
('Камин оты', 'https://actions.google.com/sounds/v1/ambiences/campfire_fire_crackle.ogg', 'Flame', 3, true),
('Орман құстары', 'https://actions.google.com/sounds/v1/environments/forest_birds_morning.ogg', 'Trees', 4, true),
('Түнгі самал', 'https://actions.google.com/sounds/v1/ambiences/outdoor_night_summer_crickets.ogg', 'Moon', 5, true);
