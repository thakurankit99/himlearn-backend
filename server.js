const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const path = require("path")

const IndexRoute = require("./Routers/index")
const connectDatabase = require("./Helpers/database/connectDatabase")
const customErrorHandler = require("./Middlewares/Errors/customErrorHandler")

// Load environment variables based on NODE_ENV
dotenv.config({
    path: process.env.NODE_ENV === 'production' 
        ? path.join(__dirname, './Config/config.env')
        : './Config/config.env'
})

// Only connect to database when not being imported by Vercel build process
if (process.env.VERCEL_ENV !== 'build') {
    connectDatabase()
}

const app = express();

// Configure body parser for large file uploads
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Log all request origins for debugging
app.use((req, res, next) => {
    console.log(`Request origin: ${req.headers.origin || 'No origin header'}`);
    next();
});

// Configure CORS with proper options for production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) {
            console.log('Request with no origin allowed');
            return callback(null, true);
        }
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',                   // Local frontend
            'https://www.himlearning.cfd',             // New custom domain
            'https://himlearning.cfd',                 // New custom domain without www
            'https://api.himlearning.cfd',             // API domain
            'http://www.himlearning.cfd',              // HTTP version
            'http://himlearning.cfd',                  // HTTP version without www
            process.env.FRONTEND_URL || '*'            // Custom frontend URL from env
        ];
        
        // For development/debugging, allow all origins temporarily
        const allowAll = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_ORIGINS === 'true';
        
        if (allowAll || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            console.log(`Origin ${origin} allowed`);
            callback(null, true);
        } else {
            console.log(`Origin ${origin} rejected`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// Set timeout for requests (important for video uploads)
app.use((req, res, next) => {
    // Set timeout to 10 minutes for video uploads
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
    next();
})

// API routes
app.use("/api", IndexRoute)

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "HimLearning API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        vercel: process.env.VERCEL ? 'true' : 'false'
    })
})

app.use(customErrorHandler)

const PORT = process.env.PORT || 5000;

// Serve static files in non-Vercel environments
if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, "public")))
}

// Only start the server if not being imported by Vercel
if (process.env.VERCEL_ENV !== 'build' && !process.env.VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} : ${process.env.NODE_ENV}`)
    })

    process.on("unhandledRejection", (err, promise) => {
        console.log(`Logged Error : ${err}`)
        server.close(() => process.exit(1))
    })
}

// Export for Vercel serverless function
module.exports = app