-- =====================================================================
-- LumORA - Schema inicial
-- Por ahora solo la tabla users (necesaria para el inicio de sesión).
-- Las demás tablas se agregarán a medida que se implementen los módulos.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(10)  NOT NULL CHECK (role IN ('student', 'tutor')),
    learning_goal VARCHAR(80),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Usuario de prueba para el login.
-- El hash corresponde a la contraseña: "password123"
-- (generado con bcrypt; reemplázalo por los tuyos cuando implementes register)
INSERT INTO users (full_name, email, password_hash, role, learning_goal) VALUES
    ('Jordan Kim', 'jordan.kim@example.com', '$2b$10$a35mJA1iYdE8GaNMWduT1.Vi5B49AWrpn0cQOwx93xJh4mobvAdOa', 'student', 'Career change'),
    ('Alex Rivera', 'alex.rivera@example.com', '$2b$10$SIpIC9D7vWDN3TLS5p7M/udcJ/ffZCssxPej8KrPdbdyJLhu0MBV2', 'tutor', 'Teaching'),
    ('Elena Vasquez', 'elena.vasquez@example.com', '$2b$10$DmW58C/NNJbQwjWvu8mIHemcnXzpMamKI4BmeLPftMDQzBpTTd5M2', 'tutor', 'Teaching')
ON CONFLICT DO NOTHING;
