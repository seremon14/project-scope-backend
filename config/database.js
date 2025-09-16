const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });
            console.log('✅ PostgreSQL Database connected successfully');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database disconnected');
        }
    }

    async query(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new Database();
