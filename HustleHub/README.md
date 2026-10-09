# HustleHub+ — Part 1: Secure Foundations

**Group Leader:** ST10445478 – Christopher Doyle  
**Member:** ST10446445 – Daniel Watson & ST10446382 - Pabi Kerns

## 1. About HustleHub+

HustleHub+ is a freelance marketplace that will allow freelancers to advertise their services and clients to browse and book these services.

The full system will eventually include gigs, bookings, transactions, freelancer income tracking and estimated tax calculations. Part 1 focuses only on creating a secure backend foundation for the system.

Since HustleHub+ will handle user accounts and financial information in later stages, security needs to be included from the start of the project.

The main users of the system are:

- **Clients** – browse services and make bookings.
- **Freelancers** – advertise services and manage their work.
- **Administrators** – manage parts of the platform in later stages.

For Part 1, users can register as either a `client` or `freelancer`. Users cannot register themselves as administrators.

Part 1 uses temporary in-memory storage. This means that registered accounts are removed when the server restarts. MongoDB will be added during Part 2.

---

## 2. Backend Structure

The backend was developed using **Node.js and Express**.

The project is separated into different folders so that the code is easier to understand, maintain and expand later.

```text
HustleHub/
  src/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/

    app.cjs
    config.cjs
    server.cjs

  scripts/
    setup.cjs
    build-collection.cjs
    run-postman.cjs

  test/
    api.test.cjs

  postman/
    HustleHub-Part1.postman_collection.json

  certs/

  .env.example
  .gitignore
  package.json
  package-lock.json
  README.md
  ```
The main parts of the backend are:
- Routes decide which endpoint is being requested.
- Controllers manage requests and responses.
- Services contain the main authentication logic.
- Models manage the temporary user storage.
- Middleware handles authentication, validation and errors.
- Utils contain reusable helper functions.
This structure will also make it easier to replace the temporary storage with MongoDB later.

---

## 3. Running the Application

The following software is required:
- Node.js
- npm
- Visual Studio Code
- Git
- Postman Desktop
- OpenSSL
Open the HustleHub project in Visual Studio Code and open a terminal inside the project folder.
Install the dependencies:
npm.cmd ci
Run the setup:
npm.cmd run setup
Start the application:
npm.cmd start
The API will run at:
https://localhost:4000
The server uses HTTPS rather than normal HTTP.
To stop the server, press:
Ctrl+C
Because Part 1 uses in-memory storage, all accounts are removed when the server restarts.

---

## 4. API Endpoints

Method	Endpoint	Purpose	Authentication
GET	/api/health	Checks if the API is running	No
POST	/api/auth/register	Registers a new user	No
POST	/api/auth/login	Logs a user in and generates a JWT	No
GET	/api/auth/me	Displays the logged-in user's profile	Yes


Register Example
{
  "fullName": "Aisha Khan",
  "email": "aisha@example.com",
  "password": "DemoPassphrase!7314",
  "role": "freelancer"
}
A successful registration returns:
201 Created
Login Example
{
  "email": "aisha@example.com",
  "password": "DemoPassphrase!7314"
}
A successful login returns a JWT which is then used to access protected routes.
Protected Route
The /api/auth/me route requires the following header:
Authorization: Bearer <token>
If the JWT is valid, the user's profile is returned. If the token is missing, invalid or expired, the API returns a 401 Unauthorized response.

---

## 5. Password Security

Passwords are protected using bcryptjs.
When a user registers, their password is hashed before it is stored. The original plain-text password is never saved.
A bcrypt cost factor of 12 is used and each password receives its own salt.
During login, bcrypt.compare() is used to compare the password entered by the user with the stored hash.
Passwords must contain at least 12 characters and invalid password input is rejected.
This is important because even if stored user data was accessed, the attacker would not directly see the user's original password.

---

## 6. JWT Authentication

HustleHub+ uses JSON Web Tokens (JWTs) to identify authenticated users.
When a user logs in successfully, the server generates a signed JWT.
The token includes information such as:
- User ID
- User role
- Issue time
- Expiry time
- Issuer
- Audience
The token uses the HS256 algorithm and expires after approximately 15 minutes.
Each protected request checks that the token:
- Has a valid signature.
- Has not expired.
- Uses the correct algorithm.
- Has the correct issuer and audience.
- Belongs to an existing user.
JWTs are signed but not encrypted. For this reason, passwords and other sensitive information are never stored inside the token.

---

## 7. Input Validation and Sanitisation

All registration and login information is checked before it is processed.
The API rejects input such as:
- Missing fields.
- Invalid email addresses.
- Invalid roles.
- Unexpected fields.
- Arrays or objects where text is expected.
- Malformed JSON.
- Oversized requests.
- Unsupported content types.
- Malicious input.
For example, input such as:
{
  "email": {
    "$ne": null
  }
}
will be rejected.
Email addresses are also trimmed and converted to lowercase so that email addresses such as:
User@example.com
user@example.com
are treated as the same account.
Validation is performed before passwords are hashed or user information is stored.

---

## 8. Error Handling

The application uses controlled error handling so that internal system information is not shown to the user.
The API does not expose:
- Stack traces.
- File paths.
- Environment variables.
- Passwords.
- Password hashes.
- JWT secrets.
- Internal configuration information.
For example, an incorrect password and an unknown email address both return:
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
This prevents the API from giving unnecessary information about whether an account exists.
The main HTTP status codes used are:
Status	Meaning
400	Invalid input
401	Authentication failed
404	Endpoint not found
409	Email already registered
413	Request too large
415	Unsupported content type
429	Too many requests
500	Unexpected server error

---

## 9. HTTPS

The HustleHub+ API runs over HTTPS using a locally generated SSL certificate.
HTTPS encrypts information sent between the client and the server. This is important because information such as passwords and JWTs should not be sent across an unsecured connection.
The local certificate supports:
localhost
127.0.0.1
The application requires TLS 1.2 or newer.
A self-signed certificate is suitable for this local university project. A real deployed version of HustleHub+ would use a certificate from a trusted certificate authority.
HTTPS works together with password hashing and authentication. HTTPS protects information while it is being transferred, while bcrypt protects stored passwords and JWTs protect authenticated routes.

---

## 10. Additional Security

A few extra security controls were also added.
Helmet
Helmet is used to add security-related HTTP headers and reduce unnecessary information being exposed about the server.
Rate Limiting
Registration and login endpoints are rate limited.
The current limit is:
30 requests per IP address every 15 minutes
If the limit is exceeded, the API returns:
429 Too Many Requests
This helps reduce repeated login and registration attempts.
Cache Protection
Authentication responses use:
Cache-Control: no-store
This helps prevent sensitive authentication responses from being saved in caches.
Request Size Limits
The API limits the size of incoming requests to reduce the risk of very large requests being used against the server.

---

## 11. Testing

The API was tested using both automated tests and Postman.
The automated tests can be run using:
npm.cmd test
Testing includes:
- Successful registration.
- Successful login.
- JWT generation.
- Protected profile access.
- Duplicate email registration.
- Incorrect passwords.
- Missing JWTs.
- Invalid JWTs.
- Invalid input.
- Malicious input.
- Safe error responses.
The Postman collection is located at:
postman/HustleHub-Part1.postman_collection.json
Postman was also used to manually demonstrate that the registration, login and protected endpoints work correctly.
Postman Setup
In Postman Desktop, go to:
Settings → Certificates
Add:
certs/localhost.pem
as the CA certificate.
SSL certificate verification should remain enabled.
The API base URL is:
https://localhost:4000
The Postman collection automatically saves the JWT after a successful login so that it can be used by the protected profile request.

---

## 12. Part 1 Limitations

Part 1 is only the secure backend foundation of HustleHub+.
The following features will be added in later stages:
- MongoDB database storage.
- React frontend.
- Gig management.
- Bookings.
- Transactions.
- Freelancer income tracking.
- Estimated tax calculations.
- Full role-based access control.
- Docker.
- CI/CD.
- Monitoring and logging improvements.
The current in-memory user storage is therefore temporary and will be replaced with MongoDB during Part 2.

---

## 13. Testing Evidence

Screenshots showing the API and Postman testing are included with the Part 1 submission documentation.

---

## 14. Demonstration Video

YouTube Demonstration Link: 
https://youtu.be/bl21BFtY164

The demonstration video shows:
- The API running successfully.
- HTTPS being used.
- User registration.
- User login.
- JWT generation.
- The protected profile route.
- Invalid or unauthorised requests being rejected.

---

## 15. References

bcrypt.js, 2026. bcrypt.js documentation. [online] Available at: https://github.com/dcodeIO/bcrypt.js [Accessed 3 September 2026].
Express, 2026. Express error handling. [online] Available at: https://expressjs.com/en/guide/error-handling/ [Accessed 3 September 2026].
jsonwebtoken, 2026. node-jsonwebtoken documentation. [online] Available at: https://github.com/auth0/node-jsonwebtoken [Accessed 3 September 2026].
Postman, 2026. Certificates. [online] Available at: https://learning.postman.com/docs/sending-requests/certificates/ [Accessed 3 September 2026].
Postman, 2026. Test scripts. [online] Available at: https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/ [Accessed 3 September 2026].
