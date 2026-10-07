require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 
if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Missing SUPABASE_URL or SUPABASE_KEY in your .env file!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper function to send email alerts to Admin
async function sendEmailAlert(subjectText, bodyText) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'jeyapreetha7307@gmail.com', // Admin inbox
            subject: subjectText,
            text: bodyText
        });
        console.log('Admin email alert sent successfully!');
    } catch (err) {
        console.error('Email Error:', err.message);
    }
}

// ==========================================
// 1. SIGNUP API ROUTE
// ==========================================
app.post('/api/signup', async (req, res) => {
    try {
        const { name, last_name, email, password, role } = req.body;

        const { data, error } = await supabase
            .from('profiles')
            .insert([{ name, last_name: last_name || '', email, password, role }]);

        if (error) {
            console.error('Supabase DB Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Send alert to Admin
        await sendEmailAlert(
            'New FoodBridge Registration!', 
            `A new user registered:\n\nName: ${name} ${last_name || ''}\nEmail: ${email}\nRole: ${role}`
        );

        // Send welcome email to User
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to FoodBridge!',
            text: `Hi ${name},\n\nThank you for joining FoodBridge as a ${role}! We're thrilled to have you help us connect abundance with need.\n\nBest regards,\nThe FoodBridge Team`
        });

        res.status(200).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Server Signup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. LOGIN API ROUTE
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !data) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({ 
            message: 'Login successful!', 
            user: { name: data.name, email: data.email, role: data.role } 
        });
    } catch (err) {
        console.error('Server Login Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. CONTACT API ROUTE
// ==========================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, subject } = req.body;

        const { data, error } = await supabase
            .from('contacts')
            .insert([{ name, email, message, subject }]);

        if (error) {
            console.error('Supabase Contact Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Send alert to Admin
        await sendEmailAlert(
            `New Contact Message: ${subject || 'General Inquiry'}`, 
            `Message from: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        );

        // Send confirmation to User
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'We received your message - FoodBridge',
            text: `Hi ${name},\n\nThank you for reaching out to FoodBridge! We have received your message regarding "${subject || 'Inquiry'}" and will get back to you shortly.\n\nBest regards,\nThe FoodBridge Team`
        });

        res.status(200).json({ message: 'Message saved successfully!' });
    } catch (err) {
        console.error('Server Contact Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. DONATION API ROUTE (POST)
// ==========================================
app.post('/api/donate', async (req, res) => {
    try {
        const { donor_name, email, phone, category, quantity, notes } = req.body;

        const { data, error } = await supabase
            .from('donations')
            .insert([{ donor_name, email, phone, category, quantity, notes }]);

        if (error) {
            console.error('Supabase Donation Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Send alert to Admin
        await sendEmailAlert(
            `New Food Donation Offer: ${category}`, 
            `A new donation has been listed:\n\nDonor/Hotel: ${donor_name}\nEmail: ${email}\nPhone: ${phone}\nCategory: ${category}\nQuantity: ${quantity}\nPickup Notes/Address:\n${notes}`
        );

        // Send confirmation email to Donor
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'FoodBridge - Donation Received & Pending Pickup Coordination',
            text: `Dear ${donor_name},\n\nThank you so much for your generous food donation (${category} - ${quantity})!\n\nWe have successfully received your listing and added it to our active directory. Someone will coordinate the pickup with you shortly.\n\nBest regards,\nThe FoodBridge Team`
        });

        res.status(200).json({ message: 'Donation listing saved and confirmation emails sent!' });
    } catch (err) {
        console.error('Server Donation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. GET DONATIONS API ROUTE (GET)
// ==========================================
app.get('/api/donations', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('donations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase Fetch Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ donations: data });
    } catch (err) {
        console.error('Server Fetch Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. FOOD REQUEST API ROUTE (POST)
// ==========================================
app.post('/api/request-food', async (req, res) => {
    try {
        const { org_name, email, phone, scale, urgency, notes } = req.body;

        const { data, error } = await supabase
            .from('food_requests')
            .insert([{ org_name, email, phone, scale, urgency, notes }]);

        if (error) {
            console.error('Supabase Food Request Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Send alert to Admin
        await sendEmailAlert(
            `New Food Assistance Request: ${org_name}`, 
            `An organization is requesting food:\n\nOrganization: ${org_name}\nEmail: ${email}\nPhone: ${phone}\nPeople to Feed: ${scale}\nUrgency: ${urgency}\nDelivery Notes/Address:\n${notes}`
        );

        // Send confirmation email to Organization
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'FoodBridge - Food Assistance Request Received',
            text: `Dear ${org_name},\n\nWe have received your request for food assistance (${scale} - Urgency: ${urgency}). You now have full access to browse our registered hotel and donor directory.\n\nBest regards,\nThe FoodBridge Team`
        });

        res.status(200).json({ message: 'Request submitted successfully!' });
    } catch (err) {
        console.error('Server Request Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`FoodBridge backend server is running on http://localhost:${PORT}`);
});