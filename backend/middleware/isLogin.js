import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import User from '../models/user.js'

dotenv.config()

const login = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || 
                      req.headers.islogin;
        if (!token) {
            return res.status(401).json({ success: false, error: 'You have to login', redirectTo: `${process.env.FRONTEND_URL}/login`})
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT)
        const user = await User.findById(decoded.id)
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid token or user not found', redirectTo: `${process.env.FRONTEND_URL}/login`})
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, error: 'Account blocked', redirectTo: `${process.env.FRONTEND_URL}/login` })
        }
        req.user = decoded
        req.userDoc = user
        next()
    } catch (error) {
        console.log ('Middleware auth error: ', error)
        return res.status(401).json({
            success: false,
            error: 'Token expired or invalid', 
            redirectTo: `${process.env.FRONTEND_URL}/login`
        })
    }
}

export default login