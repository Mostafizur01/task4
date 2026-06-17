import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './Register'
import Login from './login'
import User from './user'
import Forgetpass from './Forgetpass'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path='/user' element={<User />} />
        <Route path='/forgotpass' element={<Forgetpass />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
