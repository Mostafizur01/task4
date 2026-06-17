import React from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import './css/register.css'

export default function Register() {
  const [data, setData] = useState({
    username: '',
    email: '',
    password: ''
  })

  const change = (e) => {
    setData({ ...data, [e.target.id]: e.target.value })
  }

  
  const [message, setMessage] = useState({ text: '', type: '' })

  const submit = async (e) => {
    e.preventDefault()

    const post = await fetch(`/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    let resData = await post.json()
    
    if (post.ok && resData.success) {
      setMessage({ text: resData.message || 'Registration successful! Please verify your email.', type: 'success' })
      if (resData.token) {
        localStorage.setItem('token', resData.token)
      }
      setData({ username: '', email: '', password: '' })
      setTimeout(() => {
        window.location.href = resData.redirectTo
      }, 500)
    } else {
      const errorMsg = typeof resData === 'object' && resData.error ? resData.error : JSON.stringify(resData)
      setMessage({ text: errorMsg || 'Server result error', type: 'danger' })
    }
  }

  return (
    <div className="main-container">
      <div className="form-card">
        <h2 className="form-title">Create an Account</h2>

        <form action="" onSubmit={submit} className="register-form">
          <table className="form-table">
            <tbody>
              <tr>
                <td><label htmlFor="username">User Name</label></td>
                <td><input type="text" id="username" required onChange={change} value={data.username} placeholder="Enter username" /></td>
              </tr>
              <tr>
                <td><label htmlFor="email">Email Address</label></td>
                <td><input type="email" id="email" required onChange={change} value={data.email} placeholder="Enter email" /></td>
              </tr>
              <tr>
                <td><label htmlFor="password">Password</label></td>
                <td><input type="password" id="password" required onChange={change} value={data.password} placeholder="Enter password" /></td>
              </tr>
              <tr>
                <td></td>
                <td>
                  <button type="submit" className="submit-btn">Register</button>
                </td>
              </tr>
            </tbody>
          </table>

          {message.text && (
            <div className={`alert alert-${message.type} mt-3`} role="alert">
              {message.text}
            </div>
          )}

          <p className="login-link">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  )
}