const express = require('express');
const {Pool} = require('pg');

const app = express();

//Connect to Postgres using docker-compose service name 'db'
const pool = new Pool({
    host: 'db',             //service name from docker-compose
    user: 'user',
    password: 'pass',
    database: 'mydb',
    port: 5432
});

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.send(`Postgres connected! Server time: ${result.rows[0].now}`);
    } catch (err){
        console.error(err);
        res.status(500).send('Database connection failed :(');
    }
});

app.listen(4000,() => {
    console.log('Web app running on port 4000!');
});
