# File Uploader Project Roadmap

This roadmap outlines the development process for your file uploader application, broken down into logical phases to align with your learning objectives and workflow using GitHub Copilot for backend and Lovable.dev for frontend.

---

## Phase 0: Project Setup & Core Dependencies (Backend Foundation)

This initial phase sets up the basic structure of your Node.js application, integrating Express for the server and Prisma for database ORM with PostgreSQL.

**Objective:** Establish a working backend environment and connect to the database.

**Key Tasks:**

- **Initialize Node.js Project:**
  - Create a new directory and run `npm init -y`.
- **Install Core Backend Dependencies:**
  - `express`: Web framework.
  - `prisma`: ORM.
  - `pg`: PostgreSQL client for Prisma.
  - `dotenv`: For environment variables.
- **Prisma Setup:**
  - Run `npx prisma init --datasource-provider postgresql`.
  - Configure `DATABASE_URL` in your `.env` file.
  - Define a basic User model in `prisma/schema.prisma` (just an id for now).
  - Run `npx prisma migrate dev --name init` to create your first migration and apply it.
- **Basic Express Server:**
  - Set up a minimal `index.js` (or `app.js`) to start an Express server and ensure it runs.

**Deliverable:**

A running Express server connected to a PostgreSQL database via Prisma, with a basic user table.

---

## Phase 1: User Authentication & Session Management (Backend Core)

This phase focuses on securing your application with user accounts and maintaining user sessions using Passport.js and Prisma's session store.

**Objective:** Implement secure user registration, login, and session persistence.

**Key Tasks:**

- **Install Authentication Dependencies:**
  - `passport`: Authentication middleware.
  - `passport-local`: Local strategy for username/password.
  - `express-session`: Session management.
  - `connect-prisma`: Prisma session store.
  - `bcryptjs`: For password hashing.
- **Prisma Schema Update:**
  - Enhance the User model in `prisma/schema.prisma` to include email (unique), password (hashed string).
  - Add a Session model for connect-prisma (as per its documentation).
  - Run `npx prisma migrate dev --name add_auth_models` to update your database.
- **Passport.js Setup:**
  - Configure express-session middleware.
  - Initialize Passport and session middleware.
  - Implement the Passport LocalStrategy for user login.
  - Implement Passport's serializeUser and deserializeUser for session management.
- **Authentication Routes:**
  - Create `POST /auth/register` for user registration (hash password before saving).
  - Create `POST /auth/login` for user authentication.
  - Create `GET /auth/logout` to end user sessions.
  - Add a middleware (`isAuthenticated`) to protect routes, redirecting unauthenticated users.

**Deliverable:**

A backend capable of user registration, login, logout, and maintaining authenticated sessions persistently.

---

## Phase 2: Folder Management (Backend Data Structure)

This phase introduces the core organizational structure of your application: folders. Users will be able to create, view, update, and delete folders.

**Objective:** Develop a robust API for managing hierarchical folders.

**Key Tasks:**

- **Prisma Schema Update:**
  - Add a Folder model to `prisma/schema.prisma`:
    - `id`: Unique identifier.
    - `name`: Folder name.
    - `ownerId`: Links to the User model.
    - `parentId`: (Optional) Self-referencing link to another Folder for nesting.
    - `createdAt`, `updatedAt`: Timestamps.
  - Run `npx prisma migrate dev --name add_folder_model`.
- **Folder API Routes:**
  - `POST /api/folders`: Create a new folder (requires ownerId from authenticated user, parentId optional).
  - `GET /api/folders`: Get all folders for the authenticated user, possibly with filtering by parentId.
  - `GET /api/folders/:id`: Get details of a specific folder.
  - `PUT /api/folders/:id`: Update a folder's name or parent.
  - `DELETE /api/folders/:id`: Delete a folder. Implement logic for deleting its contents (files and subfolders) or preventing deletion if not empty.
- **Access Control:**
  - Ensure all folder routes are protected, allowing only the owner to manage their folders.

**Deliverable:**

A complete API for managing user-specific, potentially nested, folders.

---

## Phase 3: Basic File Upload & Management (Backend - Local Storage)

Before integrating cloud storage, you'll set up basic file uploads to your local filesystem and manage their metadata in the database. This is a crucial step to understand multer.

**Objective:** Enable file uploads to local storage, store file metadata, and allow viewing/downloading.

**Key Tasks:**

- **Install multer:**
  - `npm install multer`.
- **Prisma Schema Update:**
  - Add a File model to `prisma/schema.prisma`:
    - `id`: Unique identifier.
    - `name`: Original file name.
    - `mimetype`: File type (e.g., image/jpeg).
    - `size`: File size in bytes.
    - `localPath`: Path on the server's filesystem where the file is stored.
    - `folderId`: Links to the Folder model (optional, for files in root).
    - `ownerId`: Links to the User model.
    - `createdAt`, `updatedAt`: Timestamps.
  - Run `npx prisma migrate dev --name add_file_model`.
- **File Upload Route:**
  - `POST /api/files/upload`: Use multer middleware to handle file reception.
  - After multer saves the file locally, save its metadata (name, size, type, local path, owner, folder) to the File table in the database.
- **File Management Routes:**
  - `GET /api/files/:id`: Get details (name, size, upload time) of a specific file.
  - `GET /api/files/:id/download`: Serve the file from the localPath using `res.download()`.
  - `GET /api/folders/:folderId/files`: List all files within a specific folder.
- **Error Handling:**
  - Implement robust error handling for file uploads (e.g., file size limits, type restrictions).

**Deliverable:**

Users can upload files that are saved locally, and their metadata is stored in the database. Files can be viewed and downloaded.

---

## Phase 4: Cloud Storage Integration (Backend - Cloudinary)

This is where you'll transition from local storage to a production-ready cloud storage solution. Cloudinary is a good choice for media handling.

**Objective:** Store uploaded files directly to Cloudinary and manage their URLs in the database.

**Key Tasks:**

- **Cloudinary Setup:**
  - Sign up for a Cloudinary account.
  - Install Cloudinary SDK: `npm install cloudinary`.
  - Configure Cloudinary credentials in `.env`.
- **Prisma Schema Update:**
  - Modify the File model in `prisma/schema.prisma`:
    - Remove `localPath`.
    - Add `cloudUrl`: URL of the file on Cloudinary.
    - Add `publicId`: Cloudinary's identifier for the file (useful for deletion).
  - Run `npx prisma migrate dev --name update_file_for_cloud`.
- **Refactor File Upload Route:**
  - `POST /api/files/upload`:
    - multer can still be used for initial buffering of the file in memory or temporary local storage.
    - Use Cloudinary SDK to upload the file directly to Cloudinary.
    - On successful upload, save the `cloudUrl` and `publicId` to the File model in the database.
    - (Optional) If multer was used for temporary local storage, delete the local file after successful Cloudinary upload.
- **Refactor File Download Route:**
  - `GET /api/files/:id/download`: Redirect to the `cloudUrl` for direct download from Cloudinary.
- **File Deletion:**
  - Implement logic to delete the file from Cloudinary using its `publicId` when the file record is deleted from your database.

**Deliverable:**

Files are now uploaded and served from Cloudinary, leveraging a scalable cloud solution.

---

## Phase 5: Share Folder Functionality (Backend - Extra Credit)

Implement the extra credit feature for sharing folders with unauthenticated users via a generated link.

**Objective:** Create secure, time-limited public share links for folders.

**Key Tasks:**

- **Prisma Schema Update:**
  - Add a ShareLink model to `prisma/schema.prisma`:
    - `id`: Primary key.
    - `token`: Unique UUID for the share link.
    - `folderId`: Links to the Folder model.
    - `expiresAt`: Date/time when the link becomes invalid.
    - `createdAt`: Timestamp.
  - Run `npx prisma migrate dev --name add_share_link_model`.
- **Generate Share Link Route:**
  - `POST /api/folders/:id/share`: (Protected route)
    - Requires folderId and duration (e.g., "1d", "10d").
    - Generate a UUID for the token.
    - Calculate `expiresAt` based on the duration.
    - Save the ShareLink record to the database.
    - Return the full shareable URL (e.g., `https://yourapp.com/share/<token>`).
- **Public Share Route:**
  - `GET /share/:token`: (Public route, no authentication required)
    - Retrieve the ShareLink based on the token.
    - Check if the link exists and is not expired.
    - If valid, retrieve the Folder and its contents (files and subfolders, potentially recursively).
    - Return the data for display. Ensure files retrieved here link to their Cloudinary URLs for download.

**Deliverable:**

Users can generate shareable links for folders, and these links can be used by anyone to view folder contents for a limited time.

---

## Phase 6: Frontend Development & Integration (React/Shadcn UI)

This final phase brings everything together into a user-friendly interface.

**Objective:** Build a responsive React frontend that consumes your backend APIs, providing a complete user experience.

**Key Tasks:**

- **Lovable.dev Scaffolding:**
  - Use Lovable.dev to rapidly generate the initial React/Shadcn UI components and pages based on the API endpoints you've built.
  - Focus on designing:
    - Login/Registration pages.
    - A dashboard view for files and folders.
    - Modals/forms for creating/renaming folders.
    - A file upload component.
    - A file details view.
    - A share link generation form.
    - A public view for shared folders/files.
  - Ensure the design is clean, intuitive, and mobile-responsive using Shadcn UI.
- **Integration & Submodule:**
  - Once Lovable.dev provides the initial codebase, pull it into your main project as a Git submodule. This keeps it organized and allows you to update it easily if Lovable.dev changes or if you want to pull future updates.
  - Connect the frontend components to your backend API endpoints using fetch or a library like axios.
  - Implement client-side state management (e.g., React Context, Zustand, or just useState/useEffect) for managing user state, folder/file data, loading states, and error messages.
- **Refinements & Tweaks:**
  - Address any UI/UX gaps or specific design choices not fully captured by Lovable.dev.
  - Implement client-side validation where appropriate.
  - Add loading spinners, success/error notifications.
  - Ensure smooth navigation and interactions.

**Deliverable:**

A fully functional, responsive web application where users can manage files and folders, upload to the cloud, and share content.

---

## Throughout the Project: Learning & Best Practices

- **Error Handling:** Always implement robust try...catch blocks on your backend and show user-friendly error messages on the frontend.
- **Input Validation:** Crucial on both frontend and backend to prevent bad data and security vulnerabilities.
- **Security:** Pay attention to things like password hashing, secure session management (HTTP-only cookies), protecting against common web vulnerabilities (CORS, CSRF, XSS).
- **Testing:** As you build, consider simple tests for your API endpoints to ensure they work as expected.
- **Git Workflow:** Commit frequently, use meaningful commit messages.

---

This roadmap should give you a clear path forward. Let me know when you're ready to tackle Phase 0, and we can start guiding Copilot!