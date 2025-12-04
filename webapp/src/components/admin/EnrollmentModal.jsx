import { useState, useEffect } from 'react';
import { enrollmentsAPI, usersAPI } from '../../services/api';

const EnrollmentModal = ({ workshopId, enrollment, existingParticipantIds = [], onClose }) => {
  const [formData, setFormData] = useState({
    status: 'ACTIVE',
  });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (enrollment) {
      setFormData({
        status: enrollment.status || 'ACTIVE',
      });
    } else {
      fetchUsers();
    }
  }, [enrollment]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersAPI.listUsers({ limit: 100 });
      const allUsers = response.data?.data || response.data?.users || response.data || [];
      // Filter users who have PARTICIPANT role and are not already enrolled
      const participants = Array.isArray(allUsers) 
        ? allUsers.filter(user => 
            user.roles?.includes('PARTICIPANT') && 
            !existingParticipantIds.includes(user.id)
          )
        : [];
      setUsers(participants);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEnrollParticipant = async (participantId) => {
    setLoading(true);
    setError('');

    try {
      await enrollmentsAPI.createEnrollment({
        participantId: parseInt(participantId),
        workshopId: parseInt(workshopId),
        status: 'ACTIVE',
      });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll participant');
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await enrollmentsAPI.updateEnrollment(enrollment.id, {
        status: formData.status,
      });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update enrollment');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Edit mode - show status update form
  if (enrollment) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-xl">Edit Enrollment</h3>
              <p className="text-sm text-base-content/60 mt-1">Update participant status</p>
            </div>
            <button 
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => onClose(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label className="label">
              <span className="label-text font-medium">Participant</span>
            </label>
            <div className="p-4 bg-base-200/50 rounded-lg">
              <div className="font-semibold">{enrollment.participant?.fullName}</div>
              <div className="text-sm text-base-content/60">{enrollment.participant?.email}</div>
            </div>
          </div>

          <form onSubmit={handleUpdateStatus}>
            <div className="form-control w-full mb-6">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                name="status"
                className="select select-bordered w-full"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="DROPPED">Dropped</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onClose(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={() => onClose(false)}></div>
      </div>
    );
  }

  // Create mode - show search and add interface
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-xl">Enroll Participant</h3>
            <p className="text-sm text-base-content/60 mt-1">Search and add participants to this workshop</p>
          </div>
          <button 
            className="btn btn-circle btn-ghost btn-sm"
            onClick={() => onClose(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="form-control mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Info badge */}
        <div className="flex items-center gap-2 mb-4 text-sm text-base-content/60">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Participants will be enrolled with <span className="badge badge-success badge-sm">ACTIVE</span> status</span>
        </div>

        {/* User List */}
        <div className="max-h-80 overflow-y-auto border border-base-200 rounded-lg">
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-base-content/50">
                {searchQuery ? 'No participants found matching your search' : 'No available participants to enroll'}
              </p>
              <p className="text-xs text-base-content/40 mt-2">
                Users must have the PARTICIPANT role to be enrolled
              </p>
            </div>
          ) : (
            <div className="divide-y divide-base-200">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors"
                >
                  <div>
                    <div className="font-medium">{user.fullName}</div>
                    <div className="text-xs text-base-content/60">{user.email}</div>
                  </div>
                  <button 
                    className="btn btn-sm btn-primary gap-1"
                    onClick={() => handleEnrollParticipant(user.id)}
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={() => onClose(false)}></div>
    </div>
  );
};

export default EnrollmentModal;

