#!/usr/bin/env python3
import http.server
import json
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BOOKS_FILE = os.path.join(BASE_DIR, 'books.json')
USERS_FILE = os.path.join(BASE_DIR, 'users.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')

class TandaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        serve_dir = DIST_DIR if os.path.isdir(DIST_DIR) else BASE_DIR
        super().__init__(*args, directory=serve_dir, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        if clean_path in ('/api/books', '/books.json'):
            if os.path.exists(BOOKS_FILE):
                try:
                    with open(BOOKS_FILE, 'r', encoding='utf-8') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(data.encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                    return

        if clean_path in ('/api/users', '/users.json'):
            if os.path.exists(USERS_FILE):
                try:
                    with open(USERS_FILE, 'r', encoding='utf-8') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(data.encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                    return

        # SPA fallback to dist/index.html if file doesn't exist
        serve_dir = DIST_DIR if os.path.isdir(DIST_DIR) else BASE_DIR
        requested_file = os.path.join(serve_dir, self.path.lstrip('/').split('?')[0])
        if not os.path.exists(requested_file) and os.path.isfile(os.path.join(DIST_DIR, 'index.html')):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(os.path.join(DIST_DIR, 'index.html'), 'rb') as f:
                self.wfile.write(f.read())
            return

        return super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        if clean_path in ('/api/books', '/books.json'):
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                parsed = json.loads(body)
                if isinstance(parsed, list):
                    with open(BOOKS_FILE, 'w', encoding='utf-8') as f:
                        json.dump(parsed, f, ensure_ascii=False, indent=2)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'ok', 'count': len(parsed)}).encode('utf-8'))
                    return
                else:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'{"error": "Expected JSON array of books"}')
                    return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        if clean_path in ('/api/users', '/users.json'):
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                parsed = json.loads(body)
                if isinstance(parsed, list):
                    with open(USERS_FILE, 'w', encoding='utf-8') as f:
                        json.dump(parsed, f, ensure_ascii=False, indent=2)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'ok', 'count': len(parsed)}).encode('utf-8'))
                    return
                else:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'{"error": "Expected JSON array of users"}')
                    return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return
        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), TandaHandler)
    print(f'Tanda server running on http://localhost:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
