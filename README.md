# 💬 MERN Stack Chat Application

A modern real-time chat application built using the MERN Stack. This application allows users to communicate instantly with secure authentication, real-time messaging, profile management, and image sharing.

---

##  Features

- 🔐 User Authentication (Signup & Login)
- 💬 Real-Time One-to-One Messaging
- 🟢 Online/Offline User Status
- 👤 User Profile Management
- 📷 Profile Picture Upload
- 🖼️ Image Sharing in Chat
- 🔍 Search Users
- 📱 Fully Responsive Design
- 🌙 Modern Dark UI
- ⚡ Fast & Secure Communication

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Axios
- React Router DOM
- Context API

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt.js
- Socket.io
- Cloudinary (Image Upload)

---

## 📂 Project Structure

```
chat-app/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/chat-app.git
```

```bash
cd chat-app
```

---

## Install Dependencies

### Client

```bash
cd client
npm install
```

### Server

```bash
cd ../server
npm install
```

---

## Environment Variables

Create a `.env` file inside the **server** folder.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name

CLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret
```

---

## Run the Project

### Start Backend

```bash
cd server
npm run dev
```

### Start Frontend

```bash
cd client
npm run dev
```

---

## Screenshots

> Add your application screenshots here.

### Login

```
/screenshots/login.png
```

### Signup

```
/screenshots/signup.png
```

### Chat

```
/screenshots/chat.png
```

### Profile

```
/screenshots/profile.png
```

---

##  Future Improvements

- Group Chats
- Voice Messages
- Video Calling
- Message Reactions
- Read Receipts
- Push Notifications
- Emoji Picker
- Message Delete/Edit
- File Sharing
- Dark/Light Theme Toggle

---

##  Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to your branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

##  License

This project is licensed under the MIT License.

---

##  Author

Ayesha Jamil

Full Stack Developer



---

⭐ If you like this project, don't forget to give it a star on GitHub!
