import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './css/login.css'
import { API_BASE_URL } from './apiConfig'

export default function Login() {
  const [data, setData] = useState({
    email: '',
    pass: ''
  })
  const [message, setMessage] = useState({ text: '', type: '' })

  const Change = (e) => {
    setData({ ...data, [e.target.id]: e.target.value })
  }

  const submit = async (e) => {
    e.preventDefault()

    const post = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.pass })
    })
    let userData = await post.json()
    if (post.ok && userData.success) {
      setMessage({ text: 'Login successful', type: 'success' })
      localStorage.setItem('token', userData.token)
      setData({ email: '', pass: '' })
      window.location.href = userData.redirectTo
    } else {
      setMessage({ text: userData.error || 'Invalid credentials', type: 'danger' })
    }
  }
  return (
    <div className="main-container">
      <div className="form-card">
        <h2 className="form-title">Account Login</h2>

        <form action="" onSubmit={submit} className="login-form">
          <table className="form-table">
            <tbody>
              <tr>
                <td><label htmlFor="email">Email</label></td>
                <td><input type="email" id="email" value={data.email} required onChange={Change} placeholder="Enter your email" /></td>
              </tr>

              <tr>
                <td><label htmlFor="pass">Password</label></td>
                <td><input type="password" id="pass" value={data.pass} required onChange={Change} placeholder="Enter your password" /></td>
              </tr>

              <tr>
                <td></td>
                <td>
                  <button type="submit" className="submit-btn">Login</button>
                </td>
              </tr>
            </tbody>
          </table>

          {message.text && (
            <div className={`alert alert-${message.type} mt-3`} role="alert">
              {message.text}
            </div>
          )}

          {message.text && (
            <div className={`alert alert-${message.type} mt-3`} role="alert">
              {message.text}
            </div>
          )}

          <p className="register-link">
            <div>Don't have an account? <Link to="/">Register here</Link></div>
            <Link to="/forgotpass">Forget Password</Link>
          </p>
        </form>
      </div>
    </div>
  )
}