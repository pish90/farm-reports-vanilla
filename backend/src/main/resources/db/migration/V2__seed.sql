-- Default farm config — update via Settings after first login
INSERT INTO farm_config (name, currency, timezone)
VALUES ('My Farm', 'USD', 'UTC');

-- Default admin user: admin@farm.local / changeme
-- Change password immediately after first login
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@farm.local',
        '$2a$10$rDkPvvAFV8BtmrILYHohkuKhiLByB8p7LBN0cPbkYQQXNJ/nmhO9K',
        'ADMIN');

-- Default expense categories
INSERT INTO expense_categories (name) VALUES
    ('Labour'),
    ('Feed & Inputs'),
    ('Veterinary'),
    ('Fuel & Transport'),
    ('Equipment & Maintenance'),
    ('Utilities'),
    ('Other');
