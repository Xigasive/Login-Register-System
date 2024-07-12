const express = require('express');
const path = require('path');   
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const { body, validationResult} = require('express-validator');
const { request } = require('http');
const port = 3001
const app = express()

app.use(express.urlencoded({ extended: false}))
app.set('view engine', 'ejs')


app.set('views', path.join(__dirname, '../pages'));

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 3600*1000 // 24 hours
}));

const ifNotLoggedIn = (req,res, next) => {
    if(!req.session.isLoggedIn) {
        return res.render('login');
    }
    next();
}

// root page
app.get('/', ifNotLoggedIn,(req,res,next) =>{
    dbConnection.execute("SELECT name FROM users WHERE id = ?", [req.session.userId])
    .then(([rows]) =>{
         res.render('index', {
            name: rows[0].name
        });
 
    })
})

module.exports = app;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
