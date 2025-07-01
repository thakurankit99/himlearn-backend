# 🚀 HimLearning Backend API

This repository contains the backend API for the HimLearning educational platform, built with Node.js, Express, and MongoDB.

## 📋 Features

- 👤 **User Authentication**: JWT-based authentication with email verification
- 📚 **Learning Content Management**: Create, read, update, and delete learning content
- 🔍 **Search & Filtering**: Advanced search and filtering capabilities
- 📊 **Admin Dashboard**: User management, content moderation, and analytics
- 🔔 **Notifications**: Real-time notification system for users
- 📁 **File Uploads**: Support for image and video uploads via Cloudinary

## 🛠️ Tech Stack

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JWT**: Authentication
- **Cloudinary**: Media storage
- **Nodemailer**: Email service

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Cloudinary account
- Email service for notifications

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thakurankit99/himlearn-backend.git
   cd himlearn-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the API**
   - The API will be available at `http://localhost:5000/api`
   - Health check: `http://localhost:5000/api/health`

## 📁 Project Structure

```
Backend/
├── Config/           # Environment configuration
├── Controllers/      # Business logic
├── Models/           # Database schemas
├── Routers/          # API routes
├── Middlewares/      # Authentication & validation
├── Helpers/          # Utility functions
├── public/           # Static files
└── server.js         # Entry point
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Email verification
- `POST /api/auth/forgotpassword` - Password reset

### Learning Content
- `GET /api/story/getAllStories` - Get all learning content
- `POST /api/story/addstory` - Create new content
- `PUT /api/story/editStory/:slug` - Edit content
- `DELETE /api/story/deleteStory/:slug` - Delete content

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/learningLibrary` - Get user's saved content

### Admin
- `GET /api/admin/stats` - Get admin dashboard stats
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stories` - Get all content
- `POST /api/admin/announcements` - Create announcement

## 🐳 Deployment

This repository includes Docker configuration for easy deployment:

```bash
# Build and run with Docker
docker build -t himlearning-backend .
docker run -p 5000:5000 himlearning-backend
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact: himlearningrht@gmail.com 