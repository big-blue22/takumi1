const http = require('http');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');
const mammoth = require('mammoth');

// MIMEタイプマッピング
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Function to parse multipart/form-data
function parseMultipartFormData(req, callback) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
        return callback(new Error('Invalid content-type. Expected multipart/form-data.'), null);
    }

    const boundary = contentType.split('; ')[1].split('=')[1];
    let body = [];
    req.on('data', chunk => {
        body.push(chunk);
    });
    req.on('end', () => {
        body = Buffer.concat(body);
        const parts = body.toString('binary').split(new RegExp(`--${boundary}`))
            .filter(part => part.trim() !== '' && part !== '--\r\n');

        const fileData = {};
        parts.forEach(part => {
            if (part.includes('filename=')) {
                const headerEndIndex = part.indexOf('\r\n\r\n');
                const headers = part.substring(0, headerEndIndex).trim();
                const content = body.slice(body.indexOf(headers) + headers.length + 4, body.indexOf(`--${boundary}`, body.indexOf(headers)) -2);

                const filenameMatch = headers.match(/filename="([^"]+)"/);
                const nameMatch = headers.match(/name="([^"]+)"/);

                if (filenameMatch && nameMatch) {
                    fileData[nameMatch[1]] = {
                        filename: Buffer.from(filenameMatch[1], 'latin1').toString('utf8'), // Handle non-ascii filenames
                        content: content
                    };
                }
            }
        });
        callback(null, fileData);
    });
    req.on('error', err => {
        callback(err, null);
    });
}


const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = req.headers['x-username'] || 'guest'; // Assume guest if no username
  const userUploadsDir = path.join(UPLOADS_DIR, username);

  if (!fs.existsSync(userUploadsDir)) {
    fs.mkdirSync(userUploadsDir, { recursive: true });
  }

  // File Upload
  if (url.pathname === '/upload' && req.method === 'POST') {
    parseMultipartFormData(req, (err, files) => {
        if (err) {
            console.error("Upload error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Error parsing form data: ' + err.message }));
            return;
        }

        if (files && files.file) {
            const file = files.file;
            const originalFilename = path.basename(file.filename); // Sanitize filename
            const extension = path.extname(originalFilename).toLowerCase();

            if (extension === '.docx') {
                mammoth.extractRawText({ buffer: file.content })
                    .then(result => {
                        const txtFilename = originalFilename.replace(/\.docx$/i, '.txt');
                        const filePath = path.join(userUploadsDir, txtFilename);
                        fs.writeFile(filePath, result.value, (err) => {
                            if (err) {
                                console.error("File save error (docx->txt):", err);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'Error saving converted file' }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'File uploaded and converted successfully', filename: txtFilename }));
                        });
                    })
                    .catch(err => {
                        console.error("DOCX parsing error:", err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Error parsing .docx file' }));
                    });
            } else {
                const filePath = path.join(userUploadsDir, originalFilename);
                fs.writeFile(filePath, file.content, (err) => {
                    if (err) {
                        console.error("File save error:", err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Error saving file' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'File uploaded successfully', filename: originalFilename }));
                });
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'No file uploaded or file field is not named "file"' }));
        }
    });
    return;
  }
  
  // List user files
  if (url.pathname === '/api/user-files' && req.method === 'GET') {
      fs.readdir(userUploadsDir, (err, files) => {
          if (err) {
              if (err.code === 'ENOENT') { // Directory doesn't exist yet
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
              }
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Could not read user files directory' }));
              return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(files));
      });
      return;
  }

  // Get user file content
  if (url.pathname === '/api/user-file' && req.method === 'GET') {
      const filename = url.searchParams.get('filename');
      if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Filename query parameter is required' }));
          return;
      }
      const safeFilename = path.basename(filename);
      const filePath = path.join(userUploadsDir, safeFilename);
      fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'File not found' }));
              return;
          }
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(data);
      });
      return;
  }

  // Delete user file
  if (url.pathname === '/api/user-file' && req.method === 'DELETE') {
      const filename = url.searchParams.get('filename');
      if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Filename query parameter is required' }));
          return;
      }
      const safeFilename = path.basename(filename);
      const filePath = path.join(userUploadsDir, safeFilename);
      fs.unlink(filePath, (err) => {
          if (err) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'File not found' }));
              return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'File deleted successfully' }));
      });
      return;
  }

  // URLからファイルパスを取得
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // ファイルの拡張子を取得
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  // ファイルを読み込み
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // ファイルが見つからない場合
        // SPAフォールバック: 不明なパスをindex.htmlにリダイレクト
        if (extname === '') {
            fs.readFile('./index.html', (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Sorry, check with the site admin for error: '+err.code+' ..\n');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                }
            });
        } else {
            console.log(`File not found: ${filePath}`);
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - ファイルが見つかりません</h1>', 'utf-8');
        }
      } else {
        // その他のサーバーエラー
        console.log(`Server error: ${error.code}`);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>500 - サーバーエラー</h1><p>${error.code}</p>`, 'utf-8');
      }
    } else {
      // 正常にファイルを提供
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 8000;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 e-Bridge サーバーが起動しました`);
  console.log(`📍 URL: http://${HOST}:${PORT}`);
  console.log(`📁 静的ファイル提供中: ${path.resolve('.')}`);
  console.log(`🛑 停止するには Ctrl+C を押してください`);
});

// エラーハンドリング
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ ポート ${PORT} は既に使用されています`);
    console.log(`💡 他のポートを試すか、既存のプロセスを停止してください`);
  } else {
    console.error('❌ サーバーエラー:', err);
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 サーバーを停止しています...');
  server.close(() => {
    console.log('✅ サーバーが正常に停止しました');
    process.exit(0);
  });
});