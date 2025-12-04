import { useState, useEffect } from 'react';
import { instructorsAPI, usersAPI } from '../../services/api';

const InstructorsManager = ({ workshopId, instructors, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAvailableUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all users with INSTRUCTOR role
      const response = await usersAPI.listUsers({ role: 'INSTRUCTOR', limit: 100 });
      const allInstructors = response.data?.data || response.data?.users || response.data || [];
      
      // Filter out already assigned instructors
      const currentInstructorIds = new Set(instructors.map(i => i.id));
      const available = Array.isArray(allInstructors) 
        ? allInstructors.filter(u => !currentInstructorIds.has(u.id))
        : [];
      setAvailableUsers(available);
    } catch (err) {
      console.error('Failed to fetch instructors:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSearchQuery('');
    setError('');
    fetchAvailableUsers();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchQuery('');
    setError('');
  };

  const handleAddInstructor = async (instructorId) => {
    setLoading(true);
    setError('');
    try {
      await instructorsAPI.addWorkshopInstructor(workshopId, { instructorId: parseInt(instructorId) });
      onUpdate();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add instructor');
      setLoading(false);
    }
  };

  const handleRemoveInstructor = async (instructorId) => {
    if (!confirm('Are you sure you want to remove this instructor from the workshop?')) return;

    try {
      await instructorsAPI.removeWorkshopInstructor(workshopId, instructorId);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove instructor');
    }
  };

  const filteredUsers = availableUsers.filter(user => 
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-base-content">Instructors</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Manage workshop instructors and their access
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={handleOpenModal}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
          Add Instructor
        </button>
      </div>

      {/* Empty State */}
      {instructors.length === 0 ? (
        <div className="card bg-base-200/30 border-2 border-dashed border-base-300">
          <div className="card-body items-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-base-content/70">No instructors assigned</h4>
            <p className="text-base-content/50 max-w-md">
              Add instructors to help manage this workshop and guide participants.
            </p>
            <button className="btn btn-primary btn-sm mt-4 gap-2" onClick={handleOpenModal}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              Add First Instructor
            </button>
          </div>
        </div>
      ) : (
        /* Instructors List */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <div 
              key={instructor.id} 
              className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow"
            >
              <div className="card-body p-5">
                <div>
                  <h4 className="font-semibold text-base-content">{instructor.fullName}</h4>
                  <p className="text-sm text-base-content/60">{instructor.email}</p>
                </div>

                {/* Actions */}
                <div className="card-actions justify-end mt-4 pt-3 border-t border-base-200">
                  <button 
                    className="btn btn-ghost btn-sm text-error gap-1"
                    onClick={() => handleRemoveInstructor(instructor.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Instructor Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-xl">Add Instructor</h3>
                <p className="text-sm text-base-content/60 mt-1">Select an instructor to add to this workshop</p>
              </div>
              <button 
                className="btn btn-circle btn-ghost btn-sm"
                onClick={handleCloseModal}
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
              <div className="input-group">
                <span className="bg-base-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* User List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-base-content/50">
                    {searchQuery ? 'No instructors found matching your search' : 'No available instructors to add'}
                  </p>
                  <p className="text-xs text-base-content/40 mt-2">
                    Users must have the INSTRUCTOR role to be added here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-base-content/60">{user.email}</div>
                      </div>
                      <button 
                        className="btn btn-sm btn-primary gap-1"
                        onClick={() => handleAddInstructor(user.id)}
                        disabled={loading}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={handleCloseModal}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={handleCloseModal}></div>
        </div>
      )}
    </div>
  );
};

export default InstructorsManager;
