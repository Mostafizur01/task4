import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './css/forgetpass.css'

export default function Forgetpass() {
  const [email, setEmail] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const post = await fetch('/api/forgotpass', {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ email })
    })

    const result = await post.json()
    alert(result.message || 'If your email exists, we sent password reset instructions.')
  }

  return (
    <div className="main-container">
      <div className="form-card">
        <h2 className="form-title">Forgot Password</h2>
        <p className="form-text">Enter your email and we will send you a reset link.</p>

        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <button type="submit" className="submit-btn">Send Reset Link</button>
        </form>

        <p className="register-link">
          Remembered your password? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}
