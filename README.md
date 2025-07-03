# File Uploader

A modern, full-stack file management application built with **Next.js**, **Express.js**, **Prisma**, and **Cloudinary**. This application provides a seamless file upload, organization, and sharing experience with a beautiful, responsive UI.

![File Uploader Demo](https://img.shields.io/badge/Status-Production%20Ready-green)
![GitHub repo](https://img.shields.io/badge/GitHub-patrickthe1%2FFile--Uploader-blue)

## 🚀 Features

### Core Functionality
- **📁 Folder Management**: Create, rename, and organize files in nested folder structures
- **📤 File Upload**: Drag-and-drop file upload with progress tracking
- **📥 File Download**: Robust download system supporting all file types including PDFs
- **👁️ File Preview**: In-browser preview for images, PDFs, and text files
- **🔗 File Sharing**: Generate secure, time-limited share links for folders
- **🍞 Breadcrumb Navigation**: Intuitive navigation through folder hierarchies

### User Experience
- **🎨 Modern UI**: Beautiful, responsive design with dark theme
- **⚡ Real-time Feedback**: Toast notifications for all user actions
- **🔄 Live Updates**: Instant UI updates after file operations
- **📱 Mobile Responsive**: Optimized for all device sizes
- **🔍 File Type Icons**: Visual file type identification

### Security & Performance
- **🔐 User Authentication**: Secure login/registration system
- **🛡️ File Ownership**: Users can only access their own files
- **☁️ Cloud Storage**: Reliable file storage with Cloudinary
- **🚀 Fast Performance**: Optimized for speed and reliability

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Radix UI** - Accessible UI components
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling and validation

### Backend
- **Express.js** - Node.js web framework
- **Prisma** - Modern database ORM
- **PostgreSQL** - Reliable database system
- **Passport.js** - Authentication middleware
- **Cloudinary** - Cloud-based file storage
- **Multer** - File upload handling

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **PostgreSQL** database
- **Cloudinary** account
- **Git** (for cloning the repository)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone git@github.com:patrickthe1/File-Uploader.git
cd File-Uploader
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Configure your backend `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/file_uploader"

# Session Secret
SESSION_SECRET="your-super-secret-session-key"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# Server Configuration
PORT=5000
```

#### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

#### Start Backend Server

```bash
npm run dev
```

The backend will be running at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Configure your frontend `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

#### Start Frontend Development Server

```bash
npm run dev
```

The frontend will be running at `http://localhost:3000`

## 🚀 Deployment

### Backend Deployment (Railway/Heroku/DigitalOcean)

1. Set up your production database
2. Configure environment variables on your hosting platform
3. Deploy using your preferred method:

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Frontend Deployment (Vercel/Netlify)

1. Connect your GitHub repository
2. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com`
3. Deploy automatically on push to main branch

## 🔐 Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | Secret key for session encryption | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ |
| `PORT` | Server port | ❌ (defaults to 5000) |

### Frontend (.env.local)
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | ✅ |

## 🗂️ Project Structure

```
File-Uploader/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── routes/         # API routes
│   │   └── index.js        # Server entry point
│   ├── prisma/             # Database schema and migrations
│   └── uploads/            # Temporary file storage
├── frontend/               # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/                # Utilities and stores
│   └── public/             # Static assets
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### File Management
- `GET /api/files` - List user's files
- `POST /api/files` - Upload new file
- `GET /api/files/:id` - Get file details
- `GET /api/files/:id/download` - Download file
- `PUT /api/files/:id` - Update file metadata
- `DELETE /api/files/:id` - Delete file

### Folder Management
- `GET /api/folders` - List folders
- `POST /api/folders` - Create new folder
- `GET /api/folders/:id` - Get folder contents
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Sharing
- `POST /api/folders/:id/share` - Create share link
- `GET /api/share/:token` - Access shared folder

## 🔧 Configuration

### Cloudinary Setup

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Navigate to your dashboard to find your credentials
3. **Important**: Enable PDF and ZIP file delivery:
   - Go to Settings → Security
   - Enable "Deliver PDF and ZIP files"
   - This ensures all file types can be downloaded properly

### Database Schema

The application uses PostgreSQL with the following main models:

- **Users**: User accounts and authentication
- **Folders**: Hierarchical folder structure
- **Files**: File metadata and Cloudinary references
- **ShareLinks**: Temporary sharing functionality
- **Sessions**: User session management

## 🐛 Troubleshooting

### Common Issues

**PDF Downloads Not Working**
- Ensure "Deliver PDF and ZIP files" is enabled in Cloudinary settings
- Check CORS configuration in backend

**File Upload Failures**
- Verify Cloudinary credentials are correct
- Check file size limits in multer configuration

**Database Connection Issues**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Run `npx prisma migrate reset` to reset database

**CORS Errors**
- Ensure FRONTEND_URL is set correctly in backend
- Verify API_BASE_URL in frontend matches backend URL

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
---

**Developed by Patrick**
