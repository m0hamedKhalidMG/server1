const mongoose = require("mongoose");
require('./models/User.js'); 
require('./models/report.js'); 



require("dotenv").config({ path: ".env" });
require('./models/User.js'); 
require('./models/report.js'); 

// Connect to our Database and handle any bad connections
// mongoose.connect(process.env.DATABASE);

mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});
mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises
mongoose.connection.on("error", (err) => {
  console.error(`🚫 Error → : ${err.message}`);
});

const glob = require("glob");
const path = require("path");

 glob.sync("./models/**/*.js").forEach(function (file) {
   require(path.resolve(file));
 });

// Start our app!
const app  = require("./index");

app.set("port", process.env.PORT || 80);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → On PORT : ${server.address().port}`);
});
