const express = require('express');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware to read HTML form data and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from this folder
app.use(express.static(__dirname));

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Sign-in / Registration Endpoint
app.post('/api/signin', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('All fields are required.');
  }

  try {
    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Insert data into your Supabase 'users' table
    const { error } = await supabase
      .from('users')
      .insert([{ username, email, password: hashedPassword }]);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(400).send('Error: Username or email may already exist.');
    }

    // 3. SUCCESS: Redirect to welcome page
    res.redirect('/welcome.html');

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).send('Internal server error.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});