CREATE TABLE farm_config (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    currency    VARCHAR(10)  NOT NULL DEFAULT 'USD',
    timezone    VARCHAR(50)  NOT NULL DEFAULT 'UTC',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE workers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    job_title   VARCHAR(100),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
    id          SERIAL PRIMARY KEY,
    worker_id   INTEGER   NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date        DATE      NOT NULL,
    present     BOOLEAN   NOT NULL DEFAULT FALSE,
    notes       TEXT,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, date)
);

CREATE TABLE stock_categories (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    unit          VARCHAR(50),
    display_order INTEGER      NOT NULL DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE stock_items (
    id            SERIAL PRIMARY KEY,
    category_id   INTEGER      NOT NULL REFERENCES stock_categories(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE stock_records (
    id          SERIAL PRIMARY KEY,
    item_id     INTEGER        NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    year        INTEGER        NOT NULL,
    month       INTEGER        NOT NULL,
    quantity    DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes       TEXT,
    recorded_at TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, year, month)
);

CREATE TABLE expense_categories (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    active BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE expenses (
    id           SERIAL PRIMARY KEY,
    category_id  INTEGER        REFERENCES expense_categories(id),
    description  VARCHAR(255),
    amount       DECIMAL(12, 2) NOT NULL,
    expense_date DATE           NOT NULL,
    year         INTEGER        NOT NULL,
    month        INTEGER        NOT NULL,
    receipt_url  TEXT,
    created_by   INTEGER        REFERENCES users(id),
    created_at   TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id           SERIAL PRIMARY KEY,
    year         INTEGER   NOT NULL,
    month        INTEGER   NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    notes        TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,
    UNIQUE (year, month)
);
