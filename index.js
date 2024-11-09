const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const authApiRouter = require("./routes/auth");
const errorHandlers = require("./handlers/errorHandlers");
const { isValidToken } = require("./controllers/authController");
require("dotenv").config({ path: ".env" });
const cors = require("cors");
const promisify = require("es6-promisify");
const Report = require('./models/report'); // Import the Report model
const multer = require('multer');

// Create our Express app
const app = express();
const server = http.createServer(app);
app.use(cors()); // Enable CORS for all routes

// Initialize Pusher and get the io instance

// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions configuration
app.use(
  session({
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE }),
  })
);

// Middleware to pass variables to templates and requests
app.use((req, res, next) => {
  res.locals.admin = req.admin || null;
  res.locals.currentPath = req.path;
  next();
});

// Promisify some callback-based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});

// CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PATCH,PUT,POST,DELETE");
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header(
    "Access-Control-Allow-Headers",
    "Accept, Authorization,x-auth-token, Content-Type, X-Requested-With, Range"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  } else {
    return next();
  }
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  },
});

const upload = multer({ storage });
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find(); // Fetch all reports from the database
    res.status(200).json(reports); // Return the reports as JSON
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});
// Endpoint to handle report submission
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { description, address } = req.body; // Destructure address from req.body
  const image = req.file ? req.file.filename : null;

  // Create a new report instance
  const newReport = new Report({
    description,
    image,
    address, // Add address to the report
  });

  try {
    // Save the report to the database
    await newReport.save();
    console.log('Report saved to database:', newReport);

    // Send a response back to the client
    res.status(201).json({
      message: 'Report submitted successfully!',
      report: newReport,
    });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ message: 'Error saving report' });
  }
});

// API routes
app.use("/api/v1", authApiRouter);

// Handle 404 errors
app.use(errorHandlers.notFound);

// Development error handler
if (app.get("env") === "development") {
  app.use(errorHandlers.developmentErrors);
}

// Production error handler
app.use(errorHandlers.productionErrors);

// Start the server

module.exports = app;