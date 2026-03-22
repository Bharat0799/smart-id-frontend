# 🆔 Smart ID Card Re-Issue System

A full-stack web application designed to automate and simplify the process of re-issuing student ID cards. The system replaces manual workflows with a fast, secure, and scalable digital solution.

---

## 🚀 Live Demo
🌐 https://bharat0799.github.io/smart-id-frontend/

---

## 📌 Project Overview

The Smart ID Card Re-Issue System addresses inefficiencies in traditional ID management systems such as delays, manual errors, and lack of proper tracking.

This platform enables administrators to process re-issue requests, manage student records, and generate digital ID cards seamlessly.

---

## ✨ Features

- 🔐 Secure admin authentication system  
- 🧾 Submit and manage ID re-issue requests  
- 📊 Interactive dashboard for tracking requests  
- 📁 Bulk student data upload via CSV  
- 🆔 Automatic ID card generation  
- 📄 Download ID cards in PDF format  
- 🔍 Search and filter functionality  
- 📱 Fully responsive design  

---

## 🛠️ Tech Stack

### Frontend
- HTML  
- CSS  
- JavaScript  

### Backend
- Node.js  
- Express.js  

### Database
- MongoDB  

### Tools & Technologies
- REST APIs  
- Git & GitHub  
- Postman  

---

## ⚙️ System Architecture

Frontend (UI) communicates with backend APIs built using Express.js.  
The backend handles business logic, processes requests, and interacts with MongoDB for data storage.User → Frontend → API (Express.js) → MongoDB---

## 🔄 How It Works

1. Admin logs into the system  
2. Uploads student data (CSV) or submits individual requests  
3. Backend validates and stores data in MongoDB  
4. System processes re-issue requests  
5. ID cards are generated dynamically  
6. Admin can download ID cards in PDF format  
7. All requests are tracked in the dashboard  

---

## 📂 Project Structure
smart-id-reissue/ 
              │ 
              ├── frontend/ │ 
                    ├── index.html │ 
                    ├── styles/ │  
                    ├── scripts/ │
               ├── backend/ │  
               ├── server.js │  
               ├── routes/ │  
               ├── controllers/ │ 
               ├── models/ │ 
               └── config/ │
               ├── data/ │ 
               └── sample.csv │
               └── README.md
---

## ⚡ API Endpoints (Sample)

- `POST /api/login` → Admin authentication  
- `POST /api/upload` → Upload student data (CSV)  
- `GET /api/students` → Fetch all student records  
- `POST /api/reissue` → Process ID re-issue request  
- `GET /api/download/:id` → Download ID card PDF  

---

## 🎯 Purpose of the Project

- Eliminate manual ID card processing  
- Improve efficiency and accuracy  
- Provide a scalable digital solution for institutions  

---

## 🧠 What I Learned

- Building full-stack applications using Node.js and MongoDB  
- Designing RESTful APIs  
- Handling bulk data processing (CSV)  
- Generating dynamic PDFs  
- Structuring scalable backend architecture  

---


## 👨‍💻 Author

**Bharath Chandra Tadi**  
📧 bharathtadi07@gmail.com  
🔗 https://github.com/Bharat0799  
---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub!
