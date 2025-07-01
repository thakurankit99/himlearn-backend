# HimLearning Backend Deployment Guide

This guide provides instructions for deploying the HimLearning backend service using Docker, Render, or Railway.

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed on your server
- Environment variables configured

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd himlearn
   ```

2. **Create a .env file in the project root**
   ```bash
   cp Backend/.env.example .env
   # Edit the .env file with your actual values
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the API**
   - The API will be available at `http://your-server-ip:5000/api`

5. **View logs**
   ```bash
   docker-compose logs -f backend
   ```

## 🚂 Railway Deployment

Railway is a platform that makes it easy to deploy your applications.

1. **Sign up for Railway**
   - Visit [Railway.app](https://railway.app/) and create an account

2. **Install Railway CLI (optional)**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

3. **Create a new project**
   - From the Railway dashboard, click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select your repository

4. **Configure the project**
   - Set the root directory to `/Backend`
   - Add all required environment variables from `.env.example`
   - Set the start command to `npm start`

5. **Deploy**
   - Railway will automatically deploy your application
   - You can trigger manual deployments from the dashboard

6. **Get your deployment URL**
   - Railway will provide a URL for your backend service
   - Update your frontend's API configuration to use this URL

## 🖥️ Render Deployment

Render offers free hosting for Node.js applications.

1. **Sign up for Render**
   - Visit [render.com](https://render.com) and create an account

2. **Create a new Web Service**
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `himlearning-backend`
     - Root Directory: `Backend`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`

3. **Configure environment variables**
   - Add all required variables from `.env.example` in the "Environment" section

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your application

5. **Access your API**
   - Render will provide a URL for your service
   - Update your frontend's API configuration to use this URL

## ⚙️ Environment Variables

Ensure these environment variables are set in your deployment environment:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET_KEY` | Secret key for JWT tokens |
| `JWT_EXPIRE` | JWT token expiration (e.g., `60m`) |
| `RESET_PASSWORD_EXPIRE` | Password reset expiration (in ms) |
| `EMAIL_USERNAME` | Email for sending notifications |
| `EMAIL_PASS` | Email password or app password |
| `CLOUDINARY_URL` | Cloudinary connection URL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NODE_ENV` | Set to `production` for deployment |

## 🔄 Updating the Frontend

After deploying your backend, update your frontend's API configuration:

1. Edit `Frontend/src/config/api.js`:
   ```javascript
   const API_CONFIG = {
     development: {
       baseURL: 'http://localhost:5000/api',
       timeout: 30000
     },
     production: {
       baseURL: 'https://your-backend-url/api', // Update this line
       timeout: 30000
     }
   };
   ```

2. Deploy your frontend to Vercel following the frontend deployment guide.

## 🔍 Troubleshooting

- **Connection Issues**: Ensure CORS is properly configured to allow requests from your frontend domain
- **Database Errors**: Verify your MongoDB connection string and ensure network access is allowed
- **Missing Environment Variables**: Check that all required variables are set
- **File Upload Problems**: Ensure Cloudinary credentials are correct and the account has sufficient upload capacity

For additional help, check the logs in your deployment platform or run the Docker container locally for debugging. 