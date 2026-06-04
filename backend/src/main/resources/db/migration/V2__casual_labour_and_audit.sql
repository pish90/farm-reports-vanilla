-- Casual labourers
CREATE TABLE casual_labourers (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    phone      VARCHAR(20),
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE casual_work_sessions (
    id                 SERIAL PRIMARY KEY,
    session_date       DATE           NOT NULL,
    activity           VARCHAR(200)   NOT NULL,
    default_daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at         TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE casual_work_entries (
    id                 SERIAL PRIMARY KEY,
    session_id         INTEGER        NOT NULL REFERENCES casual_work_sessions(id) ON DELETE CASCADE,
    casual_labourer_id INTEGER        NOT NULL REFERENCES casual_labourers(id),
    rate_override      DECIMAL(10, 2),
    created_at         TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, casual_labourer_id)
);

CREATE TABLE casual_payments (
    id                 SERIAL PRIMARY KEY,
    casual_labourer_id INTEGER        NOT NULL REFERENCES casual_labourers(id) ON DELETE CASCADE,
    payment_date       DATE           NOT NULL,
    amount             DECIMAL(10, 2) NOT NULL,
    note               TEXT,
    created_at         TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    action      VARCHAR(50)  NOT NULL,
    user_id     INTEGER      REFERENCES users(id),
    user_name   VARCHAR(100),
    user_role   VARCHAR(30),
    description TEXT,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
