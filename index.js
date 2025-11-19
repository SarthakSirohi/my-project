const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// In-memory store for file passwords
// Key: filename, Value: password set by uploader
const filePasswords = {};

app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve uploads folder statically only after password verified
// So we don't expose files without password check here
app.use('/files', express.static(path.join(__dirname, 'uploads')));

// Home page with upload form (includes password input)
app.get('/', (req, res) => {
  res.send(`
    <h2>Upload a File with Password Protection</h2>
    <form method="POST" enctype="multipart/form-data" action="/upload">
      <input type="file" name="myfile" required /><br><br>
      <input type="text" name="password" placeholder="Set download password" required /><br><br>
      <button type="submit">Upload</button>
    </form>
  `);
});

// Upload endpoint saves the file and password in memory
app.post('/upload', upload.single('myfile'), (req, res) => {
  if (!req.file || !req.body.password) {
    return res.status(400).send('File and password are required.');
  }

  // Store password associated with uploaded filename
  filePasswords[req.file.filename] = req.body.password;

  const fileUrl = `http://localhost:${PORT}/download/${req.file.filename}`;
  res.send(`
    <p>File uploaded successfully with password protection.</p>
    <p>Share this link to download the file:</p>
    <a href="${fileUrl}" target="_blank">${fileUrl}</a>
  `);
});

// Render password input page before allowing download
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;

  // Serve a simple HTML form to enter password
  res.send(`
    <h3>Enter password to access the file</h3>
    <form method="POST" action="/download/${filename}">
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Submit</button>
    </form>
  `);
});

// Handle password check and serve file if correct
app.post('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const enteredPassword = req.body.password;

  const realPassword = filePasswords[filename];
  if (!realPassword) {
    return res.status(404).send('File not found.');
  }
  if (enteredPassword !== realPassword) {
    return res.status(401).send('Incorrect password.');
  }

  // Password correct, send the file for download
  res.sendFile(path.join(__dirname, 'uploads', filename));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});