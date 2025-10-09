import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // "summary", "view", "create"
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // New report form state
  const [newReport, setNewReport] = useState({
    faculty_name: "",
    class_name: "",
    week_of_reporting: "",
    date_of_lecture: "",
    course_name: "",
    course_code: "",
    lecturer_name: "",
    actual_students_present: "",
    total_students: "",
    venue: "",
    scheduled_time: "",
    topic: "",
    learning_outcomes: "",
    recommendations: "",
    stream: ""
  });

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userStream = user.stream || "All Streams";

  useEffect(() => {
    fetchReports();
    if (activeTab === "create") {
      fetchCoursesAndClasses();
    }
  }, [user.stream, activeTab]);

  const getHeaders = () => ({
    'x-user-role': user.role || 'pl',
    'x-user-stream': user.stream || '',
    'Content-Type': 'application/json'
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📊 PRL fetching reports for stream:", userStream);
      
      const response = await axios.get("http://localhost:5000/api/prl/reports", {
        headers: getHeaders()
      });
      
      console.log(`✅ Found ${response.data.length} reports from backend`);
      setReports(response.data || []);
      
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError("Failed to load reports from server.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursesAndClasses = async () => {
    try {
      const [coursesResponse, classesResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/courses", { headers: getHeaders() }),
        axios.get("http://localhost:5000/api/classes", { headers: getHeaders() })
      ]);

      // Filter courses by PRL's stream
      const filteredCourses = user.stream 
        ? coursesResponse.data.filter(course => course.stream === user.stream)
        : coursesResponse.data;

      setCourses(filteredCourses);
      setClasses(classesResponse.data);
    } catch (err) {
      console.error("❌ Error fetching courses and classes:", err);
    }
  };

  // Excel Download Functions
  const downloadReportsExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/prl/reports/excel", {
        headers: getHeaders(),
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'prl-reports.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Excel report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error('Error downloading Excel report:', error);
      setError('❌ Failed to download Excel report. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadSummaryExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/prl/reports/summary-excel", {
        headers: getHeaders(),
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports-summary.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Summary Excel report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error('Error downloading summary Excel:', error);
      setError('❌ Failed to download summary report. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmitFeedback = async (reportId) => {
    if (!feedback.trim()) {
      alert("Please enter feedback before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      
      await axios.post("http://localhost:5000/api/prl/feedback", {
        report_id: reportId,
        feedback: feedback,
        prl_id: user.id
      }, {
        headers: getHeaders()
      });

      setSuccessMessage("Feedback submitted successfully!");
      setFeedback("");
      setSelectedReport(null);
      
      // Refresh reports to show the new feedback
      fetchReports();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error submitting feedback:", err);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newReport.course_name || !newReport.class_name || !newReport.lecturer_name) {
      alert("Please fill in all required fields: Course Name, Class Name, and Lecturer Name.");
      return;
    }

    try {
      setSubmitting(true);
      
      // Set the stream to the PRL's stream and auto-fill some fields
      const reportData = {
        ...newReport,
        stream: user.stream,
        faculty_name: user.faculty || user.stream,
        week_of_reporting: newReport.week_of_reporting || `Week ${new Date().getWeek()}`,
        date_of_lecture: newReport.date_of_lecture || new Date().toISOString().split('T')[0]
      };

      const response = await axios.post("http://localhost:5000/api/reports", reportData, {
        headers: getHeaders()
      });

      setSuccessMessage("Report created successfully!");
      
      // Reset form
      setNewReport({
        faculty_name: "",
        class_name: "",
        week_of_reporting: "",
        date_of_lecture: "",
        course_name: "",
        course_code: "",
        lecturer_name: "",
        actual_students_present: "",
        total_students: "",
        venue: "",
        scheduled_time: "",
        topic: "",
        learning_outcomes: "",
        recommendations: "",
        stream: ""
      });
      
      // Switch back to view tab and refresh reports
      setActiveTab("view");
      fetchReports();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error creating report:", err);
      alert("Failed to create report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCourseSelect = (courseId) => {
    const selectedCourse = courses.find(course => course.id == courseId);
    if (selectedCourse) {
      setNewReport(prev => ({
        ...prev,
        course_name: selectedCourse.course_name,
        course_code: selectedCourse.course_code,
        stream: selectedCourse.stream,
        venue: selectedCourse.venue || prev.venue,
        scheduled_time: selectedCourse.scheduled_time || prev.scheduled_time
      }));
    }
  };

  const handleClassSelect = (className) => {
    setNewReport(prev => ({
      ...prev,
      class_name: className
    }));
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (reports.length === 0) return null;

    const totalReports = reports.length;
    const totalStudents = reports.reduce((sum, report) => sum + (report.total_students || 0), 0);
    const totalPresent = reports.reduce((sum, report) => sum + (report.actual_students_present || 0), 0);
    const averageAttendance = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0;
    
    const lecturers = [...new Set(reports.map(report => report.lecturer_name).filter(Boolean))];
    const coursesCount = [...new Set(reports.map(report => report.course_name).filter(Boolean))];
    const classesCount = [...new Set(reports.map(report => report.class_name).filter(Boolean))];
    
    const feedbackGiven = reports.filter(report => report.prl_feedback).length;
    const feedbackRate = totalReports > 0 ? ((feedbackGiven / totalReports) * 100).toFixed(1) : 0;

    // Recent reports (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentReports = reports.filter(report => 
      report.date_of_lecture && new Date(report.date_of_lecture) >= oneWeekAgo
    );

    return {
      totalReports,
      totalStudents,
      totalPresent,
      averageAttendance,
      lecturersCount: lecturers.length,
      coursesCount: coursesCount.length,
      classesCount: classesCount.length,
      feedbackGiven,
      feedbackRate,
      recentReports: recentReports.length,
      lecturers,
      courses: coursesCount,
      classes: classesCount
    };
  };

  // Get reports by status (needs feedback vs feedback given)
  const getReportsByStatus = () => {
    const needsFeedback = reports.filter(report => !report.prl_feedback);
    const feedbackGiven = reports.filter(report => report.prl_feedback);
    
    return { needsFeedback, feedbackGiven };
  };

  // Add week number helper
  Date.prototype.getWeek = function() {
    const date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const summary = calculateSummary();
  const reportsByStatus = getReportsByStatus();

  if (loading && activeTab === "view") return <div className="loading">Loading reports...</div>;

  return (
    <div className="prl-section">
      <div className="section-header">
        <div className="header-content">
          <h2>📊 Reports Management</h2>
          <p className="section-subtitle">
            Managing reports for {userStream}
          </p>
        </div>
        {activeTab === "view" && reports.length > 0 && (
          <div className="excel-downloads">
            <button 
              onClick={downloadSummaryExcel}
              disabled={downloadLoading}
              className="btn btn-outline-primary"
            >
              {downloadLoading ? "⏳ Generating..." : "📈 Summary Excel"}
            </button>
            <button 
              onClick={downloadReportsExcel}
              disabled={downloadLoading}
              className="btn btn-success"
            >
              {downloadLoading ? "⏳ Generating..." : "📥 Full Reports Excel"}
            </button>
          </div>
        )}
      </div>
      
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="alert alert-warning">
          {error}
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          📈 Summary
        </button>
        <button 
          className={`tab ${activeTab === "view" ? "active" : ""}`}
          onClick={() => setActiveTab("view")}
        >
          📋 View Reports
        </button>
        <button 
          className={`tab ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          ✍️ Create Report
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="summary-container">
          {summary ? (
            <>
              {/* Key Metrics */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">{summary.totalReports}</div>
                  <div className="metric-label">Total Reports</div>
                  <div className="metric-trend">
                    <span className="trend-up">↑ {summary.recentReports} this week</span>
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-value">{summary.averageAttendance}%</div>
                  <div className="metric-label">Avg Attendance</div>
                  <div className="metric-detail">
                    {summary.totalPresent}/{summary.totalStudents} students
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-value">{summary.lecturersCount}</div>
                  <div className="metric-label">Active Lecturers</div>
                  <div className="metric-detail">
                    Across {summary.coursesCount} courses
                  </div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-value">{summary.feedbackRate}%</div>
                  <div className="metric-label">Feedback Given</div>
                  <div className="metric-detail">
                    {summary.feedbackGiven}/{summary.totalReports} reports
                  </div>
                </div>
              </div>

              {/* Excel Download Section */}
              <div className="excel-section">
                <h3>📊 Export Reports</h3>
                <div className="excel-actions">
                  <button 
                    onClick={downloadSummaryExcel}
                    disabled={downloadLoading}
                    className="btn btn-primary"
                  >
                    {downloadLoading ? "⏳ Generating..." : "📈 Download Summary Excel"}
                  </button>
                  <button 
                    onClick={downloadReportsExcel}
                    disabled={downloadLoading}
                    className="btn btn-success"
                  >
                    {downloadLoading ? "⏳ Generating..." : "📥 Download Full Reports Excel"}
                  </button>
                </div>
                <div className="excel-info">
                  <p><strong>Summary Excel:</strong> Includes statistics, charts, and overview data</p>
                  <p><strong>Full Reports Excel:</strong> Includes all detailed reports with attendance calculations</p>
                </div>
              </div>

              {/* Action Required Section */}
              <div className="action-section">
                <h3>🔄 Action Required</h3>
                <div className="action-cards">
                  <div className="action-card urgent">
                    <div className="action-icon">⚠️</div>
                    <div className="action-content">
                      <h4>Pending Feedback</h4>
                      <p>{reportsByStatus.needsFeedback.length} reports need your feedback</p>
                      <button 
                        className="btn-primary"
                        onClick={() => setActiveTab("view")}
                      >
                        Review Reports
                      </button>
                    </div>
                  </div>
                  
                  <div className="action-card completed">
                    <div className="action-icon">✅</div>
                    <div className="action-content">
                      <h4>Feedback Provided</h4>
                      <p>{reportsByStatus.feedbackGiven.length} reports with your feedback</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="activity-section">
                <h3>📅 Recent Activity</h3>
                <div className="activity-list">
                  {reports.slice(0, 5).map((report, index) => (
                    <div key={report.id} className="activity-item">
                      <div className="activity-icon">
                        {report.prl_feedback ? "✅" : "📝"}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">
                          {report.course_name} - {report.class_name}
                        </div>
                        <div className="activity-details">
                          By {report.lecturer_name} • {report.date_of_lecture ? new Date(report.date_of_lecture).toLocaleDateString() : 'No date'} • {report.actual_students_present || 0}/{report.total_students || 0} students
                        </div>
                      </div>
                      <div className="activity-status">
                        {report.prl_feedback ? (
                          <span className="status-completed">Reviewed</span>
                        ) : (
                          <span className="status-pending">Needs Review</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lecturers Overview */}
              <div className="lecturers-section">
                <h3>👨‍🏫 Lecturers Overview</h3>
                <div className="lecturers-grid">
                  {summary.lecturers.slice(0, 6).map((lecturer, index) => {
                    const lecturerReports = reports.filter(r => r.lecturer_name === lecturer);
                    const feedbackCount = lecturerReports.filter(r => r.prl_feedback).length;
                    
                    return (
                      <div key={index} className="lecturer-card">
                        <div className="lecturer-avatar">
                          {lecturer.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="lecturer-info">
                          <div className="lecturer-name">{lecturer}</div>
                          <div className="lecturer-stats">
                            {lecturerReports.length} reports • {feedbackCount} reviewed
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>No reports available for analysis.</p>
              <p className="info-note">
                Reports summary will appear here when reports are submitted for your stream.
              </p>
            </div>
          )}
        </div>
      )}

      {/* View Reports Tab */}
      {activeTab === "view" && (
        <div className="reports-container">
          {reports.length > 0 ? (
            <>
              <div className="reports-header">
                <h3>All Reports ({reports.length})</h3>
                <div className="reports-actions">
                  <span className="reports-stats">
                    {reportsByStatus.needsFeedback.length} need feedback • {reportsByStatus.feedbackGiven.length} reviewed
                  </span>
                </div>
              </div>
              <div className="reports-grid">
                {reports.map((report) => (
                  <div key={report.id} className="report-card">
                    <div className="report-header">
                      <h3>{report.course_name} - {report.class_name}</h3>
                      <div className="report-meta">
                        <span className="date">
                          {report.date_of_lecture ? new Date(report.date_of_lecture).toLocaleDateString() : 'No date'}
                        </span>
                        <span className="stream-badge">{report.stream}</span>
                      </div>
                    </div>
                    
                    <div className="report-details">
                      <div className="detail-row">
                        <strong>Lecturer:</strong> {report.lecturer_name || 'N/A'}
                      </div>
                      <div className="detail-row">
                        <strong>Attendance:</strong> {report.actual_students_present || 0}/{report.total_students || 0} students
                        {report.total_students > 0 && (
                          <span className="attendance-percentage">
                            ({((report.actual_students_present / report.total_students) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <div className="detail-row">
                        <strong>Venue:</strong> {report.venue || 'N/A'} at {report.scheduled_time || 'N/A'}
                      </div>
                      {report.topic && (
                        <div className="detail-row">
                          <strong>Topic:</strong> {report.topic}
                        </div>
                      )}
                      {report.learning_outcomes && (
                        <div className="detail-row">
                          <strong>Learning Outcomes:</strong> {report.learning_outcomes}
                        </div>
                      )}
                      {report.recommendations && (
                        <div className="detail-row">
                          <strong>Recommendations:</strong> {report.recommendations}
                        </div>
                      )}
                    </div>

                    {/* Feedback Section */}
                    <div className="feedback-section">
                      <h4>PRL Feedback</h4>
                      {report.prl_feedback ? (
                        <div className="existing-feedback">
                          <p>"{report.prl_feedback}"</p>
                          {report.feedback_date && (
                            <small>
                              Submitted on {new Date(report.feedback_date).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      ) : (
                        <div className="no-feedback">
                          <p>No feedback provided yet.</p>
                          <button 
                            className="btn-primary"
                            onClick={() => setSelectedReport(report)}
                          >
                            Provide Feedback
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>No reports available for {userStream}.</p>
              <p className="info-note">
                Reports will appear here when they are submitted for your stream.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Report Tab */}
      {activeTab === "create" && (
        <div className="create-report-container">
          <div className="card">
            <div className="card-header">
              <h3>Create New Report</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateReport}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Course *</label>
                      <select 
                        className="form-select"
                        onChange={(e) => handleCourseSelect(e.target.value)}
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.course_name} ({course.course_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Class *</label>
                      <select 
                        className="form-select"
                        onChange={(e) => handleClassSelect(e.target.value)}
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.class_name}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Lecturer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="lecturer_name"
                    value={newReport.lecturer_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Students Present</label>
                      <input
                        type="number"
                        className="form-control"
                        name="actual_students_present"
                        value={newReport.actual_students_present}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Total Students</label>
                      <input
                        type="number"
                        className="form-control"
                        name="total_students"
                        value={newReport.total_students}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Topic Taught</label>
                  <input
                    type="text"
                    className="form-control"
                    name="topic"
                    value={newReport.topic}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Learning Outcomes</label>
                  <textarea
                    className="form-control"
                    name="learning_outcomes"
                    value={newReport.learning_outcomes}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Recommendations</label>
                  <textarea
                    className="form-control"
                    name="recommendations"
                    value={newReport.recommendations}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating Report..." : "Create Report"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {selectedReport && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Provide Feedback for {selectedReport.course_name}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedReport(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Lecturer:</strong> {selectedReport.lecturer_name}</p>
              <p><strong>Class:</strong> {selectedReport.class_name}</p>
              <p><strong>Date:</strong> {selectedReport.date_of_lecture ? new Date(selectedReport.date_of_lecture).toLocaleDateString() : 'No date'}</p>
              
              <div className="form-group">
                <label>Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter your feedback for this report. You can provide suggestions, commendations, or recommendations..."
                  rows="5"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={() => handleSubmitFeedback(selectedReport.id)}
                disabled={submitting || !feedback.trim()}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setSelectedReport(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PRLReports;