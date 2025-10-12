import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function Lectures() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    course_id: "",
    lecturer_id: "",
    class_name: "",
    venue: "TBD",
    scheduled_time: "TBD",
    total_registered: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [filterStream, setFilterStream] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "";

  // Get headers with role
  const getHeaders = useCallback(() => {
    return {
      "x-user-role": userRole,
      "Content-Type": "application/json"
    };
  }, [userRole]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📚 Fetching courses, lecturers, and assignments...");
      
      // Fetch courses, lecturers, and class-courses assignments
      const [coursesRes, lecturersRes, classCoursesRes] = await Promise.all([
        axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/lecturers", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/class-courses", { headers: getHeaders() })
      ]);
      
      console.log(`✅ Found ${coursesRes.data.length} courses`);
      console.log(`✅ Found ${lecturersRes.data.length} lecturers`);
      console.log(`✅ Found ${classCoursesRes.data.length} assignments`);
      
      setCourses(coursesRes.data);
      setLecturers(lecturersRes.data);
      setAssignments(classCoursesRes.data);
      
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate class name when course is selected
    if (name === 'course_id' && value) {
      const selectedCourse = courses.find(c => c.id == value);
      if (selectedCourse) {
        setFormData(prev => ({
          ...prev,
          course_id: value,
          class_name: `${selectedCourse.course_code} - ${selectedCourse.course_name} Class`
        }));
      }
    }
  };

  // Assign lecturer to course
  const assignLecture = async () => {
    if (!formData.course_id || !formData.lecturer_id) {
      alert("Please select both course and lecturer");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🎓 Assigning lecture:", formData);

      const assignmentPayload = {
        course_id: parseInt(formData.course_id),
        lecturer_id: parseInt(formData.lecturer_id),
        class_name: formData.class_name,
        venue: formData.venue,
        scheduled_time: formData.scheduled_time,
        total_registered: parseInt(formData.total_registered) || 0,
        course_name: courses.find(c => c.id == formData.course_id)?.course_name,
        lecturer_name: lecturers.find(l => l.id == formData.lecturer_id)?.name
      };

      console.log("📤 Sending assignment payload:", assignmentPayload);

      const response = await axios.post("https://luct-reporting-cfvn.onrender.com/api/class-courses", 
        assignmentPayload, 
        { headers: getHeaders() }
      );

      console.log("✅ Assignment response:", response.data);

      // Update assignments list
      setAssignments(prev => [...prev, response.data]);
      
      // Reset form
      setFormData({
        course_id: "",
        lecturer_id: "",
        class_name: "",
        venue: "TBD",
        scheduled_time: "TBD",
        total_registered: 0
      });
      
      setShowAssignmentForm(false);
      
      alert("✅ Lecture assigned successfully!");
      
    } catch (err) {
      console.error("❌ Error assigning lecture:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Error assigning lecture";
      alert(`Failed to assign lecture: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (assignmentId) => {
    setShowDeleteConfirm(assignmentId);
  };

  // Hide delete confirmation
  const hideDeleteConfirmation = () => {
    setShowDeleteConfirm(null);
  };

  // Remove assignment
  const removeAssignment = async (assignmentId) => {
    hideDeleteConfirmation();

    try {
      await axios.delete(`https://luct-reporting-cfvn.onrender.com/api/class-courses/${assignmentId}`, {
        headers: getHeaders()
      });

      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
      alert("✅ Assignment removed successfully!");
    } catch (err) {
      console.error("❌ Error removing assignment:", err);
      alert("Failed to remove assignment. Please try again.");
    }
  };

  // Get unique streams for filter
  const uniqueStreams = useMemo(() => {
    const streams = [...new Set(courses.map(course => course.stream).filter(Boolean))];
    return streams.sort();
  }, [courses]);

  // Filter courses by stream
  const filteredCourses = useMemo(() => {
    if (!filterStream) return courses;
    return courses.filter(course => course.stream === filterStream);
  }, [courses, filterStream]);

  // Get courses that are not yet assigned
  const availableCourses = useMemo(() => {
    const assignedCourseIds = new Set(assignments.map(a => a.course_id));
    return filteredCourses.filter(course => !assignedCourseIds.has(course.id));
  }, [filteredCourses, assignments]);

  // Get assignments with full course and lecturer details
  const assignmentsWithDetails = useMemo(() => {
    return assignments.map(assignment => {
      const course = courses.find(c => c.id === assignment.course_id);
      const lecturer = lecturers.find(l => l.id === assignment.lecturer_id);
      return {
        ...assignment,
        course_name: course?.course_name || assignment.course_name || 'Unknown Course',
        course_code: course?.course_code || 'N/A',
        stream: course?.stream || 'N/A',
        lecturer_name: lecturer?.name || assignment.lecturer_name || 'Unknown Lecturer',
        lecturer_email: lecturer?.email || 'N/A'
      };
    });
  }, [assignments, courses, lecturers]);

  // Statistics
  const statistics = useMemo(() => {
    return {
      totalCourses: courses.length,
      totalLecturers: lecturers.length,
      assignedCourses: assignments.length,
      availableCourses: availableCourses.length,
      uniqueStreams: uniqueStreams.length
    };
  }, [courses, lecturers, assignments, availableCourses, uniqueStreams]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  const clearFilters = () => {
    setFilterStream("");
  };

  // Reset form when showing/hiding
  useEffect(() => {
    if (!showAssignmentForm) {
      setFormData({
        course_id: "",
        lecturer_id: "",
        class_name: "",
        venue: "TBD",
        scheduled_time: "TBD",
        total_registered: 0
      });
    }
  }, [showAssignmentForm]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading courses and lecturers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
        <button onClick={handleRetry} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="lectures-container">
      <div className="section-header">
        <div className="header-content">
          <h2>🎓 Lecture Assignments</h2>
          <p className="section-subtitle">Assign lecturers to courses and manage teaching assignments</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowAssignmentForm(!showAssignmentForm)}
            className={`add-button ${showAssignmentForm ? 'active' : ''}`}
          >
            {showAssignmentForm ? (
              <>
                <span className="icon">✕</span>
                Cancel
              </>
            ) : (
              <>
                <span className="icon">+</span>
                Assign Lecture
              </>
            )}
          </button>
          <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{statistics.totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{statistics.totalLecturers}</h3>
            <p>Lecturers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{statistics.assignedCourses}</h3>
            <p>Assigned</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{statistics.availableCourses}</h3>
            <p>Available</p>
          </div>
        </div>
      </div>

      {/* Assignment Form */}
      {showAssignmentForm && (
        <div className="assignment-form-card">
          <div className="card-header">
            <div className="header-icon">🎓</div>
            <div className="header-content">
              <h3>Assign Lecturer to Course</h3>
              <p>Create a new teaching assignment</p>
            </div>
          </div>

          <div className="card-body">
            <div className="form-grid">
              {/* Stream Filter */}
              <div className="form-group full-width">
                <label className="form-label">Filter Courses by Stream:</label>
                <select 
                  value={filterStream} 
                  onChange={(e) => setFilterStream(e.target.value)}
                  className="form-input"
                >
                  <option value="">All Streams</option>
                  {uniqueStreams.map(stream => (
                    <option key={stream} value={stream}>{stream}</option>
                  ))}
                </select>
              </div>

              {/* Course Selection */}
              <div className="form-group">
                <label className="form-label">
                  Select Course <span className="required">*</span>
                </label>
                <div className="input-container">
                  <select 
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Choose a course</option>
                    {availableCourses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.course_code} - {course.course_name} ({course.stream})
                      </option>
                    ))}
                  </select>
                  <div className="input-icon">📚</div>
                </div>
                {availableCourses.length === 0 ? (
                  <div className="info-message">
                    {filterStream 
                      ? `No available courses in ${filterStream}. All courses are already assigned.` 
                      : 'No available courses. All courses are already assigned to lecturers.'}
                  </div>
                ) : (
                  <div className="success-message">
                    {availableCourses.length} course(s) available for assignment
                  </div>
                )}
              </div>

              {/* Lecturer Selection */}
              <div className="form-group">
                <label className="form-label">
                  Select Lecturer <span className="required">*</span>
                </label>
                <div className="input-container">
                  <select 
                    name="lecturer_id"
                    value={formData.lecturer_id}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Choose a lecturer</option>
                    {lecturers.map(lecturer => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} ({lecturer.email})
                      </option>
                    ))}
                  </select>
                  <div className="input-icon">👨‍🏫</div>
                </div>
                {lecturers.length === 0 && (
                  <div className="warning-message">No lecturers available in the system</div>
                )}
              </div>

              {/* Class Name */}
              <div className="form-group">
                <label className="form-label">
                  Class Name <span className="required">*</span>
                </label>
                <div className="input-container">
                  <input
                    type="text"
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleInputChange}
                    placeholder="e.g., CS401 - Web Development Class"
                    className="form-input"
                    required
                  />
                  <div className="input-icon">🏫</div>
                </div>
              </div>

              {/* Venue */}
              <div className="form-group">
                <label className="form-label">Venue</label>
                <div className="input-container">
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                    placeholder="e.g., Room 101, Building A"
                    className="form-input"
                  />
                  <div className="input-icon">📍</div>
                </div>
              </div>

              {/* Scheduled Time */}
              <div className="form-group">
                <label className="form-label">Scheduled Time</label>
                <div className="input-container">
                  <input
                    type="text"
                    name="scheduled_time"
                    value={formData.scheduled_time}
                    onChange={handleInputChange}
                    placeholder="e.g., Mon 10:00-12:00, Wed 14:00-16:00"
                    className="form-input"
                  />
                  <div className="input-icon">⏰</div>
                </div>
              </div>

              {/* Total Registered */}
              <div className="form-group">
                <label className="form-label">Total Registered Students</label>
                <div className="input-container">
                  <input
                    type="number"
                    name="total_registered"
                    value={formData.total_registered}
                    onChange={handleInputChange}
                    min="0"
                    className="form-input"
                  />
                  <div className="input-icon">👥</div>
                </div>
              </div>
            </div>

            {/* Selected Course & Lecturer Preview */}
            {(formData.course_id || formData.lecturer_id) && (
              <div className="selection-preview">
                <h4>Assignment Preview:</h4>
                <div className="preview-content">
                  {formData.course_id && (
                    <div className="preview-item">
                      <strong>Course:</strong> 
                      {courses.find(c => c.id == formData.course_id)?.course_name}
                    </div>
                  )}
                  {formData.lecturer_id && (
                    <div className="preview-item">
                      <strong>Lecturer:</strong> 
                      {lecturers.find(l => l.id == formData.lecturer_id)?.name}
                    </div>
                  )}
                  {formData.class_name && (
                    <div className="preview-item">
                      <strong>Class:</strong> {formData.class_name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              <button 
                onClick={() => setShowAssignmentForm(false)}
                className="cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={assignLecture}
                disabled={!formData.course_id || !formData.lecturer_id || !formData.class_name || isSubmitting}
                className="submit-button"
              >
                {isSubmitting ? (
                  <>
                    <div className="button-spinner"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <span className="button-icon">✅</span>
                    Assign Lecture
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Tips */}
          <div className="card-footer">
            <div className="tips">
              <div className="tip-item">
                <span className="tip-icon">💡</span>
                <span>Class name is auto-generated when you select a course</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⚡</span>
                <span>Only courses without existing assignments are shown</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="stream-filter">Filter by Stream:</label>
          <select 
            id="stream-filter"
            value={filterStream} 
            onChange={(e) => setFilterStream(e.target.value)}
            className="filter-select"
          >
            <option value="">All Streams</option>
            {uniqueStreams.map(stream => (
              <option key={stream} value={stream}>{stream}</option>
            ))}
          </select>
          {filterStream && (
            <button onClick={clearFilters} className="clear-filter">
              Clear Filter
            </button>
          )}
        </div>
        <div className="results-info">
          Showing {assignmentsWithDetails.length} assignments
          {filterStream && ` in ${filterStream}`}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="assignments-table-container">
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Lecturer</th>
              <th>Stream</th>
              <th>Class Name</th>
              <th>Venue & Time</th>
              <th>Students</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignmentsWithDetails.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data-cell">
                  <div className="no-data-message">
                    <div className="no-data-icon">🎓</div>
                    <p>No lecture assignments found</p>
                    <p className="info-note">
                      {filterStream 
                        ? `No assignments in ${filterStream}. Try changing the filter or create new assignments.` 
                        : 'Get started by assigning lecturers to courses using the "Assign Lecture" button.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              assignmentsWithDetails.map((assignment) => (
                <AssignmentRow 
                  key={assignment.id}
                  assignment={assignment}
                  onRemove={() => showDeleteConfirmation(assignment.id)}
                  showDeleteConfirm={showDeleteConfirm === assignment.id}
                  onCancelDelete={hideDeleteConfirmation}
                  onConfirmDelete={() => removeAssignment(assignment.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove this assignment? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={hideDeleteConfirmation} className="cancel-button">
                Cancel
              </button>
              <button onClick={() => removeAssignment(showDeleteConfirm)} className="delete-button">
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Assignment Row Component
const AssignmentRow = ({ 
  assignment, 
  onRemove, 
  showDeleteConfirm, 
  onCancelDelete, 
  onConfirmDelete 
}) => {
  return (
    <tr className="assignment-row">
      <td>
        <div className="course-info">
          <strong>{assignment.course_name}</strong>
          <div className="course-code">{assignment.course_code}</div>
        </div>
      </td>
      <td>
        <div className="lecturer-info">
          <strong>{assignment.lecturer_name}</strong>
          <div className="lecturer-email">{assignment.lecturer_email}</div>
        </div>
      </td>
      <td>
        <span className="stream-badge">{assignment.stream}</span>
      </td>
      <td>
        <div className="class-name">{assignment.class_name}</div>
      </td>
      <td>
        <div className="schedule-info">
          <div className="venue">{assignment.venue}</div>
          <div className="time">{assignment.scheduled_time}</div>
        </div>
      </td>
      <td>
        <div className="student-count">
          {assignment.total_registered} students
        </div>
      </td>
      <td>
        <div className="action-buttons">
          <button className="action-btn edit-btn" title="Edit Assignment">
            ✏️
          </button>
          <button 
            className="action-btn delete-btn" 
            title="Remove Assignment"
            onClick={onRemove}
          >
            🗑️
          </button>
        </div>
        
        {/* Inline Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="delete-confirmation">
            <p>Are you sure?</p>
            <div className="confirmation-actions">
              <button onClick={onCancelDelete} className="cancel-btn">
                Cancel
              </button>
              <button onClick={onConfirmDelete} className="confirm-delete-btn">
                Delete
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};

export default Lectures;
