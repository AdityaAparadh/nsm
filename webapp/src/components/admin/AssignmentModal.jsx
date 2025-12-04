import { useState, useEffect } from 'react';
import { assignmentsAPI } from '../../services/api';
import FileUpload from '../FileUpload';

const AssignmentModal = ({ workshopId, assignment, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maximumScore: '',
    passingScore: '',
    isCompulsory: true,
    evaluationType: 'LOCAL',
    s3EvalBinaryKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAssignmentId, setCreatedAssignmentId] = useState(null);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (assignment) {
      setFormData({
        name: assignment.name || '',
        description: assignment.description || '',
        maximumScore: assignment.maximumScore || '',
        passingScore: assignment.passingScore || '',
        isCompulsory: assignment.isCompulsory !== undefined ? assignment.isCompulsory : true,
        evaluationType: assignment.evaluationType || 'LOCAL',
        s3EvalBinaryKey: assignment.s3EvalBinaryKey || '',
      });
      setCreatedAssignmentId(assignment.id);
      setActiveStep(2); // Show grader upload step for editing
    }
  }, [assignment]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGraderUpload = async (s3Key) => {
    try {
      const assignmentIdToUpdate = createdAssignmentId || assignment?.id;
      if (assignmentIdToUpdate) {
        await assignmentsAPI.updateAssignment(workshopId, assignmentIdToUpdate, {
          s3EvalBinaryKey: s3Key,
        });
        setFormData(prev => ({ ...prev, s3EvalBinaryKey: s3Key }));
        onClose(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment with grader file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        maximumScore: parseInt(formData.maximumScore),
        passingScore: parseInt(formData.passingScore),
        isCompulsory: formData.isCompulsory,
        evaluationType: formData.evaluationType,
        s3EvalBinaryKey: 'pending',
      };

      let assignmentId = createdAssignmentId;

      if (assignment) {
        await assignmentsAPI.updateAssignment(workshopId, assignment.id, payload);
        assignmentId = assignment.id;
        onClose(true);
      } else {
        const response = await assignmentsAPI.createAssignment(workshopId, payload);
        assignmentId = response.data.id;
        setCreatedAssignmentId(assignmentId);
        setActiveStep(2); // Move to grader upload step
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assignment');
      setLoading(false);
    } finally {
      if (assignment) {
        setLoading(false);
      }
    }
  };

  const isStep1Valid = formData.name && formData.maximumScore && formData.passingScore;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xl text-primary-content">
                {assignment ? 'Edit Assignment' : 'Create New Assignment'}
              </h3>
              <p className="text-primary-content/70 text-sm mt-1">
                {assignment ? 'Update assignment details and grader' : 'Configure a new assignment for this workshop'}
              </p>
            </div>
            <button 
              className="btn btn-circle btn-ghost btn-sm text-primary-content"
              onClick={() => onClose(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        {!assignment && (
          <div className="px-6 py-4 bg-base-200/50 border-b border-base-200">
            <ul className="steps steps-horizontal w-full">
              <li className={`step ${activeStep >= 1 ? 'step-primary' : ''}`}>
                <span className="text-xs">Assignment Details</span>
              </li>
              <li className={`step ${activeStep >= 2 ? 'step-primary' : ''}`}>
                <span className="text-xs">Upload Grader</span>
              </li>
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {activeStep === 1 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold">Basic Information</h4>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Assignment Name</span>
                    <span className="label-text-alt text-error">Required</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="input input-bordered w-full focus:input-primary"
                    placeholder="e.g., Introduction to Python"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Description</span>
                    <span className="label-text-alt text-base-content/50">Optional</span>
                  </label>
                  <textarea
                    name="description"
                    className="textarea textarea-bordered w-full focus:textarea-primary min-h-[100px]"
                    placeholder="Describe what participants will learn or accomplish..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Scoring Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold">Scoring</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Maximum Score</span>
                    </label>
                    <input
                      type="number"
                      name="maximumScore"
                      className="input input-bordered focus:input-primary"
                      placeholder="100"
                      value={formData.maximumScore}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">Total points possible</span>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Passing Score</span>
                    </label>
                    <input
                      type="number"
                      name="passingScore"
                      className="input input-bordered focus:input-primary"
                      placeholder="60"
                      value={formData.passingScore}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">Minimum to pass</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold">Configuration</h4>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Evaluation Type</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${formData.evaluationType === 'LOCAL' ? 'border-primary bg-primary/5' : 'border-base-200 hover:border-base-300'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="evaluationType"
                          value="LOCAL"
                          className="radio radio-primary mt-1"
                          checked={formData.evaluationType === 'LOCAL'}
                          onChange={handleChange}
                        />
                        <div>
                          <div className="font-medium">Local</div>
                          <div className="text-xs text-base-content/60 mt-1">Evaluated on participant's machine</div>
                        </div>
                      </div>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${formData.evaluationType === 'REMOTE' ? 'border-secondary bg-secondary/5' : 'border-base-200 hover:border-base-300'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="evaluationType"
                          value="REMOTE"
                          className="radio radio-secondary mt-1"
                          checked={formData.evaluationType === 'REMOTE'}
                          onChange={handleChange}
                        />
                        <div>
                          <div className="font-medium">Remote</div>
                          <div className="text-xs text-base-content/60 mt-1">Evaluated on server</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-control">
                  <label className={`cursor-pointer flex items-center justify-between p-4 rounded-lg border-2 transition-all ${formData.isCompulsory ? 'border-error/30 bg-error/5' : 'border-base-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.isCompulsory ? 'bg-error/10' : 'bg-base-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${formData.isCompulsory ? 'text-error' : 'text-base-content/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Required Assignment</div>
                        <div className="text-xs text-base-content/60">Participants must pass this to complete the workshop</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      name="isCompulsory"
                      className="toggle toggle-error"
                      checked={formData.isCompulsory}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
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
                  className={`btn btn-primary gap-2 ${loading ? 'loading' : ''}`}
                  disabled={loading || !isStep1Valid}
                >
                  {loading ? (
                    'Saving...'
                  ) : assignment ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  ) : (
                    <>
                      Continue
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeStep === 2 && (
            <div className="space-y-6">
              {/* Success Message */}
              {!assignment && (
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-medium">Assignment created successfully!</div>
                    <div className="text-sm opacity-80">Now upload the grader binary to complete setup.</div>
                  </div>
                </div>
              )}

              {/* Grader Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-base-200">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold">Grader Binary</h4>
                    <p className="text-xs text-base-content/60">Upload the evaluation binary for this assignment</p>
                  </div>
                </div>

                <div className="bg-base-200/50 rounded-lg p-4">
                  <FileUpload
                    purpose="ASSIGNMENT_GRADER"
                    assignmentId={createdAssignmentId || assignment?.id}
                    currentKey={formData.s3EvalBinaryKey}
                    onUploadSuccess={handleGraderUpload}
                    label="Grader Binary File"
                  />
                </div>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <div className="font-medium text-info">About Grader Binaries</div>
                      <p className="text-base-content/70 mt-1">
                        The grader binary is an executable that evaluates participant submissions. 
                        It should accept the submission as input and output a score.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-base-200">
                {!assignment && (
                  <button
                    type="button"
                    className="btn btn-ghost gap-2"
                    onClick={() => setActiveStep(1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost ml-auto"
                  onClick={() => onClose(true)}
                >
                  {formData.s3EvalBinaryKey && formData.s3EvalBinaryKey !== 'pending' ? 'Done' : 'Skip for now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={() => onClose(false)}></div>
    </div>
  );
};

export default AssignmentModal;

