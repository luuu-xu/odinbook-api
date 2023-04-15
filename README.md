# REST odinbook API

- This is a facebook-clone API created with Node.js and Express.
- The API allows users to perform CRUD (create, read, update, delete) operations on posts and comments.
- The API is written with a test-driven design.
- It also includes JWT authentication with Passport.js.
- See the Odinbook client-side-website with some published posts built with Next.js: [odinbook-client](https://github.com/luuu-xu/odinbook-client).

## Getting Started
To get started with the API, follow these steps:

1. Clone the repository to your local machine.
2. Run npm install to install the project dependencies.
3. Rename .env.example file to .env and fill in the necessary environment variables.
4. Run npm start to start the server.

## API Endpoints
The API has the following endpoints:

### Auth
- POST api/auth/signup: Sign up a new user with credentials.
- POST api/auth/facebook-login: Logs in or signs up a user with data from Facebook sign in function.
- POST api/auth/visitor-login: Creates and logs in a visitor with admin as a friend.
- POST api/auth/login: Logs in an exsiting user with credentials.
- POST api/auth/logout: Logs out the current user.

### Authuser
- POST api/authuser/posts: Creates a new post by the authenticated user.
- GET api/authuser/posts: Gets a list of posts made by the authenticated user.
- GET api/authuser/friends-posts: Gets a list of posts made by the friends of the authenticated user.
- POST api/authuser/send-friend-request/:userId: Creates a friend request to the user by userId from the authenticated user.
- POST api/authuser/accept-friend-request/:userId: Accepts a friend request from the user by userId, becomes a friend to the authenticated user.
- POST api/authuser/posts/:postId/give-like: Creates a like to the post by postId by the authenticated user.
- DELETE api/authuser/posts/:postId/cancel-like: Deletes a like given to the post by postId by the authenticated user.
- POST api/authuser/posts/:postId/comments: Creates a comment to the post by postId from the authenticated user.
- PUT api/authuser/edit-profile: Changes the user data including name and profile picture url by the authenticated user.

### Posts
- GET api/posts: Gets a list of all posts sorted.
- GET api/posts/:postId: Gets a post by postId.
- GET api/posts/:postId/comments: Gets a list of all comments from the post by postId.
- GET api/posts/:postId/likes: Gets a list of users who liked the post by postId.

### Users
- GET api/users: Gets a list of all users.
- GET api/users/:userId: Gets a user by userId.
- GET api/users/:userId/friends: Gets a list of friends of the user by userId.
- GET api/users/:userId/posts: Gets a list of posts made by the user by userId.

### Images
- GET api/images/:imageId: Gets an image by imageId.

## Dependencies
The following dependencies are used in this project:

- express: Web framework for Node.js.
- mongoose: Object modeling tool for MongoDB.
- dotenv: Loads environment variables from a .env file.
- express validator: Runs back-end validation for form data.
- passport: Authentication middleware for Node.js.
- passport-jwt: Passport strategy for authenticating with JWT tokens.
- jsonwebtoken: JSON Web Token implementation for Node.js.
- multer: Handles multiform FormData.
- cors: Handles CORS.

### Dev dependencies
- faker: Creates fake data.
- jest: Jest test frameworks.
- mongodb-memory-server: A mongodb served in memory for testing.
- supertest: HTTP testings.
- supertest-session: HTTP testings with a session.

## Environment Variables
The following environment variables are used in this project:

- MONGODB_URL: The URI for the MongoDB database.
- JWT_SECRET: The secret key used to sign JWT tokens.
- SESSION_SECRET: The secret key used for session.
- CORS_ORIGIN: The client-side url allowed to access the API.
- VISITOR_ID = The id of the visitor user used for general visitor login.
- VISITOR_PASSWORD = Password of the visitor user

## Testing
Run npm test to run tests with a in-memory mongodb server.

## Contributing
Contributions are welcome! If you'd like to contribute to this project, please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.