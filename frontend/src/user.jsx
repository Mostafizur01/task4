import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeUserDetail, setActiveUserDetail] = useState(null); 
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });
  const navigate = useNavigate();

  const getUniqIdValue = (id) => {
    return id?.toString().slice(-8) || 'unknown'
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { 'islogin': localStorage.getItem('token') || '' }
      });
      const data = await res.json();
      
      if (data.success) {
        setUsers(data.users);
        if (activeUserDetail) {
          const updated = data.users.find(u => u._id === activeUserDetail._id);
          setActiveUserDetail(updated || null);
        }
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = users.map(user => user._id);
      setSelectedIds(allIds);
      if (users.length > 0) setActiveUserDetail(users[0]);
    } else {
      setSelectedIds([]);
      setActiveUserDetail(null);
    }
  };

  const handleSelectRow = (user) => {
    const id = user._id;
    if (selectedIds.includes(id)) {
      const filtered = selectedIds.filter(item => item !== id);
      setSelectedIds(filtered);
      if (activeUserDetail?._id === id) {
        if (filtered.length > 0) {
          const nextActive = users.find(u => u._id === filtered[0]);
          setActiveUserDetail(nextActive);
        } else {
          setActiveUserDetail(null);
        }
      }
    } else {
      setSelectedIds([...selectedIds, id]);
      setActiveUserDetail(user); 
    }
  };

  const handleToolbarAction = async (action) => {
    if (selectedIds.length === 0) return;
    
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'islogin': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({ userIds: selectedIds, action })
      });
      const data = await res.json();
      
      if (data.success) {
        setStatusMessage({ text: data.message, isError: false });
        if (action === 'delete' || action === 'delete_unverified') {
          setActiveUserDetail(null);
        }
        setSelectedIds([]); 
        fetchUsers(); 
      } else {
        setStatusMessage({ text: data.error, isError: true });
        if (data.redirectTo) navigate(data.redirectTo);
      }
    } catch (error) {
      setStatusMessage({ text: 'Network operation failed.', isError: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatLastSeen = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '1100px' }}>
      
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h4 className="text-secondary fw-normal">User Operations Console</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-1"></i> Logout
        </button>
      </div>

      {statusMessage.text && (
        <div className={`alert ${statusMessage.isError ? 'alert-danger' : 'alert-success'} py-2 mb-3`} role="alert">
          <i className={`bi ${statusMessage.isError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2`}></i>
          {statusMessage.text}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center p-2 mb-0 bg-light border border-bottom-0 rounded-top shadow-sm">
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm btn-white border text-primary px-3 shadow-sm d-flex align-items-center gap-1"
            disabled={selectedIds.length === 0}
            onClick={() => handleToolbarAction('block')}
            title="Block selected accounts"
          >
            <i className="bi bi-lock-fill text-primary"></i> Block
          </button>
          
          <button 
            className="btn btn-sm btn-white border text-primary shadow-sm"
            disabled={selectedIds.length === 0}
            onClick={() => handleToolbarAction('unblock')}
            title="Unblock selected accounts"
          >
            <i className="bi bi-unlock-fill"></i>
          </button>

          <button 
            className="btn btn-sm btn-white border text-danger shadow-sm"
            disabled={selectedIds.length === 0}
            onClick={() => handleToolbarAction('delete')}
            title="Delete permanently from database"
          >
            <i className="bi bi-trash-fill"></i>
          </button>

          <button 
            className="btn btn-sm btn-white border text-danger shadow-sm"
            disabled={selectedIds.length === 0}
            onClick={() => handleToolbarAction('delete_unverified')}
            title="Prune unverified registrations"
          >
            <i className="bi bi-person-x-fill text-danger"></i>
          </button>
        </div>

        <div>
          <input type="text" className="form-control form-control-sm" placeholder="Filter" style={{ width: '180px' }} disabled />
        </div>
      </div>

      <div className="table-responsive border rounded-bottom bg-white shadow-sm mb-4">
        <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
          <thead className="table-light border-bottom text-muted fw-bold">
            <tr>
              <th style={{ width: '45px' }} className="text-center">
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  onChange={handleSelectAll}
                  checked={users.length > 0 && selectedIds.length === users.length}
                />
              </th>
              <th className="text-start ps-3">Name</th>
              <th className="text-start">Email <i className="bi bi-arrow-down text-muted" style={{ fontSize: '11px' }}></i></th>
              <th className="text-start">Status</th>
              <th className="text-start">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr 
                key={user._id} 
                className={selectedIds.includes(user._id) ? 'table-light' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectRow(user)}
              >
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="form-check-input"
                    checked={selectedIds.includes(user._id)}
                    onChange={() => handleSelectRow(user)}
                  />
                </td>
                <td className="text-start ps-3">
                  <span className="fw-semibold text-dark d-block">{user.username}</span>
                  <small className="text-muted" style={{ fontSize: '11px' }}>ID: {getUniqIdValue(user._id)}</small>
                </td>
                <td className="text-start text-secondary">{user.email}</td>
                <td className="text-start">
                  <span className={`text-capitalize ${
                    user.status === 'active' ? 'text-success fw-medium' :
                    user.status === 'blocked' ? 'text-danger fw-medium' : 'text-muted'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="text-start">
                  <div className="text-dark mb-1" title={new Date(user.lastLogin).toLocaleString()}>
                    {formatLastSeen(user.lastLogin)}
                  </div>
                  
                  <div className="d-flex align-items-end gap-1" style={{ height: '16px', paddingTop: '2px' }}>
                    <div style={{ height: '30%', width: '4px', backgroundColor: '#a0c4ff', borderRadius: '1px' }}></div>
                    <div style={{ height: '85%', width: '4px', backgroundColor: '#a0c4ff', borderRadius: '1px' }}></div>
                    <div style={{ height: '45%', width: '4px', backgroundColor: '#a0c4ff', borderRadius: '1px' }}></div>
                    <div style={{ height: '95%', width: '4px', backgroundColor: '#a0c4ff', borderRadius: '1px' }}></div>
                    <div style={{ height: '60%', width: '4px', backgroundColor: '#a0c4ff', borderRadius: '1px' }}></div>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">No records retrieved from storage.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeUserDetail && (
        <div className="card shadow-sm border border-secondary-subtle bg-light">
          <div className="card-header bg-secondary text-white py-2 d-flex justify-content-between align-items-center">
            <span className="fw-medium" style={{ fontSize: '14px' }}>
              <i className="bi bi-cpu-fill me-2"></i> MongoDB Document Core Inspector
            </span>
            <span className="badge bg-dark">Selected</span>
          </div>
          <div className="card-body p-3 bg-white">
            <div className="row g-3" style={{ fontSize: '13px' }}>
              <div className="col-md-6 border-end">
                <p className="mb-2"><strong className="text-muted">Document _id:</strong> <code className="text-danger">{activeUserDetail._id}</code></p>
                <p className="mb-2"><strong className="text-muted">Username Field:</strong> <span className="text-dark fw-bold">{activeUserDetail.username}</span></p>
                <p className="mb-2"><strong className="text-muted">Email Storage Index:</strong> <span className="text-primary">{activeUserDetail.email}</span></p>
              </div>
              <div className="col-md-6 ps-md-4">
                <p className="mb-2">
                  <strong className="text-muted">Status State Enums:</strong> 
                  <span className={`badge ms-2 ${activeUserDetail.status === 'active' ? 'bg-success' : activeUserDetail.status === 'blocked' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                    {activeUserDetail.status}
                  </span>
                </p>
                <p className="mb-2"><strong className="text-muted">Last Login Metric:</strong> <span className="text-secondary">{new Date(activeUserDetail.lastLogin).toUTCString()}</span></p>
                <p className="mb-0"><strong className="text-muted">Schema Timestamps:</strong> <span className="text-muted">{new Date(activeUserDetail.createdAt).toISOString()} (System Created)</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}