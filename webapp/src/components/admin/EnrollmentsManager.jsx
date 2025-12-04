import { useState, useEffect } from 'react';
import { enrollmentsAPI, submissionsAPI } from '../../services/api';
import EnrollmentModal from './EnrollmentModal';

const EnrollmentsManager = ({ workshopId, assignments }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchData();
  }, [workshopId, pagination.page, pagination.limit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch enrollments for this workshop with pagination
      // Ensure limit doesn't exceed 100
      const limit = Math.min(pagination.limit, 100);

      const enrollResponse = await enrollmentsAPI.listEnrollments({
        workshopId: parseInt(workshopId),
        page: pagination.page,
        limit: limit,
      });
      const enrollmentsData = enrollResponse.data.data;
      setEnrollments(enrollmentsData);
      setPagination(prev => ({
        ...prev,
        total: enrollResponse.data.pagination.total,
        totalPages: enrollResponse.data.pagination.totalPages,
      }));

      // Fetch submissions for displayed enrollments only
      // Get all submissions for the current page of enrollments by fetching participant submissions
      const participantIds = enrollmentsData.map(e => e.participantId);
      if (participantIds.length > 0) {
        const submissionsResponse = await submissionsAPI.listSubmissions({
          workshopId: parseInt(workshopId),
          limit: 100, // Max allowed by API
        });
        setSubmissions(submissionsResponse.data.data || []);
      } else {
        setSubmissions([]);
      }

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

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
    setSelectedEnrollment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsModalOpen(true);
  };

  const handleDelete = async (enrollmentId) => {
    if (!confirm('Are you sure you want to delete this enrollment?')) return;

    try {
      await enrollmentsAPI.deleteEnrollment(enrollmentId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete enrollment');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    setSelectedEnrollment(null);
    if (shouldRefresh) {
      fetchData();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      ACTIVE: 'badge-success',
      DROPPED: 'badge-error',
      COMPLETED: 'badge-info',
    };
    return badges[status] || 'badge-ghost';
  };

  // Get participant's submissions grouped by assignment
  const getParticipantSubmissions = (participantId) => {
    const participantSubs = submissions.filter(
      sub => sub.participantId === participantId
    );

    const byAssignment = {};
    participantSubs.forEach(sub => {
      if (!byAssignment[sub.assignmentId] || sub.score > byAssignment[sub.assignmentId].score) {
        byAssignment[sub.assignmentId] = sub;
      }
    });

    return byAssignment;
  };

  // Calculate statistics for a participant
  const getParticipantStats = (participantId) => {
    const subs = getParticipantSubmissions(participantId);
    
    let totalScore = 0;
    let maxScore = 0;
    let passedCompulsory = 0;
    let totalCompulsory = 0;

    assignments.forEach(assignment => {
      maxScore += assignment.maximumScore;
      if (assignment.isCompulsory) totalCompulsory++;

      const sub = subs[assignment.id];
      if (sub) {
        totalScore += sub.score;
        if (assignment.isCompulsory && sub.score >= assignment.passingScore) {
          passedCompulsory++;
        }
      }
    });

    const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0;
    const compulsoryProgress = totalCompulsory > 0 
      ? `${passedCompulsory}/${totalCompulsory}` 
      : 'N/A';

    return { totalScore, maxScore, percentage, compulsoryProgress, passedCompulsory, totalCompulsory };
  };

  if (loading && enrollments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold">Enrollments & Scores</h3>
          <p className="text-sm text-base-content/60 mt-1">
            {pagination.total} total participant{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleCreate}>
          Add Enrollment
        </button>
      </div>

      {error && (
        <div className="alert alert-error rounded-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {enrollments.length === 0 ? (
        <div className="text-center py-12 bg-base-200/50 rounded-lg">
          <p className="text-lg font-medium opacity-60">No enrollments yet</p>
          <button className="btn btn-link btn-sm mt-2" onClick={handleCreate}>Add First Participant</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-base-100 rounded-lg shadow-sm border border-base-200">
            <table className="table">
              <thead>
                <tr className="bg-base-200/50">
                  <th>Participant</th>
                  <th>Status</th>
                  <th>Overall Score</th>
                  <th>Compulsory</th>
                  <th>Assignment Scores</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => {
                  const stats = getParticipantStats(enrollment.participantId);
                  const subs = getParticipantSubmissions(enrollment.participantId);
                  
                  return (
                    <tr key={enrollment.id} className="hover">
                      <td>
                        <div>
                          <div className="font-bold">
                            {enrollment.participant?.fullName || 'Unknown'}
                          </div>
                          <div className="text-xs opacity-60">
                            {enrollment.participant?.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${getStatusBadge(enrollment.status)}`}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div 
                            className="radial-progress text-primary text-[10px]" 
                            style={{ 
                              "--value": stats.percentage, 
                              "--size": "2.5rem",
                              "--thickness": "3px"
                            }}
                            role="progressbar"
                          >
                            {Math.round(stats.percentage)}%
                          </div>
                          <div>
                            <div className="font-bold">{stats.totalScore}</div>
                            <div className="text-xs opacity-60">
                              / {stats.maxScore}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${stats.passedCompulsory === stats.totalCompulsory && stats.totalCompulsory > 0 ? 'badge-success' : 'badge-warning'}`}>
                          {stats.compulsoryProgress}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {assignments.map(assignment => {
                            const sub = subs[assignment.id];
                            const isPassed = sub && sub.score >= assignment.passingScore;
                            
                            return (
                              <div
                                key={assignment.id}
                                className="tooltip"
                                data-tip={`[ID: ${assignment.id}] ${assignment.name}: ${sub ? sub.score : 0}/${assignment.maximumScore}`}
                              >
                                <div className={`badge badge-xs ${
                                  sub 
                                    ? isPassed 
                                      ? 'badge-success' 
                                      : 'badge-error'
                                    : 'badge-neutral'
                                } w-6 h-6 flex items-center justify-center p-0`}>
                                  {assignment.assignmentOrder}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="dropdown dropdown-end dropdown-top">
                          <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                          </div>
                          <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                            <li><a onClick={() => handleEdit(enrollment)}>Edit Status</a></li>
                            <li><a className="text-error" onClick={() => handleDelete(enrollment.id)}>Delete</a></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
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
            
            {pagination.totalPages > 1 && (
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
            )}
          </div>
        </>
      )}

      {isModalOpen && (
        <EnrollmentModal
          workshopId={workshopId}
          enrollment={selectedEnrollment}
          existingParticipantIds={enrollments.map(e => e.participantId)}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default EnrollmentsManager;
