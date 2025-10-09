import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

function Courses() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    course_name: "",
    course_code: "",
    stream: "",
    lecturer_id: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStream, setFilterStream] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "";

  // Get headers with role
  const getHeaders = () => {
    return {
      "x-user-role": userRole,
      "Content-Type": "application/json"
    };
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [coursesRes, lecturersRes] = await Promise.all([
          axios.get("http://localhost:5000/api/courses", { headers: getHeaders() }),
          axios.get("http://localhost:5000/api/lecturers", { headers: getHeaders() })
        ]);
        
        setCourses(coursesRes.data);
        setLecturers(lecturersRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.course_name.trim()) {
      errors.course_name = "Course name is required";
    } else if (formData.course_name.trim().length < 3) {
      errors.course_name = "Course name must be at least 3 characters";
    }
    
    if (!formData.course_code.trim()) {
      errors.course_code = "Course code is required";
    } else if (!/^[A-Za-z0-9]+$/.test(formData.course_code)) {
      errors.course_code = "Course code can only contain letters and numbers";
    }
    
    if (!formData.stream.trim()) {
      errors.stream = "Stream is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCourse = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post("http://localhost:5000/api/courses", formData, {
        headers: getHeaders()
      });
      
      setCourses([...courses, response.data]);
      setFormData({ course_name: "", course_code: "", stream: "", lecturer_id: "" });
      setShowAddForm(false);
      setFormErrors({});
      
      // Show success message
      alert("🎉 Course added successfully!");
    } catch (err) {
      console.error("Error adding course:", err);
      const errorMessage = err.response?.data?.error || "Error adding course";
      alert(`❌ Failed to add course: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ course_name: "", course_code: "", stream: "", lecturer_id: "" });
    setFormErrors({});
    setShowAddForm(false);
  };

  // Get unique streams for filter
  const uniqueStreams = useMemo(() => {
    const streams = [...new Set(courses.map(course => course.stream).filter(Boolean))];
    return streams.sort();
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    if (!filterStream) return courses;
    return courses.filter(course => course.stream === filterStream);
  }, [courses, filterStream]);

  // Statistics
  const statistics = useMemo(() => {
    return {
      totalCourses: filteredCourses.length,
      coursesWithLecturers: filteredCourses.filter(course => course.lecturer_id).length,
      uniqueStreams: uniqueStreams.length
    };
  }, [filteredCourses, uniqueStreams]);

  // Role-based permissions
  const canAddCourses = userRole === 'pl' || userRole === 'admin';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="courses-container">
      <div className="section-header">
        <div className="header-content">
          <h2 className="courses-title">📚 Courses Management</h2>
          <p className="section-subtitle">Manage and organize all academic courses</p>
        </div>
        {canAddCourses && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`add-button ${showAddForm ? 'active' : ''}`}
          >
            {showAddForm ? (
              <>
                <span className="icon">✕</span>
                Cancel
              </>
            ) : (
              <>
                <span className="icon">+</span>
                Add New Course
              </>
            )}
          </button>
        )}
      </div>

      {/* Professional Add Course Form */}
      {showAddForm && canAddCourses && (
        <div className="add-course-card">
          <div className="card-header">
            <div className="header-icon">🎓</div>
            <div className="header-content">
              <h3>Create New Course</h3>
              <p>Fill in the course details below</p>
            </div>
          </div>

          <div className="card-body">
            <div className="form-grid">
              {/* Course Name Field */}
              <div className="form-group">
                <label className="form-label">
                  Course Name <span className="required">*</span>
                </label>
                <div className="input-container">
                  <input 
                    type="text" 
                    placeholder="e.g., Advanced Web Development"
                    name="course_name" 
                    value={formData.course_name} 
                    onChange={handleChange}
                    className={`form-input ${formErrors.course_name ? 'error' : ''}`}
                  />
                  <div className="input-icon">📖</div>
                </div>
                {formErrors.course_name && (
                  <div className="error-message">{formErrors.course_name}</div>
                )}
              </div>

              {/* Course Code Field */}
              <div className="form-group">
                <label className="form-label">
                  Course Code <span className="required">*</span>
                </label>
                <div className="input-container">
                  <input 
                    type="text" 
                    placeholder="e.g., CS401"
                    name="course_code" 
                    value={formData.course_code} 
                    onChange={handleChange}
                    className={`form-input ${formErrors.course_code ? 'error' : ''}`}
                  />
                  <div className="input-icon">🔢</div>
                </div>
                {formErrors.course_code && (
                  <div className="error-message">{formErrors.course_code}</div>
                )}
              </div>

              {/* Stream Field */}
              <div className="form-group">
                <label className="form-label">
                  Stream <span className="required">*</span>
                </label>
                <div className="input-container">
                  <select 
                    name="stream" 
                    value={formData.stream} 
                    onChange={handleChange}
                    className={`form-input ${formErrors.stream ? 'error' : ''}`}
                  >
                    <option value="">Select a stream</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Cyber Security">Cyber Security</option>
                  </select>
                  <div className="input-icon">🌊</div>
                </div>
                {formErrors.stream && (
                  <div className="error-message">{formErrors.stream}</div>
                )}
              </div>

              {/* Lecturer Field */}
              <div className="form-group">
                <label className="form-label">Assign Lecturer</label>
                <div className="input-container">
                  <select 
                    name="lecturer_id" 
                    value={formData.lecturer_id} 
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Select a lecturer (optional)</option>
                    {lecturers.map(lecturer => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} {lecturer.email ? `(${lecturer.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="input-icon">👨‍🏫</div>
                </div>
                {lecturers.length === 0 && (
                  <div className="info-message">No lecturers available in the system</div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button 
                onClick={handleCancel}
                className="cancel-button"
                type="button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCourse}
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="button-spinner"></div>
                    Creating Course...
                  </>
                ) : (
                  <>
                    <span className="button-icon">✓</span>
                    Create Course
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
                <span>All fields marked with <span className="required">*</span> are required</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⚡</span>
                <span>Course code should be unique and descriptive</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Notice */}
      {!canAddCourses && (
        <div className="permission-notice">
          <div className="notice-icon">👀</div>
          <div className="notice-content">
            <h4>View Only Mode</h4>
            <p>You don't have permission to add or modify courses. Please contact an administrator.</p>
          </div>
        </div>
      )}

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
            <h3>{statistics.coursesWithLecturers}</h3>
            <p>With Lecturers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌊</div>
          <div className="stat-content">
            <h3>{statistics.uniqueStreams}</h3>
            <p>Streams</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{filterStream || "All"}</h3>
            <p>Current View</p>
          </div>
        </div>
      </div>

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
            <button 
              onClick={() => setFilterStream("")}
              className="clear-filter"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="results-info">
          Showing {filteredCourses.length} of {courses.length} courses
          {filterStream && ` in ${filterStream}`}
        </div>
      </div>

      {/* Courses Table */}
      <div className="table-container">
        <table className="courses-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Stream</th>
              <th>Lecturer</th>
              <th>Status</th>
              {canAddCourses && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={canAddCourses ? "6" : "5"} className="no-data-cell">
                  <div className="no-data-message">
                    <div className="no-data-icon">📚</div>
                    <p>No courses found{filterStream ? ` for stream "${filterStream}"` : ""}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCourses.map((course, index) => (
                <CourseTableRow 
                  key={course.id || index} 
                  course={course} 
                  lecturers={lecturers}
                  canEdit={canAddCourses}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Separate component for table row
const CourseTableRow = ({ course, lecturers, canEdit }) => {
  const getLecturerName = (lecturerId) => {
    if (!lecturerId) return "Not assigned";
    const lecturer = lecturers.find(l => l.id === lecturerId);
    return lecturer ? lecturer.name : "Unknown lecturer";
  };

  const getStatusVariant = (course) => {
    if (course.lecturer_id) return "active";
    return "inactive";
  };

  const getStatusText = (course) => {
    if (course.lecturer_id) return "Active";
    return "No Lecturer";
  };

  return (
    <tr className="course-row">
      <td>
        <div className="course-code-cell">
          <span className="code">{course.course_code}</span>
        </div>
      </td>
      <td>
        <div className="course-name-cell">
          <strong>{course.course_name}</strong>
        </div>
      </td>
      <td>
        <span className="stream-badge">{course.stream}</span>
      </td>
      <td>
        <div className="lecturer-cell">
          {getLecturerName(course.lecturer_id)}
          {course.lecturer_id && !lecturers.find(l => l.id === course.lecturer_id) && (
            <small className="warning-text"> (Lecturer not found)</small>
          )}
        </div>
      </td>
      <td>
        <span className={`status-badge status-${getStatusVariant(course)}`}>
          {getStatusText(course)}
        </span>
      </td>
      {canEdit && (
        <td>
          <div className="action-buttons">
            <button className="action-btn edit-btn" title="Edit Course">
              ✏️
            </button>
            <button className="action-btn delete-btn" title="Delete Course">
              🗑️
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

export default Courses;