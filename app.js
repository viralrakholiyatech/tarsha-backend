// Import events module
require("dotenv").config();
express = module.exports = require("express");
http = module.exports = require("http");
fs = module.exports = require("fs");
bcrypt = module.exports = require("bcryptjs");
mysql = require("mysql2");
multer = module.exports = require("multer");
cookieParser = require("cookie-parser");
session = require("express-session");
// nodemailer  = module.exports = require('nodemailer');
path = module.exports = require("path");
underscore = module.exports = require("underscore");
lodash = module.exports = require("lodash");
admin = module.exports = require("firebase-admin")


c = module.exports = function (data) {
  console.log("--*----*-------*--------*--------*-----*");
  console.log(data);
  console.log("--*-----*------*--------*--------*-----*");
};
expressValidator = module.exports = require("express-validator");
const date = require("date-and-time");

moment = module.exports = require("moment");

const cors = require("cors");
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://zaid-3a861-default-rtdb.firebaseio.com", // ✅ Correct region
  });
}

jwt = require("jsonwebtoken");
var apiRouter = require("./routes/api");
const s3Routes  = require("./routes/s3Routes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const ClientApiRoutes = require("./routes/ClientApi");
const { isDateInBetween } = require("./services/Utility");
/*
 * Including common scripts
 */
messageClass = module.exports = JSON.parse(
  fs.readFileSync("./config/message.json")
);
databaseConfig = module.exports = JSON.parse(
  fs.readFileSync("./config/db.json")
);
meta = module.exports = JSON.parse(fs.readFileSync("./config/config.json"));
mail = module.exports = JSON.parse(fs.readFileSync("./config/mail.json"));
/*
 * Mail configration
 */
// transporter = module.exports =  nodemailer.createTransport({
// 	service: 'gmail',
//   	auth: {
//     	user: mail.USERNAME,
//     	pass: mail.PASSWORD
//   	}
// });
/*
 * Setup the environments
 */

process.env.TZ = "Asia/Calcutta";
module.exports = current_timestamp = date.format(
  new Date(),
  "YYYY-MM-DD HH:mm:ss"
);
console.log(current_timestamp);

module.exports = getCurrentDateAndTime = () => {
  return date.format(new Date(), "YYYY-MM-DD HH:mm:ss");
};

module.exports = getCurrentDate = () => {
  return date.format(new Date(), "YYYY-MM-DD");
};

module.exports = getCurrentTime = () => {
  return date.format(new Date(), "HH:mm:ss");
};

module.exports = line =
  "---------------------------------------------------------------\n";
//Path : /home/yzinnlmy/public_html/dev/public
module.exports = PUBLIC_DIRECTORY = path.join(__dirname, "public");
module.exports = ERROR_LOGS_DIRECTORY_FOLDERNAME = path.join(
  __dirname,
  "error_logs"
);
module.exports = error_logs_directories = {
  notificationError: "notificationLogs.txt",
};

app = module.exports = express();
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
};
app.use(cors(corsOptions));

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Enable CORS for all routes
app.use("/uploads", express.static("uploads"));

//File
app.use("/public", express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: meta.session_key,
    cookie: { expires: 3600000 },
  })
);

app.use(expressValidator());

// Multi-tenant database context middleware
const { tenantMiddleware } = require("./middleware/tenantMiddleware");
const { dbProxy, defaultPool } = require("./services/tenantDbManager");
app.use(tenantMiddleware);

app.use("/api", apiRouter);

app.use("/client-api", ClientApiRoutes);
app.use("/api/s3", s3Routes);
app.use("/api/super-admin", superAdminRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/testing", (req, res) => {
  res.status(200).json({ message: "Api is working....", status: false });
});

IMAGE_TYPES = module.exports = ["image/jpeg", "image/png"];
All_Image_Allow = module.exports = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/ief",
  "image/cis-cod",
  "image/tiff",
  "image/jfif",
  "application/octet-stream",
];

/*
 * Connecting to database with Multi-Tenant Proxy
 */
defaultPool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    connection.release();
    db = module.exports = dbProxy; // Multi-tenant dynamic proxy
    console.log("[DATABASE] Multi-tenant dynamic database proxy active");
    require("./services/start_server.js");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
