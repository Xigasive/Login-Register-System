const express = require('express')
const app = express()
const port = 3000
const path = require('path');   
const cookieSession = require('cookie-session');
// express-session
const bcrypt = require('bcrypt');
// bcryptjs

const dbConnection = require('./views/data/database');
const { body, validationResult, Result} = require('express-validator');
const { request } = require('http');
const { register } = require('module');

// zod for validation

app.use(express.urlencoded({ extended: false}))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views/pages'));

app.use(cookieSession({
    name: 'sid',
    keys: ["secret", "from", "xigy"],
    maxAge: 1 * 24 * 60 * 60 * 1000
}));

// Middleware
const ifNotLoggedIn = (req,res, next) => {
    if(!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    next();
}
// Middleware
const ifLoggedIn = (req,res,next) => {
    if (req.session.isLoggedIn) {
        return res.redirect('index');
    }
    next();
}

const user = {
    firstname: 'John',
    lastname: 'Doe',
    age: 30,
    admin: true,
    email: 'johndoe@example.com',
}

const posts = [
    {title: 'title 1', body: 'this is body 1'},
    {title: 'title 2', body: 'this is body 2'},
    {title: 'title 3', body: 'this is body 3'},
    {title: 'title 4', body: 'this is body 4'},
]

// root page
app.get('/', ifNotLoggedIn, (req, res) =>{
    console.log(req.session);
    dbConnection.execute("SELECT name FROM users WHERE id = ?", [req.session.userID])
    .then(([rows]) =>{
         res.render('index', {
            name: rows[0].name
        });
 
    })
})

app.get('/index', (req, res) =>{
    res.redirect("/");
})

app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.get('/article', (req,res) => {
    res.render('article', {
        article: posts
    })
})

/**
 * {
 *  username: "",
 *  password: ""
 * }
 */
app.post('/register', ifLoggedIn, 
    // post data validation(using express-validator)
    [
        body('user_email','Invalid email address!').isEmail().custom((value) => {
            return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
            .then(([rows]) => {
                if(rows.length > 0){
                    return Promise.reject('This E-mail already in use!');
                }
                return true;
            });
        }),
        body('user_name','Username is Empty!').trim().not().isEmpty(),
        body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
    ],// end of post data validation
    (req,res,next) => {
    
        const validation_result = validationResult(req);
        const {user_name, user_pass, user_email} = req.body;
        // IF validation_result HAS NO ERROR
        if(validation_result.isEmpty()){
            // password encryption (using bcryptjs)
            bcrypt.hash(user_pass, 12).then((hash_pass) => {
                // INSERTING USER INTO DATABASE
                dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
                .then(result => {
                    res.send(`your account has been created successfully, Now you can <a href="/">Login</a>`);
                }).catch(err => {
                    // THROW INSERTING USER ERROR'S
                    if (err) throw err;
                });
            })
            .catch(err => {
                // THROW HASING ERROR'S
                if (err) throw err;
            })
        }
        else{
            // COLLECT ALL THE VALIDATION ERRORS
            let allErrors = validation_result.errors.map((error) => {
                return error.msg;
            });
            // REDERING login-register PAGE WITH VALIDATION ERRORS
            res.render('login',{
                register_error:allErrors,
                old_data:req.body
            });
        }
    });// END OF REGISTER PAGE

    app.post("/login", ifLoggedIn, (req, res) => {
        const { user_email, user_pass } = req.body;
        console.log(user_email);
        console.log(user_pass)

        // HELL PROMISE
        dbConnection.query("SELECT * FROM users WHERE email = ?", [user_email]).then(([rows, _]) => {
            const { PASSWORD: password, id, name } = rows[0];

            bcrypt.compare(user_pass, password).then((isPasswordCorrect) => {
                if (isPasswordCorrect) {
                    req.session.isLoggedIn = true;
                    req.session.userID = id;

                    res.redirect("/");
                    return
                }

                res.render('login',{
                    login_errors:['Invalid Password!']
                });
            })
        });
    })
    // app.post('/login', ifLoggedIn, [
    //     body('user_email').custom((value) => {
    //         return dbConnection.execute('SELECT email FROM users WHERE email=?', [value])
    //         .then(([rows]) => {
    //             if(rows.length == 1){
    //                 return true;
                    
    //             }
    //             return Promise.reject('Invalid Email Address!');
                
    //         });
    //     }),
    //     body('user_pass','Password is empty!').trim().not().isEmpty(),
    // ], (req, res) => {
    //     const validation_result = validationResult(req);
    //     const {user_pass, user_email} = req.body;

    //     if(validation_result.isEmpty()){
            
    //         dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[user_email])
    //         .then(([rows]) => {
    //             bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
    //                 if(compare_result === true){
    //                     req.session.isLoggedIn = true;
    //                     req.session.userID = rows[0].id;
    
    //                     res.redirect('/');
    //                     return;
    //                 }
    //                 else{
    //                     res.render('login',{
    //                         login_errors:['Invalid Password!']
    //                     });
    //                     return;
    //                 }
    //             })
    //             .catch(err => {
    //                 if (err) throw err;
    //             });
    
    
    //         }).catch(err => {
    //             if (err) throw err;
    //         });
    //     }
    //     else{
    //         let allErrors = validation_result.errors.map((error) => {
    //             return error.msg;
    //         });
    //         // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
    //         res.render('login',{
    //             login_errors:allErrors
    //         });
    //     }
    // });

// Global error handling
app.use((err, req, res, next) => {
    console.log(err);
})

module.exports = app;

app.listen(port, () => {
    // console.log(`Server is running on port ${port}`)
    console.info("Ready, %s:%d", "0.0.0.0", 3000);
})
