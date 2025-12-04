import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, // Default limit
    total: 0,
    totalPages: 0,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Ensure limit doesn't exceed 100
      const limit = Math.min(pagination.limit, 100);
      
      const response = await usersAPI.listUsers({
        page: pagination.page,
        limit: limit,
      });
      setUsers(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Users</h2>
          <p className="text-sm text-base-content/60 mt-1">
            {pagination.total} total users
          </p>
        </div>
        <button className="btn btn-primary">
          Create User
        </button>
      </div>

      {error && (
        <div className="alert alert-error rounded-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm border border-base-200">
        <table className="table">
          <thead>
            <tr className="bg-base-200/50">
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover">
                <td>{user.id}</td>
                <td>
                  <div className="font-bold">{user.fullName}</div>
                </td>
                <td>{user.email}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((role) => (
                      <span key={role} className="badge badge-sm badge-outline">
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-ghost">Edit</button>
                    <button className="btn btn-sm btn-ghost text-error">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12 bg-base-200/50 rounded-lg">
          <p className="text-lg font-medium opacity-60">No users found</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <select 
              className="select select-bordered select-xs" 
              value={pagination.limit} 
              onChange={handleLimitChange}
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              «
            </button>
            <button className="join-item btn btn-sm pointer-events-none">
              Page {pagination.page} of {pagination.totalPages}
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
