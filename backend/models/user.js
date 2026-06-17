import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [/^\s*[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}\s*$/, 'Please fill a valid email address'],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    status: {
      type: String,
      enum: ['unverified', 'active', 'blocked'],
      default: 'unverified'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastLogin:  {
        type: Date,
        default: Date.now
    },
    verifiedToken: String,
    resetPassToken: String,
    resetPassExp: Date,
}, { timestamps: true })

userSchema.index({ email: 1 }, { unique: true })

const User = mongoose.model('User', userSchema)

export default User