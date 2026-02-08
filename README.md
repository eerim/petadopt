# PetAdopt

PetAdopt is a small app for sharing pet adoption listings. Users can create accounts, list pets, submit adoption requests, chat, and manage favorites

## Setup & Installation

1. **Install dependencies**
   npm install
2. **Create `.env`**
   MONGO_URI=mongodb://localhost:27017/petadopt
   JWT_SECRET=your_jwt_secret
   PORT=5001

3. **Run the server**
   npm run dev 
   # or
   npm start

4. **Open in browser**
The frontend is available at:
http://localhost:5001    (static files are located in the /frontend directory)

## API Overview

All responses are JSON. Private routes require `Authorization: Bearer <token>`

### Authentication (/api/auth)
POST /register :Register a new user
POST /login : Authenticate user and return a JWT token

### Users (/api/users)
GET /profile : Get the current user’s profile.
PUT /profile: Update user profile information.
GET /:id/public: Get public user profile.
GET /favorites: Get list of favorite pets.
POST /:id/adopt: Mark a pet as adopted by the current user.


### Pets (/api/pets)
GET / :Get all pets
GET /owner/:ownerId: Get pets created by a specific owner
GET /:id: Get detailed pet information
GET /my :Get pets created by the current user
POST /: Create a new pet listing (image upload supported)
PUT /:id : Update a pet (owner only)
DELETE /:id : Delete a pet (owner only)
POST /:id/adopt : Send an adoption request
GET /:id/requests : View adoption requests for a pet
PUT /:petId/requests/:requestId : Approve or decline an adoption request
POST /:id/favorite : Add or remove pet from favorites

### Adoptions (/api/adoptions)
GET /my : Get adoption requests sent by the current user.

### External API (/api/external)
GET /cats : Load sample cat data.
GET /dogs: Load sample dog data.

## Tech Stack
- Node.js & Express
- MongoDB & Mongoose
- JWT authentication
- bcrypt for password hashing
- Joi for request validation
- Multer for file uploads
- HTML, CSS, and JavaScript frontend

## Security & Validation
- JWT middleware protects private routes
- Passwords are stored in hashed form
- Incoming data is validated before processing
- Centralized error handling is implemented

## NPM Scripts
npm run dev   # development mode
npm start     # production mode

