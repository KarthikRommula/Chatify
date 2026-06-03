# Chatify

A real-time, room-based group chat application built with Flask and WebSockets. Users create or join themed chat rooms, exchange messages and files instantly, share rooms via auto-generated QR codes, and summon an AI assistant inside any conversation by mentioning `@chatify`.

> **Private · Seamless · Always Connected**

## Features

- **Real-time messaging** — instant, bidirectional chat powered by Socket.IO with join/leave notifications.
- **Themed rooms** — create rooms by genre (Casual Talk, Private, Family & Friends, Events, Tech). Each room gets a unique 6-character code.
- **QR code sharing** — every new room generates a scannable QR code linking directly to the join page.
- **AI assistant** — mention `@chatify <question>` in a room to get an AI-generated reply from the Groq API (Llama 3 `llama3-8b-8192`). Common phrases use predefined responses.
- **File sharing** — upload images, PDFs, and documents (up to 100 MB) directly into a room; files are persisted and broadcast to all members.
- **Persistent chat history** — messages, uploads, and rooms are stored in SQLite, so history is reloaded when a room is reopened.
- **Room management** — view all active rooms and release (delete) a room along with its messages & uploads.

## Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Backend      | Python, [Flask](https://flask.palletsprojects.com/) 3             |
| Real-time    | [Flask-SocketIO](https://flask-socketio.readthedocs.io/) (WebSockets) |
| Database     | SQLite (via the standard-library `sqlite3` module)                |
| AI           | [Groq API](https://groq.com/) — Llama 3 (`llama3-8b-8192`)        |
| Templating   | Jinja2                                                            |
| Frontend     | HTML, Tailwind CSS (CDN), Font Awesome, vanilla JS, Socket.IO client |
| QR codes     | `qrcode` + Pillow                                                 |
| WSGI server  | Gunicorn (production)                                             |

## How It Works

Chatify is a single Flask application (`app.py`) that serves Jinja2 templates and exposes both HTTP routes and Socket.IO event handlers.

1. **Create a room** — `POST /create-room` generates a random 6-character room code, stores it in the `rooms` table, renders a QR code into `static/qr_codes/`, and returns the room page.
2. **Join a room** — `GET /room/<room_code>` loads prior chat history from SQLite and renders the collaboration view. The client then emits a Socket.IO `join` event; active usernames per room are tracked in memory to prevent duplicates.
3. **Messaging** — clients emit a `message` event; the server persists each message with a timestamp and broadcasts it to everyone in the room. Messages beginning with `@chatify` are routed to `generate_bot_response()`, which calls the Groq chat-completions API and emits the AI reply back to the room.
4. **File uploads** — files are posted to `/upload`, saved under `uploads/`, recorded in the `uploads` table, and announced to the room over Socket.IO. Uploaded files are served back via `/uploads/<filename>`.

### Database Schema

The SQLite database (`data.db`) is auto-initialized on startup with three tables:

- `rooms` — `room_code` (unique), `genre`
- `messages` — `room_code`, `username`, `message`, `timestamp`
- `uploads` — `filename`, `file_url`, `username`, `room_code`

### Key HTTP Routes

| Route                         | Method   | Purpose                                      |
| ----------------------------- | -------- | -------------------------------------------- |
| `/`                           | GET      | Home page with genre selection               |
| `/create-room`                | POST     | Create a room and generate its QR code        |
| `/room/<room_code>`           | GET      | Join a room and load chat history             |
| `/room-history/<room_code>`   | GET      | Fetch a room's message history as JSON        |
| `/upload`                     | POST     | Upload a file to a room                        |
| `/uploads/<filename>`         | GET      | Download/serve an uploaded file               |
| `/view-rooms`                 | GET      | List all active rooms                          |
| `/release-room/<room_code>`   | GET      | Delete a room and its messages/uploads         |
| `/search`                     | POST     | Search sample projects                         |

### Socket.IO Events

`join`, `message`, `leave`, and `file_upload` — handled server-side to manage room membership, broadcast messages, relay AI responses, and announce file uploads.

## Project Structure

```
Chatify/
├── app.py              # Flask app: routes, Socket.IO handlers, DB, Groq integration
├── requirements.txt    # Python dependencies
├── static/
│   ├── script.js       # Client-side logic
│   ├── styles*.css      # Stylesheets
│   ├── qr_codes/       # Generated room QR codes
│   └── *.jpg, *.webm   # Background media
├── templates/
│   ├── index.html      # Home / genre selection
│   ├── room.html       # Created-room page (shows QR code)
│   ├── collaboration.html  # In-room chat view
│   └── view_rooms.html # List of active rooms
└── .gitignore
```

> `data.db` (SQLite) and the `uploads/` folder are created at runtime and are git-ignored.

## Prerequisites

- Python 3.8+
- A [Groq API key](https://console.groq.com/) (required for the `@chatify` AI assistant)

## Installation

```bash
# Clone the repository
git clone https://github.com/KarthikRommula/Chatify.git
cd Chatify

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create a `.env` file in the project root (it is git-ignored) with your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

The key is loaded via `python-dotenv` and used for AI assistant responses. Without it, the `@chatify` command will fail gracefully and return a fallback message.

## Usage

### Development

```bash
python app.py
```

The app runs on `http://127.0.0.1:5000` (bound to `0.0.0.0:5000`) with debug mode enabled.

### Production

A production-grade WSGI server (Gunicorn) is included in the requirements. Because the app relies on WebSockets, run it with an eventlet/gevent worker, e.g.:

```bash
gunicorn -k eventlet -w 1 app:app --bind 0.0.0.0:5000
```

## Notes

- File uploads are limited to **100 MB**; allowed extensions are `jpg`, `jpeg`, `png`, `gif`, `pdf`, `txt`, `doc`, `docx`, `ppt`, `pptx`. Exceeding the limit returns an HTTP 413 with a JSON error.
- The Flask `SECRET_KEY` in `app.py` is a placeholder — set a strong, secret value before deploying to production.
