import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import User from './models/user.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import connectMogoose from './models/mongooseConnact.js'
import { errorMonitor } from 'events'
import login from './middleware/isLogin.js'
import jwt from 'jsonwebtoken'

dotenv.config()
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors({
    origin: 'https://task4-frontend-my0v.onrender.com',
    credentials: true
}))
app.options('*', cors())
connectMogoose()

let mydata

try {
    mydata = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mostafizurrahmanmd43@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    })
} catch (error) {
    console.log('error on the email pass', error)
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body
        const token = crypto.randomBytes(32).toString('hex')
        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = new User({
            username,
            email,
            password: hashPassword,
            verifiedToken: token,
            status: 'unverified'
        })
        await newUser.save()

        const jwtToken = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT || 'asdfjhlahksdf', { expiresIn: '1d' })
        const verifiedTokenLink = `${process.env.BACKEND_URL}/api/verify/${token}`
        const emailBody = {
            from: '"task4" <mostafizurrahmanmd43@gmail.com>',
            to: email,
            subject: 'Please verify your account',
            html: `
                <h1>hello ${username}</h1>
                <p>Thank you for registering. Please click the link below to verify your account:</p>
                <a href="${verifiedTokenLink}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Account</a>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${verifiedTokenLink}</p>
                `
        }

        mydata.sendMail(emailBody).catch((err) => console.log('Email send failed:', err))

        res.status(202).json({
            success: true,
            message: 'Register successful. Please verify your email.',
            token: jwtToken,
            redirectTo: `${process.env.FRONTEND_URL}/user`
        })

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Email already registered (DB Index Validation)' })
        }
        res.status(500).json({ success: false, error: error.message })
    }
})

app.get('/api/verify/:token', async (req, res) => {
    try {
        const { token } = req.params

        const user = await User.findOne({ verifiedToken: token })
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/`)
        }

        user.isVerified = true
        user.verifiedToken = undefined
        if (user.status !== 'blocked') {
            user.status = 'active'
        }

        await user.save()

        return res.redirect(`${process.env.FRONTEND_URL}/user`)

    } catch (error) {
        console.log('verify route error:', error)
        return res.status(500).send('Verification failed')
    }
})


app.post('/api/login', async (req, res) => {
    try {
        const {email, password} = req.body
        const user = await User.findOne({ email })
        if(!user) {
            return res.status(404).json({
                success: false,
                error: 'You don\'t have any account',
            })
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, error: 'Your account is blocked!' })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' })
        }
        user.lastLogin = Date.now()
        await user.save()
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT || 'asdfjhlahksdf', { expiresIn: '1d' })
        return res.status(200).json({ success: true, message: 'you are successfuly login', token, redirectTo: `${process.env.FRONTEND_URL}/user` })
    } catch (error) {
        console.log('the problem is on login page: ', error)
        return res.status(500).json({ success: false, error: 'Server error during login' })
    }
})

app.post('/api/forgotpass', async (req, res) => {
    try {
        const {email} = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(200).json({
                success: false,
                error: 'You dont have any account',
                redirectTo: `${process.env.FRONTEND_URL}`
            })
        }
        const token = crypto.randomBytes(32).toString('hex')
        user.resetPassToken = token
        user.resetPassExp = Date.now() + 3600000

        await user.save()

        const resetTokenLink = `${process.env.FRONTEND_URL}/reset-password/${token}`
        const emailBody = {
            from: '"task4" <mostafizurrahmanmd43@gmail.com>',
            to: email,
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
        await mydata.sendMail(emailBody)

        return res.status(250).json({
            success: true,
            message: 'we sent password reset instructions.'
        })
    } catch (error) {
        console.log('The error on forgetpass rout: ', error)
    }
})

app.get('/api/reset-password/:token', async (req, res) => {
    try {
        const {token} = req.params

        const user = await User.findOne({
            resetTokenPass: token,
            resetTokenExp: {$gt: Date.now()}
        })
        if(!user) {
            return res.status(200).json({
                success: false,
                error:  'Retry'
            })
        }
        return res.status(201).json({
            success: true,
            message: 'Successfuly login'
        })
    } catch (error) {
        console.log('reset-password rout problem:', error)
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
    console.log(`surver run at port ${process.env.BACKEND_URL}:${port}`)
})