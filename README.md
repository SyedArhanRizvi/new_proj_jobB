
# **Task Manager with Log Viewer**

## 📚 **Introduction**

Welcome to the **Task Manager with Log Viewer** project! This project is a comprehensive task management system where users can add tasks, track their execution status, and view detailed logs. It offers an intuitive user interface and provides real-time feedback, all while handling tasks and logs effectively.

This application uses a **React** frontend and a **Node.js/Express** backend with a **MongoDB** database to store tasks and logs.

### **Core Features**
- **Add New Tasks:** Users can easily add tasks with names and execution dates.
- **View Execution Logs:** All tasks' logs are stored and displayed for monitoring.
- **Real-time Updates:** Newly added tasks appear without refreshing the page.
- **Responsive Design:** The app is fully responsive, ensuring a seamless experience on mobile, tablet, and desktop devices.
- **Smooth User Experience:** Using libraries like Toastify and Axios, we ensure quick and smooth transitions.

---

## 🧑‍💻 **Technologies Used**

- **Frontend:**
  - React.js (for building the user interface)
  - Axios (for API calls)
  - Tailwind CSS (for styling)
  - React Toastify (for showing toast notifications)

- **Backend:**
  - Node.js (for the server-side logic)
  - Express.js (to handle API requests)
  - MongoDB (for storing tasks and logs)

- **Development Tools:**
  - Vite (for fast development)
  - Postman (for API testing)

---

## 🚀 **Installation**

Follow the steps below to run the project locally on your machine.

### **1. Clone the repository:**

```bash
git clone https://github.com/yourusername/task-manager.git
cd task-manager
```

### **2. Backend Setup**

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root of the backend directory to store your MongoDB URI and other environment variables:

```env
MONGODB_URI=your-mongodb-uri
PORT=3000
```

4. Start the server:

```bash
npm start
```

The backend will be running at `http://localhost:3000`.

### **3. Frontend Setup**

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the React development server:

```bash
npm run dev
```

The frontend will be running at `http://localhost:5173`.

---

## 🔧 **API Endpoints**

### **1. `POST /add-task`**
- **Description:** Add a new task.
- **Request Body:**
  ```json
  {
    "taskName": "Task 1",
    "executionDate": "2024-12-05T12:00:00"
  }
  ```

- **Response:**
  ```json
  {
    "_id": "1",
    "taskName": "Task 1",
    "executionDate": "2024-12-05T12:00:00",
    "status": "Pending",
    "message": "Task added successfully",
    "executionTime": "2024-12-05T12:00:00"
  }
  ```

### **2. `GET /logs`**
- **Description:** Retrieve the logs of all tasks.
- **Response:**
  ```json
  [
    {
      "_id": "1",
      "taskName": "Task 1",
      "status": "Completed",
      "message": "Task executed successfully",
      "executionTime": "2024-12-05T12:00:00"
    }
  ]
  ```

---

## 🖥️ **User Interface**

### **Task Management Page:**

- **Task Form:** A simple form to add tasks, including the task name and execution date.
- **Task List:** A dynamic list that updates in real-time as tasks are added.
- **Toast Notifications:** Alerts for successful or failed task addition.

### **Log Viewer Page:**

- **Log Viewer:** A section that displays a list of execution logs with details such as task name, status, message, and execution time.

---

## 🎨 **UI/UX Design**

The project adopts a minimalist design using **Tailwind CSS** to ensure a fast and responsive user experience. The user interface consists of the following key components:

1. **Task Input:** A sleek input form to add tasks.
2. **Task List:** Stylish cards to display tasks with dynamic content.
3. **Log Display:** An elegant log viewer to show task execution status and details.

### **UI Components**

- **Toast Notifications:** Utilized from `react-toastify` for showing success and error messages when adding tasks.
- **Task Card:** Each task is displayed in a clean and well-organized card with the task name, execution date, and status.
- **Logs List:** The logs are displayed in a list format with time stamps, task names, status, and messages for better tracking.

---

## ⚙️ **Features Roadmap**

Here’s what we plan to add in the future:

- **User Authentication:** Allow users to sign in and manage their tasks securely.
- **Task Editing and Deletion:** Ability to edit or remove tasks from the task list.
- **Task Prioritization:** Add a priority system for tasks.
- **Advanced Log Filtering:** Let users filter logs by task, status, or time range.
- **Dashboard Analytics:** Display graphs and charts to monitor task progress.

---

## 🛠️ **Troubleshooting**

Here are a few common issues you might encounter while setting up or running the project:

### **1. CORS Issues**
If you encounter CORS (Cross-Origin Resource Sharing) errors, ensure that you have added proper CORS headers in your Express backend. For example:

```javascript
const cors = require('cors');
app.use(cors());
```

### **2. 404 Error for Logs**
If the logs are not loading and you're getting a `404` error, check that your backend route for `/logs` is correctly defined.

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- Thank you to the contributors and open-source community for the libraries and tools used in this project.
- Special thanks to **React**, **Axios**, **Tailwind CSS**, and **Node.js/Express** for making development fast and easy.

---

## 📧 **Contact**

If you have any questions or feedback, feel free to reach out to me via email at:  
**arhanrizvi9@gmail.com**

---

## 🎉 **Enjoy using the Task Manager with Log Viewer!** 🎉

---

This README is designed to cover the essential information and provide a pleasant reading experience with detailed explanations and sections.