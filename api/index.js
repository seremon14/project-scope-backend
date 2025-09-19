const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();

// Configuración de CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://lorencha0209.github.io', // Tu GitHub Pages URL real
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de base de datos PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied', message: 'No token provided' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'project-scope-secret-key-2024');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Access denied', message: 'Invalid or expired token' });
    }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Project Scope API is running on Vercel',
        timestamp: new Date().toISOString()
    });
});

// Initialize database endpoint
app.post('/api/init-db', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read the SQL schema file
        const schemaPath = path.join(__dirname, '../database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema
        await pool.query(schema);
        
        res.json({ 
            success: true, 
            message: 'Database initialized successfully' 
        });
    } catch (error) {
        console.error('Database initialization error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database initialization failed',
            message: error.message 
        });
    }
});

// Reset database endpoint (drops and recreates everything)
app.post('/api/reset-db', async (req, res) => {
    try {
        // Drop all tables in correct order (respecting foreign keys)
        const dropQueries = [
            'DROP TABLE IF EXISTS minutes CASCADE;',
            'DROP TABLE IF EXISTS risks CASCADE;',
            'DROP TABLE IF EXISTS sprint_tasks CASCADE;',
            'DROP TABLE IF EXISTS kanban_columns CASCADE;',
            'DROP TABLE IF EXISTS tasks CASCADE;',
            'DROP TABLE IF EXISTS sprints CASCADE;',
            'DROP TABLE IF EXISTS projects CASCADE;',
            'DROP TABLE IF EXISTS users CASCADE;',
            'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;'
        ];

        for (const query of dropQueries) {
            await pool.query(query);
        }

        // Read and execute the schema
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../database-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await pool.query(schema);
        
        res.json({ 
            success: true, 
            message: 'Database reset and initialized successfully' 
        });
    } catch (error) {
        console.error('Database reset error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database reset failed',
            message: error.message 
        });
    }
});

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username and password are required'
            });
        }

        // Buscar usuario
        const result = await pool.query(
            'SELECT id, username, email, password_hash, full_name, is_active FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        const user = result.rows[0];

        // Verificar contraseña
        const bcrypt = require('bcryptjs');
        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        // Generar token JWT
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name
            },
            process.env.JWT_SECRET || 'project-scope-secret-key-2024',
            { expiresIn: '24h' }
        );

        // Remover password_hash de la respuesta
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            token: token,
            user: user,
            expiresIn: '24h'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Login failed'
        });
    }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({
        message: 'Logout successful',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        message: 'Token is valid',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Rutas de proyectos
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   COUNT(DISTINCT s.id) as sprint_count,
                   COUNT(DISTINCT t.id) as task_count,
                   COUNT(DISTINCT r.id) as risk_count
            FROM projects p
            LEFT JOIN sprints s ON p.id = s.project_id
            LEFT JOIN tasks t ON p.id = t.project_id
            LEFT JOIN risks r ON p.id = r.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            error: 'Failed to fetch projects',
            details: error.message
        });
    }
});

app.get('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            error: 'Failed to fetch project',
            details: error.message
        });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { id, name, description, status } = req.body;
        
        if (!id || !name) {
            return res.status(400).json({
                error: 'Project ID and name are required'
            });
        }

        await pool.query('BEGIN');
        
        // Insertar proyecto
        await pool.query(
            'INSERT INTO projects (id, name, description, status) VALUES ($1, $2, $3, $4)',
            [id, name, description || '', status || 'active']
        );

        // Crear columnas por defecto
        const defaultColumns = [
            [id, 'Por Hacer', 0, true],
            [id, 'En Progreso', 1, true],
            [id, 'Impedimento', 2, true],
            [id, 'Terminado', 3, true]
        ];

        for (const [projectId, columnName, orderIndex, isDefault] of defaultColumns) {
            await pool.query(
                'INSERT INTO kanban_columns (project_id, name, order_index, is_default) VALUES ($1, $2, $3, $4)',
                [projectId, columnName, orderIndex, isDefault]
            );
        }

        await pool.query('COMMIT');
        
        res.json({
            message: 'Project created successfully',
            id: id
        });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        
        if (error.code === '23505') { // Duplicate key
            res.status(409).json({ error: 'Project with this ID already exists' });
        } else {
            console.error('Error creating project:', error);
            res.status(500).json({
                error: 'Failed to create project',
                details: error.message
            });
        }
    }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        
        const result = await pool.query(
            'UPDATE projects SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [name, description, status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project updated successfully' });
        
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            error: 'Failed to update project',
            details: error.message
        });
    }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            error: 'Failed to delete project',
            details: error.message
        });
    }
});

// Rutas de tareas
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = 'SELECT * FROM tasks';
        let params = [];
        
        if (project_id) {
            query += ' WHERE project_id = $1';
            params.push(project_id);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            error: 'Failed to fetch tasks',
            details: error.message
        });
    }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { id, project_id, title, description, status, priority, responsible, start_date, end_date, comments } = req.body;
        
        if (!id || !project_id || !title) {
            return res.status(400).json({
                error: 'Task ID, project ID and title are required'
            });
        }

        await pool.query(
            'INSERT INTO tasks (id, project_id, title, description, status, priority, responsible, start_date, end_date, comments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [id, project_id, title, description || '', status || 'todo', priority || 'medium', responsible || '', start_date || null, end_date || null, comments || '']
        );
        
        res.json({
            message: 'Task created successfully',
            id: id
        });
        
    } catch (error) {
        if (error.code === '23505') { // Duplicate key
            res.status(409).json({ error: 'Task with this ID already exists' });
        } else {
            console.error('Error creating task:', error);
            res.status(500).json({
                error: 'Failed to create task',
                details: error.message
            });
        }
    }
});

// Add task to sprint endpoint
app.post('/api/tasks/:taskId/sprint', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { sprint_id } = req.body;
        
        if (!sprint_id) {
            return res.status(400).json({
                error: 'Sprint ID is required'
            });
        }

        // Verify that both task and sprint exist
        const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const sprintResult = await pool.query('SELECT * FROM sprints WHERE id = $1', [sprint_id]);
        if (sprintResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        // Add task to sprint (using sprint_tasks table)
        await pool.query(
            'INSERT INTO sprint_tasks (sprint_id, task_id) VALUES ($1, $2) ON CONFLICT (sprint_id, task_id) DO NOTHING',
            [sprint_id, taskId]
        );
        
        res.json({
            message: 'Task added to sprint successfully'
        });
        
    } catch (error) {
        console.error('Error adding task to sprint:', error);
        res.status(500).json({
            error: 'Failed to add task to sprint',
            details: error.message
        });
    }
});

// Rutas de sprints
app.get('/api/sprints', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = 'SELECT * FROM sprints';
        let params = [];
        
        if (project_id) {
            query += ' WHERE project_id = $1';
            params.push(project_id);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sprints:', error);
        res.status(500).json({
            error: 'Failed to fetch sprints',
            details: error.message
        });
    }
});

app.post('/api/sprints', authenticateToken, async (req, res) => {
    try {
        const { id, project_id, name, start_date, end_date, status } = req.body;
        
        if (!id || !project_id || !name || !start_date || !end_date) {
            return res.status(400).json({
                error: 'Sprint ID, project ID, name, start date and end date are required'
            });
        }

        await pool.query(
            'INSERT INTO sprints (id, project_id, name, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, project_id, name, start_date, end_date, status || 'planning']
        );
        
        res.json({
            message: 'Sprint created successfully',
            id: id
        });
        
    } catch (error) {
        if (error.code === '23505') { // Duplicate key
            res.status(409).json({ error: 'Sprint with this ID already exists' });
        } else {
            console.error('Error creating sprint:', error);
            res.status(500).json({
                error: 'Failed to create sprint',
                details: error.message
            });
        }
    }
});

// Rutas de riesgos
app.get('/api/risks', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = 'SELECT * FROM risks';
        let params = [];
        
        if (project_id) {
            query += ' WHERE project_id = $1';
            params.push(project_id);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching risks:', error);
        res.status(500).json({
            error: 'Failed to fetch risks',
            details: error.message
        });
    }
});

app.post('/api/risks', authenticateToken, async (req, res) => {
    try {
        const { id, project_id, name, description, impact, probability, mitigation_plan, strategy, status } = req.body;
        
        if (!id || !project_id || !name) {
            return res.status(400).json({
                error: 'Risk ID, project ID and name are required'
            });
        }

        await pool.query(
            'INSERT INTO risks (id, project_id, name, description, impact, probability, mitigation_plan, strategy, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, project_id, name, description || '', impact || 1, probability || 1, mitigation_plan || '', strategy || 'accept', status || 'identified']
        );
        
        res.json({
            message: 'Risk created successfully',
            id: id
        });
        
    } catch (error) {
        if (error.code === '23505') { // Duplicate key
            res.status(409).json({ error: 'Risk with this ID already exists' });
        } else {
            console.error('Error creating risk:', error);
            res.status(500).json({
                error: 'Failed to create risk',
                details: error.message
            });
        }
    }
});

// Rutas de actas
app.get('/api/minutes', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = 'SELECT * FROM minutes';
        let params = [];
        
        if (project_id) {
            query += ' WHERE project_id = $1';
            params.push(project_id);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching minutes:', error);
        res.status(500).json({
            error: 'Failed to fetch minutes',
            details: error.message
        });
    }
});

app.post('/api/minutes', authenticateToken, async (req, res) => {
    try {
        const { id, project_id, title, content, meeting_date } = req.body;
        
        if (!id || !project_id || !title || !meeting_date) {
            return res.status(400).json({
                error: 'Minutes ID, project ID, title and meeting date are required'
            });
        }

        await pool.query(
            'INSERT INTO minutes (id, project_id, title, content, meeting_date) VALUES ($1, $2, $3, $4, $5)',
            [id, project_id, title, content || '', meeting_date]
        );
        
        res.json({
            message: 'Minutes created successfully',
            id: id
        });
        
    } catch (error) {
        if (error.code === '23505') { // Duplicate key
            res.status(409).json({ error: 'Minutes with this ID already exists' });
        } else {
            console.error('Error creating minutes:', error);
            res.status(500).json({
                error: 'Failed to create minutes',
                details: error.message
            });
        }
    }
});

// Generate next ID endpoint
app.get('/api/generate-id/:prefix', authenticateToken, async (req, res) => {
    try {
        const { prefix } = req.params;
        const { project_id } = req.query;
        
        let tableName;
        let columnName = 'project_id';
        
        switch (prefix) {
            case 'P':
                tableName = 'projects';
                columnName = null; // Projects don't have project_id
                break;
            case 'T':
                tableName = 'tasks';
                break;
            case 'S':
                tableName = 'sprints';
                break;
            case 'R':
                tableName = 'risks';
                break;
            case 'M':
                tableName = 'minutes';
                break;
            default:
                return res.status(400).json({ error: 'Invalid prefix' });
        }
        
        let query = `SELECT id FROM ${tableName}`;
        let params = [];
        
        if (columnName && project_id) {
            query += ` WHERE ${columnName} = $1`;
            params.push(project_id);
        }
        
        const result = await pool.query(query, params);
        
        // Find the highest number for this prefix
        const maxNumber = result.rows.reduce((max, row) => {
            const match = row.id.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        
        const nextId = `${prefix}${maxNumber + 1}`;
        
        res.json({ id: nextId });
        
    } catch (error) {
        console.error('Error generating ID:', error);
        res.status(500).json({
            error: 'Failed to generate ID',
            details: error.message
        });
    }
});

// Rutas de columnas
app.get('/api/columns', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = 'SELECT * FROM kanban_columns';
        let params = [];
        
        if (project_id) {
            query += ' WHERE project_id = $1';
            params.push(project_id);
        }
        
        query += ' ORDER BY order_index ASC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching columns:', error);
        res.status(500).json({
            error: 'Failed to fetch columns',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Export para Vercel
module.exports = app;
