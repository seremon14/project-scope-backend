const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();

// Configuración de CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://tuusuario.github.io', // Cambiar por tu GitHub Pages URL
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
            [id + '_todo', id, 'Por Hacer', 0, true],
            [id + '_progress', id, 'En Progreso', 1, true],
            [id + '_blocked', id, 'Impedimento', 2, true],
            [id + '_done', id, 'Terminado', 3, true]
        ];

        for (const [columnId, projectId, columnName, orderIndex, isDefault] of defaultColumns) {
            await pool.query(
                'INSERT INTO kanban_columns (id, project_id, name, order_index, is_default) VALUES ($1, $2, $3, $4, $5)',
                [columnId, projectId, columnName, orderIndex, isDefault]
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
