-- OKRs table
CREATE TABLE IF NOT EXISTS okrs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    time_frame TEXT,
    is_company_wide INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OKR-Pod junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS okr_pods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    okr_id INTEGER NOT NULL,
    pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE,
    UNIQUE(okr_id, pod)
);

-- Key Results table
CREATE TABLE IF NOT EXISTS key_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    okr_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    target_value REAL,
    current_value REAL DEFAULT 0,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
);

-- Initiatives table
CREATE TABLE IF NOT EXISTS initiatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    developer_count INTEGER DEFAULT 1,
    okr_id INTEGER,
    success_criteria TEXT,
    pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
    status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed', 'blocked')),
    jira_epic_key TEXT UNIQUE,
    jira_sync_enabled INTEGER DEFAULT 1,
    jira_last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_initiatives_pod ON initiatives(pod);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_okr ON initiatives(okr_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_pods_okr ON okr_pods(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_pods_pod ON okr_pods(pod);