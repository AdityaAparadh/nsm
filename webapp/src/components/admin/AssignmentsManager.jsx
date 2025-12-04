import { useState } from 'react';
import { assignmentsAPI } from '../../services/api';
import AssignmentModal from './AssignmentModal';

const AssignmentsManager = ({ workshopId, assignments, onUpdate }) => {
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleCreate = () => {
    setSelectedAssignment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (assignment) => {
    setSelectedAssignment(assignment);
    setIsModalOpen(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await assignmentsAPI.deleteAssignment(workshopId, assignmentId);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    setSelectedAssignment(null);
    if (shouldRefresh) {
      onUpdate();
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-base-content">Assignments</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Manage workshop assignments and grading criteria
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={handleCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Assignment
        </button>
      </div>

      {/* Stats Summary */}
      {assignments.length > 0 && (
        <div className="stats stats-horizontal bg-base-200/50 w-full">
          <div className="stat">
            <div className="stat-title">Total</div>
            <div className="stat-value text-2xl">{assignments.length}</div>
            <div className="stat-desc">assignments</div>
          </div>
          <div className="stat">
            <div className="stat-title">Required</div>
            <div className="stat-value text-2xl text-error">{assignments.filter(a => a.isCompulsory).length}</div>
            <div className="stat-desc">compulsory</div>
          </div>
          <div className="stat">
            <div className="stat-title">Max Points</div>
            <div className="stat-value text-2xl text-primary">{assignments.reduce((sum, a) => sum + (a.maximumScore || 0), 0)}</div>
            <div className="stat-desc">total possible</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignments.length === 0 ? (
        <div className="card bg-base-200/30 border-2 border-dashed border-base-300">
          <div className="card-body items-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-base-content/70">No assignments yet</h4>
            <p className="text-base-content/50 max-w-md">
              Create your first assignment to start building your workshop curriculum.
            </p>
            <button className="btn btn-primary btn-sm mt-4 gap-2" onClick={handleCreate}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create First Assignment
            </button>
          </div>
        </div>
      ) : (
        /* Assignment List */
        <div className="space-y-4">
          {assignments
            .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
            .map((assignment, index) => {
              const isExpanded = expandedId === assignment.id;
              const hasGrader = assignment.s3EvalBinaryKey || assignment.graderImage;
              
              return (
                <div 
                  key={assignment.id} 
                  className={`card bg-base-100 shadow-md border border-base-200 transition-all duration-200 hover:shadow-lg ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
                >
                  <div className="card-body p-0">
                    {/* Main Row - Clickable */}
                    <div 
                      className="flex items-center gap-4 p-5 cursor-pointer"
                      onClick={() => toggleExpand(assignment.id)}
                    >
                      {/* Order Number */}
                      <div className="flex-none">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${isExpanded ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'}`}>
                          {assignment.assignmentOrder || index + 1}
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg truncate">{assignment.name}</h4>
                          {assignment.isCompulsory && (
                            <span className="badge badge-error badge-sm">Required</span>
                          )}
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-base-content/60 line-clamp-1">{assignment.description}</p>
                        )}
                      </div>

                      {/* Score Info */}
                      <div className="flex-none hidden sm:flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-base-content/50 uppercase tracking-wide">Score</div>
                          <div className="font-semibold">
                            <span className="text-success">{assignment.passingScore}</span>
                            <span className="text-base-content/40"> / </span>
                            <span>{assignment.maximumScore}</span>
                          </div>
                        </div>
                        
                        {/* Status Indicators */}
                        <div className="flex gap-1">
                          <div className={`tooltip ${assignment.evaluationType === 'LOCAL' ? 'tooltip-primary' : 'tooltip-secondary'}`} data-tip={`${assignment.evaluationType} Evaluation`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${assignment.evaluationType === 'LOCAL' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                              {assignment.evaluationType === 'LOCAL' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {hasGrader && (
                            <div className="tooltip tooltip-warning" data-tip="Grader Configured">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-warning/10 text-warning">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="flex-none">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 text-base-content/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-base-200 bg-base-50">
                        <div className="p-5 space-y-4">
                          {/* Description */}
                          {assignment.description && (
                            <div>
                              <h5 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Description</h5>
                              <p className="text-sm text-base-content/80">{assignment.description}</p>
                            </div>
                          )}

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-base-200/50 rounded-lg p-3">
                              <div className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Maximum Score</div>
                              <div className="font-bold text-lg">{assignment.maximumScore}</div>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                              <div className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Passing Score</div>
                              <div className="font-bold text-lg text-success">{assignment.passingScore}</div>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                              <div className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Evaluation</div>
                              <div className={`badge ${assignment.evaluationType === 'LOCAL' ? 'badge-primary' : 'badge-secondary'}`}>
                                {assignment.evaluationType}
                              </div>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                              <div className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Status</div>
                              <div className={`badge ${assignment.isCompulsory ? 'badge-error' : 'badge-ghost'}`}>
                                {assignment.isCompulsory ? 'Required' : 'Optional'}
                              </div>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div className="bg-base-200/30 rounded-lg p-4">
                            <h5 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Technical Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-base-content/60">Assignment ID</span>
                                <code className="bg-base-300 px-2 py-1 rounded text-xs">{assignment.id}</code>
                              </div>
                              {assignment.notebookPath && (
                                <div className="flex items-center justify-between">
                                  <span className="text-base-content/60">Notebook</span>
                                  <code className="bg-base-300 px-2 py-1 rounded text-xs truncate max-w-[200px]">{assignment.notebookPath}</code>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-base-content/60">Grader Binary</span>
                                {assignment.s3EvalBinaryKey ? (
                                  <span className="badge badge-success badge-sm gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Uploaded
                                  </span>
                                ) : (
                                  <span className="badge badge-ghost badge-sm">Not configured</span>
                                )}
                              </div>
                              {assignment.graderImage && (
                                <div className="flex items-center justify-between">
                                  <span className="text-base-content/60">Grader Image</span>
                                  <code className="bg-base-300 px-2 py-1 rounded text-xs truncate max-w-[200px]">{assignment.graderImage}</code>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 pt-2">
                            <button 
                              className="btn btn-ghost btn-sm gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(assignment);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm text-error gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(assignment.id);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {isModalOpen && (
        <AssignmentModal
          workshopId={workshopId}
          assignment={selectedAssignment}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default AssignmentsManager;
