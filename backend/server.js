// DOMMatrix polyfill — must be first line before any require()
if (typeof DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof Path2D    === 'undefined') { global.Path2D    = class Path2D    {}; }

const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");

dotenv.config();
const app = express();  // ← app created FIRST

// Middleware
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json());

// Routes  ← all routes AFTER app is created
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reportRoutes = require('./routes/report');

app.get("/", (req, res) => res.send("NeuroAssess Backend Running"));
app.use('/api/auth', authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", reportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`NeuroAssess backend running on port ${PORT}`));