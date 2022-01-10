
const { table } = require("console");
const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const { JSDOM } = require('jsdom');

// static path mappings
app.use("/js", express.static("public/js"));
app.use("/css", express.static("public/css"));
app.use("/img", express.static("public/imgs"));
app.use("/fonts", express.static("public/fonts"));
app.use("/html", express.static("public/html"));
app.use("/media", express.static("public/media"));


app.use(session(
    {
        secret: "extra text that no one will guess",
        name: "wazaSessionID",
        resave: false,
        saveUninitialized: true
    })
);



app.get("/", function (req, res) {

    if (req.session.loggedIn) {
        res.redirect("/main");
    } else {

        let doc = fs.readFileSync("./app/html/login.html", "utf8");

        res.set("Server", "Wazubi Engine");
        res.set("X-Powered-By", "Wazubi");
        res.send(doc);

    }

});


app.get("/main", function (req, res) {

    // check for a session first!
    if (req.session.loggedIn) {

        let profile = fs.readFileSync("./app/html/main.html", "utf8");
        let profileDOM = new JSDOM(profile);

        const mysql = require("mysql2");
        const connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "artfun"
        });

        connection.connect();
        connection.query(
            "SELECT * FROM showings",
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                }
                let t1 = profileDOM.window.document.createElement("table");
                t1.innerHTML += "<tr><th>Gallery</th><th>Year</th><th>City</th><th>Country</th><th>Article</th></tr>";

                for (let i = 0; i < results.length; i++) {
                    let str = "<tr><td>" + results[i].galleryname + "</td><td>" + results[i].year + "</td><td>" + results[i].city + "</td><td>" + results[i].country + "</td><td>" + results[i].article + "</td>";

                    t1.innerHTML += str;

                }
                profileDOM.window.document.getElementById("bottom").append(t1);

                // great time to get the user's data and put it into the page!
                profileDOM.window.document.getElementsByTagName("title")[0].innerHTML
                    = req.session.name + "'s Profile";
                profileDOM.window.document.getElementById("name").innerHTML
                    = "Hello, " + req.session.name;
                profileDOM.window.document.getElementById("screen_name").innerHTML
                    = "<b>Screen Name:</b> " + req.session.screen_name;
                profileDOM.window.document.getElementById("email").innerHTML
                    = "<b>Email:</b> " + req.session.email;
                profileDOM.window.document.getElementById("favourite_food").innerHTML
                    = "<b>Favourite Food:</b> " + req.session.favourite_food;
                profileDOM.window.document.getElementById("city").innerHTML
                    = "<b>City:</b> " + req.session.city;
                profileDOM.window.document.getElementById("province").innerHTML
                    = "<b>Province:</b> " + req.session.province;


                res.set("Server", "Wazubi Engine");
                res.set("X-Powered-By", "Wazubi");
                res.send(profileDOM.serialize());
            });
    } else {
        res.redirect("/");
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Notice that this is a "POST"
app.post("/login", function (req, res) {
    res.setHeader("Content-Type", "application/json");


    console.log("What was sent", req.body.email, req.body.password);


    let results = authenticate(req.body.email, req.body.password,
        function (userRecord) {
            //console.log(rows);
            if (userRecord == null) {
                // server couldn't find that, so use AJAX response and inform
                // the user. when we get success, we will do a complete page
                // change. Ask why we would do this in lecture/lab :)
                res.send({ status: "fail", msg: "User account not found." });
            } else {
                // authenticate the user, create a session
                req.session.loggedIn = true;
                req.session.email = userRecord.email;
                req.session.name = userRecord.name;
                req.session.screen_name = userRecord.screen_name;
                req.session.favourite_food = userRecord.favourite_food;
                req.session.city = userRecord.city;
                req.session.province = userRecord.province;
                req.session.save(function (err) {
                    // session saved, for analytics, we could record this in a DB
                });
                // all we are doing as a server is telling the client that they
                // are logged in, it is up to them to switch to the profile page
                res.send({ status: "success", msg: "Logged in." });
            }
        });

});

app.get("/logout", function (req, res) {

    if (req.session) {
        req.session.destroy(function (error) {
            if (error) {
                res.status(400).send("Unable to log out")
            } else {
                // session deleted, redirect to home
                res.redirect("/");
            }
        });
    }
});

function authenticate(email, pwd, callback) {

    const mysql = require("mysql2");
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "artfun"
    });
    connection.connect();
    connection.query(
        //'SELECT * FROM user',
        "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
        function (error, results, fields) {
            // results is an array of records, in JSON format
            // fields contains extra meta data about results
            console.log("Results from DB", results, "and the # of records returned", results.length);

            if (error) {
                // in production, you'd really want to send an email to admin but for now, just console
                console.log(error);
            }
            if (results.length > 0) {
                // email and password found
                return callback(results[0]);
            } else {
                // user not found
                return callback(null);
            }

        }
    );

}

/*
 * Function that connects to the DBMS and checks if the DB exists, if not
 * creates it, then populates it with a couple of records. This would be
 * removed before deploying the app but is great for
 * development/testing purposes.
 */
async function init() {

    // we'll go over promises in COMP 2537, for now know that it allows us
    // to execute some code in a synchronous manner
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        multipleStatements: true
    });
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS artfun;
        use artfun;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
            name varchar(30),
            email varchar(30),
            password varchar(30),
            screen_name varchar (30),
            favourite_food varchar (30),
            city varchar(30),
            province varchar (2),
            PRIMARY KEY (ID));

        CREATE TABLE IF NOT EXISTS showings(
        ID int NOT NULL AUTO_INCREMENT,
            galleryname varchar(30),
            year varchar(30),
            city varchar(30),
            country varchar(30),
            article varchar(50),
            PRIMARY KEY(ID));`;
    await connection.query(createDBAndTables);



    // await allows for us to wait for this line to execute ... synchronously
    // also ... destructuring. There's that term again!
    const [rows, fields] = await connection.query("SELECT * FROM user");
    // no records? Let's add a couple - for testing purposes
    if (rows.length == 0) {
        // no records, so let's add a couple
        let userRecords = "insert into user (name, email, password, screen_name, favourite_food, city, province) values ?";
        let recordValues = [
            ["Arron", "arron_ferguson@bcit.ca", "abc123", "webdevwizard", "hamburgers", "Vancouver", "BC"],
            ["Alissa", "agraham32@my.bcit.ca", "123abc", "heyitsahleesah", "avocado rolls", "Vancouver", "BC"],
            ["Bowser", "imadog@woof.com", "woo115", "imstilladog", "donuts", "Vancouver", "BC"],
        ];
        await connection.query(userRecords, [recordValues]);
    }
    const [tableRows, tableFields] = await connection.query("SELECT * FROM showings");
    // check if there are no records in the table
    if (tableRows.length == 0) {
        // if there are no records, add these
        let showingRecords = "insert into showings (galleryname, year, city, country, article) values ?";
        let recordValues = [
            ["Palace of Versaille", "2010", "Versaille", "France", "Murakami Versailles"],
            ["Gagosian Gallery", "2011", "London", "England", "Takashi Murakami at the Gagosian"],
            ["Al RiWaq Hall", "2012", "Doha", "Qatar", "Murakami-Ego"],
            ["Blum & Poe", "2013", "Los Angeles", "USA", "Arhat Blum & Poe"],
            ["Palazzo Reale", "2014", "Milan", "Italy", "Arhat Cycle"],
            ["Mori Art Museum", "2015", "Tokyo", "Japan", "The 500 Arhats"],
            ["Perrotin", "2016", "Paris", "France", "Learning the Magic of Painting"],
            ["Astrup Fearnley Museet", "2017", "Oslo", "Norway", "Murakami by Murakami"],
            ["Vancouver Art Gallery", "2018", "Vancouver", "Canada", "The Octopus Eats It's Own Leg"],
            ["STPI", "2019", "Singapore", "Singapore", "From Superflat to BubbleWrap"],
        ];
        await connection.query(showingRecords, [recordValues]);
    }
    console.log("Listening on port " + port + "!");
}

// RUN SERVER
let port = 8000;
app.listen(port, init);
