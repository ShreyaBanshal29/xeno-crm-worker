# Xeno CRM

A full-stack Customer Relationship Management (CRM) system with campaign management functionality.

## Tech Stack

- **Frontend**: React with Bootstrap for UI
- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas
- **Message Broker**: Redis (via Upstash)
- **AI Integration**: OpenAI API
- **Deployment**: Vercel (frontend) + Render (backend and worker)

## Features

- Customer and order management
- AI-powered campaign rule generation
- Campaign creation with audience targeting
- Background processing with Redis pub/sub
- Campaign history tracking

## Project Structure

```
xeno-crm/
├── client/               # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── App.js
│       └── ...
├── server/               # Express backend
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── worker/               # Background worker
│   └── campaignWorker.js
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB Atlas account
- Upstash Redis account
- OpenAI API key

### Environment Variables

#### Backend (.env)
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_upstash_redis_url
OPENAI_API_KEY=your_openai_api_key
```

#### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/xeno-crm.git
cd xeno-crm
```

2. Install backend dependencies
```
cd server
npm install
```

3. Install worker dependencies
```
cd ../worker
npm install
```

4. Install frontend dependencies
```
cd ../client
npm install
```

### Running Locally

1. Start the backend server
```
cd server
npm run dev
```

2. Start the worker
```
cd worker
npm run start
```

3. Start the frontend
```
cd client
npm start
```


## API Endpoints

- `/api/customers` - Customer management (POST)
- `/api/orders` - Order management (POST)
- `/api/preview` - Preview campaign audience (POST)
- `/api/campaigns` - Campaign management (GET, POST)
- `/api/ai/generate-rules` - AI rule generation (POST)
- `/api/vendor/send` - Mock message delivery (POST) 
