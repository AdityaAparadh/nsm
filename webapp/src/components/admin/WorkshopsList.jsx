import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workshopsAPI } from '../../services/api';
import WorkshopModal from './WorkshopModal';

const WorkshopsList = () => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      // Ensure limit doesn't exceed 100
      const limit = Math.min(pagination.limit, 100);

      const response = await workshopsAPI.listWorkshops({
        page: pagination.page,
        limit: limit,
      });
      setWorkshops(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch workshops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
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

  const handleCreate = () => {
    setSelectedWorkshop(null);
    setIsModalOpen(true);
  };

  const handleView = (workshopId) => {
    navigate(`/admin/workshop/${workshopId}`);
  };

  const handleEdit = (workshop, e) => {
    e.stopPropagation();
    setSelectedWorkshop(workshop);
    setIsModalOpen(true);
  };

  const handleDelete = async (workshopId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workshop?')) return;
    
    try {
      await workshopsAPI.deleteWorkshop(workshopId);
      fetchWorkshops();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete workshop');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    setSelectedWorkshop(null);
    if (shouldRefresh) {
      fetchWorkshops();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-warning',
      ACTIVE: 'badge-success',
      ARCHIVED: 'badge-neutral',
    };
    return badges[status] || 'badge-ghost';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && workshops.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Workshops</h2>
          <p className="text-sm text-base-content/60 mt-1">
            {pagination.total} total workshop{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          Create Workshop
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
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Assignments</th>
              <th>Instructors</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workshops.map((workshop) => (
              <tr 
                key={workshop.id} 
                className="hover cursor-pointer"
                onClick={() => handleView(workshop.id)}
              >
                <td>{workshop.id}</td>
                <td>
                  <div className="font-bold">{workshop.name}</div>
                </td>
                <td>
                  <span className={`badge badge-sm ${getStatusBadge(workshop.status)}`}>
                    {workshop.status}
                  </span>
                </td>
                <td>{formatDate(workshop.startDate)}</td>
                <td>{formatDate(workshop.endDate)}</td>
                <td>{workshop.assignmentCount || 0}</td>
                <td>{workshop.instructorCount || 0}</td>
                <td>
                  <div className="dropdown dropdown-end dropdown-top">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                      <li><a onClick={(e) => { e.stopPropagation(); handleView(workshop.id); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </a></li>
                      <li><a onClick={(e) => handleEdit(workshop, e)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Workshop
                      </a></li>
                      <div className="divider my-1"></div>
                      <li><a onClick={(e) => { e.stopPropagation(); navigate(`/admin/workshop/${workshop.id}?tab=assignments`); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Manage Assignments
                      </a></li>
                      <li><a onClick={(e) => { e.stopPropagation(); navigate(`/admin/workshop/${workshop.id}?tab=instructors`); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Manage Instructors
                      </a></li>
                      <li><a onClick={(e) => { e.stopPropagation(); navigate(`/admin/workshop/${workshop.id}?tab=enrollments`); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Manage Enrollments
                      </a></li>
                      <div className="divider my-1"></div>
                      <li><a className="text-error" onClick={(e) => handleDelete(workshop.id, e)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Workshop
                      </a></li>
                    </ul>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {workshops.length === 0 && !loading && (
        <div className="text-center py-12 bg-base-200/50 rounded-lg">
          <p className="text-lg font-medium opacity-60">No workshops found</p>
          <button className="btn btn-link btn-sm mt-2" onClick={handleCreate}>Create First Workshop</button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="opacity-60">
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
              Page {pagination.page}
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

      {/* Workshop Modal */}
      {isModalOpen && (
        <WorkshopModal
          workshop={selectedWorkshop}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default WorkshopsList;
