-- Project Scope Database Schema
-- PostgreSQL Database Creation Script

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user (password: Anto0929**)
INSERT INTO users (username, email, password_hash, full_name) VALUES
('lorena.alvarez', 'lorena.alvarez@projectscope.com', '$2a$10$gJTj9c0InDB8OFRelGwoWuvaz5JsN8t.../a0zl3A0Dc4QYXb5U2S', 'Lorena Alvarez')
ON CONFLICT (username) DO NOTHING;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprints table
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    responsible VARCHAR(100),
    start_date DATE,
    end_date DATE,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Sprint-Task relationship table
CREATE TABLE IF NOT EXISTS sprint_tasks (
    id SERIAL PRIMARY KEY,
    sprint_id VARCHAR(50) NOT NULL,
    task_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(sprint_id, task_id)
);

-- Kanban columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    impact INTEGER DEFAULT 1 CHECK (impact BETWEEN 1 AND 4),
    probability INTEGER DEFAULT 1 CHECK (probability BETWEEN 1 AND 4),
    risk_factor INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    appetite INTEGER GENERATED ALWAYS AS (CASE 
        WHEN (impact * probability) <= 4 THEN 1
        WHEN (impact * probability) <= 8 THEN 2
        WHEN (impact * probability) <= 12 THEN 3
        ELSE 4
    END) STORED,
    mitigation_plan TEXT,
    strategy VARCHAR(50) CHECK (strategy IN ('avoid', 'mitigate', 'transfer', 'accept')),
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'monitoring', 'resolved', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Minutes table
CREATE TABLE IF NOT EXISTS minutes (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    meeting_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_minutes_project_id ON minutes(project_id);
CREATE INDEX IF NOT EXISTS idx_minutes_meeting_date ON minutes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON kanban_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_minutes_updated_at BEFORE UPDATE ON minutes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();