import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import User from './models/user.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import connectMogoose from './models/mongooseConnact.js'
import login from './middleware/isLogin.js'
import jwt from 'jsonwebtoken'

dotenv.config()
const app = express()
const port = process.env.PORT || 3000
app.use(express.json())

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://task4-frontend-my0v.onrender.com')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, islogin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next();
});


connectMogoose()

let mydata

try {
    mydata = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000
    });
    console.log("Brevo transporter created successfully.");
} catch (error) {
    console.log('Error setting up Brevo transport:', error);
}


app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, email, and password are required' 
            })
        }

        if (username.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username must be at least 3 characters' 
            })
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 6 characters' 
            })
        }

        const emailRegex = /^\s*[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}\s*$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            })
        }

        const lowerEmail = email.toLowerCase().trim();
        const trimmedUsername = username.trim();

        const existingUser = await User.findOne({ 
            $or: [{ email: lowerEmail }, { username: trimmedUsername }] 
        })

        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                error: existingUser.email === lowerEmail ? 'Email already registered' : 'Username already taken'
            })
        }

        const token = crypto.randomBytes(32).toString('hex')
        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = new User({
            username: trimmedUsername,
            email: lowerEmail,
            password: hashPassword,
            verifiedToken: token,
            status: 'unverified'
        })
        await newUser.save()

        const verifiedTokenLink = `${process.env.FRONTEND_URL}/api/verify/${token}`

        const emailBody = {
            from: '"task4" <mostafizurrahmanmd43@gmail.com>',
            to: lowerEmail,
            subject: 'Please verify your account',
            html: `<h1>Hello ${trimmedUsername}</h1><p>Click link to verify:</p><a href="${verifiedTokenLink}">Verify Account</a>`
        }

        try {
            await mydata.sendMail(emailBody)
        } catch (emailError) {
            console.log('Email sending error:', emailError)
            // Email sending failure shouldn't block registration
        }
        
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful. Check your email to verify.',
            redirectTo: `${process.env.FRONTEND_URL}/user` 
        })
        
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/api/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verifiedToken: token })
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/`)
        }

        if (user.isVerified) {
            return res.redirect(`${process.env.FRONTEND_URL}/user`)
        }

        user.isVerified = true
        user.verifiedToken = undefined
        user.status = 'active'
        await user.save();

        return res.redirect(`${process.env.FRONTEND_URL}/user`)
    } catch (error) {
        console.log('Email verification error: ', error)
        return res.redirect(`${process.env.FRONTEND_URL}/`)
    }
})


app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            })
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() })
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            })
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, error: 'Your account is blocked!' })
        }

        if (!user.isVerified) {
            return res.status(403).json({ 
                success: false, 
                error: 'Please verify your email before logging in' 
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }

        user.lastLogin = Date.now()
        await user.save()
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || process.env.JWT, { expiresIn: '1d' })
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            redirectTo: `${process.env.FRONTEND_URL}/user`
        })
    } catch (error) {
        console.log('Login error: ', error)
        return res.status(500).json({ success: false, error: 'Server error during login' })
    }
})

app.post('/api/forgotpass', async (req, res) => {
    try {
        const { email } = req.body
        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            })
        }

        const user = await User.findOne({ email: email.toLowerCase() })
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'No account found with this email'
            })
        }
        const token = crypto.randomBytes(32).toString('hex')
        user.resetPassToken = token
        user.resetPassExp = Date.now() + 3600000

        await user.save()

        const resetTokenLink = `${process.env.FRONTEND_URL}/reset-password/${token}`
        const emailBody = {
            from: '"task4" <mostafizurrahmanmd43@gmail.com>',
            to: email.toLowerCase(),
            subject: 'Password Reset Request',
            html: `
                <h1>Hello ${user.username || 'User'}</h1> 
                <p>You requested a password reset. Please click the link below to reset your password:</p>
                <a href="${resetTokenLink}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${resetTokenLink}</p>
                <p>This link will expire in 1 hour.</p>
            `
        }
        try {
            await mydata.sendMail(emailBody)
        } catch (emailError) {
            console.log('Email sending error:', emailError)
        }

        return res.status(200).json({
            success: true,
            message: 'Password reset instructions sent to your email.'
        })
    } catch (error) {
        console.log('Forgot password error: ', error)
        return res.status(500).json({ success: false, error: 'Server error' })
    }
})

app.get('/api/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            resetPassToken: token, 
            resetPassExp: { $gt: Date.now() }
        });
        if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        
        return res.status(200).json({ success: true, message: 'Token is valid' })
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' })
    }
})

app.post('/api/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params
        const { newPassword, confirmPassword } = req.body

        // Input validation
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password and confirmation are required' 
            })
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Passwords do not match' 
            })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 6 characters' 
            })
        }

        const user = await User.findOne({
            resetPassToken: token,
            resetPassExp: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or expired reset token' 
            })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        user.resetPassToken = undefined
        user.resetPassExp = undefined
        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login.',
            redirectTo: `${process.env.FRONTEND_URL}/login`
        })
    } catch (error) {
        console.log('Password reset error: ', error)
        return res.status(500).json({ success: false, error: 'Server error during password reset' })
    }
})

app.get('/api/user', login, async (req, res) => {
    try {
        const user = req.userDoc
        return res.status(200).json({ success: true, user: { ...user.toObject(), password: undefined } })
    } catch (error) {
        console.log('the problem on user rout: ', error)
        return res.status(500).json({ success: false, error: 'Server error while fetching user data' })
    }
})

app.get('/api/admin/users', login, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ lastLogin: -1, createdAt: -1 })
        return res.status(200).json({ success: true, users })
    } catch (error) {
        console.log('admin users error: ', error)
        return res.status(500).json({ success: false, error: 'Unable to load users' })
    }
})

app.post('/api/admin/actions', login, async (req, res) => {
    try {
        const { userIds, action } = req.body
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Select at least one user' })
        }

        let result
        let message

        switch (action) {
            case 'block':
                result = await User.updateMany({ _id: { $in: userIds } }, { $set: { status: 'blocked' } })
                message = `${result.modifiedCount} user(s) blocked`
                break
            case 'unblock':
                const activeUpdate = await User.updateMany({ _id: { $in: userIds }, status: 'blocked', isVerified: true }, { $set: { status: 'active' } })
                const unverifiedUpdate = await User.updateMany({ _id: { $in: userIds }, status: 'blocked', isVerified: false }, { $set: { status: 'unverified' } })
                message = `${activeUpdate.modifiedCount + unverifiedUpdate.modifiedCount} user(s) unblocked`
                break
            case 'delete':
                result = await User.deleteMany({ _id: { $in: userIds } })
                message = `${result.deletedCount} user(s) deleted`
                break
            case 'delete_unverified':
                result = await User.deleteMany({ _id: { $in: userIds }, status: 'unverified' })
                message = `${result.deletedCount} unverified user(s) deleted`
                break
            default:
                return res.status(400).json({ success: false, error: 'Unknown action' })
        }

        return res.status(200).json({ success: true, message })
    } catch (error) {
        console.log('admin actions error: ', error)
        return res.status(500).json({ success: false, error: 'Unable to complete action' })
    }
})

app.listen(port, () => {
    console.log(`Server running at port ${port}`)
})