import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterLecturer, setFilterLecturer] = useState("");
  const [expandedReport, setExpandedReport] = useState(null);
  const [feedbackData, setFeedbackData] = useState({});
  const [submittingFeedback, setSubmittingFeedback] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "";
  const userStream = user.stream || "";

  // Get headers with role
  const getHeaders = () => {
    return {
      "x-user-role": userRole,
      "Content-Type": "application/json"
    };
  };

  // Excel Download Functions for PL
  const downloadReportsExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/pl/reports/excel", {
        headers: getHeaders(),
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pl-reports.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Excel report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error('Error downloading Excel report:', error);
      setError('❌ Failed to download Excel report.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadSummaryExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/pl/reports/summary-excel", {
        headers: getHeaders(),
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pl-summary.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Summary Excel downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error('Error downloading summary Excel:', error);
      setError('❌ Failed to download summary report.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Load feedback from localStorage
  const loadFeedbackFromStorage = useCallback(() => {
    try {
      const storedFeedback = localStorage.getItem(`prl_feedback_${user.id}`);
      return storedFeedback ? JSON.parse(storedFeedback) : {};
    } catch (error) {
      console.error("Error loading feedback from storage:", error);
      return {};
    }
  }, [user.id]);

  // Save feedback to localStorage
  const saveFeedbackToStorage = useCallback((feedback) => {
    try {
      localStorage.setItem(`prl_feedback_${user.id}`, JSON.stringify(feedback));
    } catch (error) {
      console.error("Error saving feedback to storage:", error);
    }
  }, [user.id]);

  // Fetch reports data for PRL's stream only
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📊 PL fetching reports for stream: ${userStream}`);
      
      // First try the PRL-specific reports endpoint
      try {
        const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/reports", {
          headers: getHeaders()
        });
        
        console.log(`✅ Found ${response.data.length} reports from PRL endpoint`);
        
        // Load saved feedback and merge with reports
        const savedFeedback = loadFeedbackFromStorage();
        const reportsWithFeedback = response.data.map(report => ({
          ...report,
          prl_feedback: savedFeedback[report.id]?.feedback || report.prl_feedback,
          feedback_by: savedFeedback[report.id]?.feedback_by || report.feedback_by,
          feedback_date: savedFeedback[report.id]?.feedback_date || report.feedback_date
        }));
        
        setReports(reportsWithFeedback);
        return;
      } catch (prlError) {
        console.log("PRL reports endpoint not available, filtering all reports by stream");
      }

      // Fallback: Get all reports and filter by PRL's stream
      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/reports", {
        headers: getHeaders()
      });
      
      // Filter reports to only show those from PRL's stream
      const filteredReports = userStream 
        ? response.data.filter(report => report.stream === userStream)
        : response.data;
      
      console.log(`✅ Found ${filteredReports.length} reports for ${userStream}`);
      
      // Load saved feedback and merge with reports
      const savedFeedback = loadFeedbackFromStorage();
      const reportsWithFeedback = filteredReports.map(report => ({
        ...report,
        prl_feedback: savedFeedback[report.id]?.feedback || report.prl_feedback,
        feedback_by: savedFeedback[report.id]?.feedback_by || report.feedback_by,
        feedback_date: savedFeedback[report.id]?.feedback_date || report.feedback_date
      }));
      
      setReports(reportsWithFeedback);
      
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError("Failed to load reports. Please try again.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [userRole, userStream, loadFeedbackFromStorage]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshTrigger]);

  // Handle feedback submission with fallback to localStorage
  const handleSubmitFeedback = async (reportId) => {
    if (!feedbackData[reportId]?.trim()) {
      alert("Please enter feedback before submitting");
      return;
    }

    setSubmittingFeedback(prev => ({ ...prev, [reportId]: true }));

    try {
      const feedbackPayload = {
        report_id: reportId,
        feedback: feedbackData[reportId],
        feedback_by: user.name || `PRL-${user.id}`,
        feedback_role: userRole,
        feedback_date: new Date().toISOString()
      };

      console.log("💬 Submitting feedback:", feedbackPayload);

      // Try to submit to backend first
      try {
        await axios.put(`https://luct-reporting-cfvn.onrender.com/api/reports/${reportId}/feedback`, 
          feedbackPayload, 
          { headers: getHeaders() }
        );
        console.log("✅ Feedback submitted to backend successfully");
      } catch (backendError) {
        console.log("⚠️ Backend endpoint not available, storing feedback locally");
        // If backend fails, store in localStorage
        const savedFeedback = loadFeedbackFromStorage();
        const updatedFeedback = {
          ...savedFeedback,
          [reportId]: feedbackPayload
        };
        saveFeedbackToStorage(updatedFeedback);
      }

      // Update local state regardless of backend success
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { 
              ...report, 
              prl_feedback: feedbackData[reportId],
              feedback_by: user.name || `PRL-${user.id}`,
              feedback_date: new Date().toISOString()
            } 
          : report
      ));

      // Clear feedback input
      setFeedbackData(prev => ({ ...prev, [reportId]: "" }));
      
      alert("✅ Feedback submitted successfully!");
      
    } catch (err) {
      console.error("❌ Error submitting feedback:", err);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Handle feedback input change
  const handleFeedbackChange = (reportId, value) => {
    setFeedbackData(prev => ({
      ...prev,
      [reportId]: value
    }));
  };

  // Toggle report expansion
  const toggleReportExpansion = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Get unique lecturers for filter (only from PRL's stream)
  const uniqueLecturers = useMemo(() => {
    const lecturers = [...new Set(reports.map(r => r.lecturer_name).filter(Boolean))].sort();
    return lecturers;
  }, [reports]);

  // Filter reports by lecturer
  const filteredReports = useMemo(() => {
    if (!filterLecturer) return reports;
    return reports.filter(report => report.lecturer_name === filterLecturer);
  }, [reports, filterLecturer]);

  // Calculate statistics for PRL's stream
  const statistics = useMemo(() => {
    const totalReports = filteredReports.length;
    const reportsWithFeedback = filteredReports.filter(r => r.prl_feedback).length;
    const averageAttendance = totalReports > 0 
      ? Math.round(filteredReports.reduce((sum, r) => {
          const attendanceRate = (r.actual_students_present / r.total_students) * 100;
          return sum + (isNaN(attendanceRate) ? 0 : attendanceRate);
        }, 0) / totalReports)
      : 0;

    return {
      totalReports,
      reportsWithFeedback,
      averageAttendance,
      pendingFeedback: totalReports - reportsWithFeedback
    };
  }, [filteredReports]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  const clearFilters = () => {
    setFilterLecturer("");
  };

  // Calculate attendance rate with safety check
  const getAttendanceRate = (report) => {
    if (!report.total_students || report.total_students === 0) return 0;
    return Math.round((report.actual_students_present / report.total_students) * 100);
  };

  // Get attendance status
  const getAttendanceStatus = (attendanceRate) => {
    if (attendanceRate >= 80) return { variant: 'excellent', text: 'Excellent' };
    if (attendanceRate >= 60) return { variant: 'good', text: 'Good' };
    if (attendanceRate >= 40) return { variant: 'fair', text: 'Fair' };
    return { variant: 'poor', text: 'Needs Attention' };
  };

  // Export feedback data
  const exportFeedback = () => {
    const feedbackToExport = reports
      .filter(report => report.prl_feedback)
      .map(report => ({
        report_id: report.id,
        course_name: report.course_name,
        class_name: report.class_name,
        lecturer_name: report.lecturer_name,
        stream: report.stream,
        feedback: report.prl_feedback,
        feedback_by: report.feedback_by,
        feedback_date: report.feedback_date
      }));

    if (feedbackToExport.length === 0) {
      alert("No feedback to export");
      return;
    }

    const dataStr = JSON.stringify(feedbackToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pl_feedback_${userStream}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`✅ Exported ${feedbackToExport.length} feedback entries`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading reports for {userStream}...</p>
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
    <div className="reports-container">
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <div className="section-header">
        <div className="header-content">
          <h2>📊 {userStream} Teaching Reports</h2>
          <p className="section-subtitle">Monitor class reports and provide feedback to lecturers in your stream</p>
        </div>
        <div className="header-actions">
          {reports.length > 0 && (
            <div className="excel-downloads">
              <button 
                onClick={downloadSummaryExcel}
                disabled={downloadLoading}
                className="btn btn-outline-primary"
              >
                {downloadLoading ? "⏳..." : "📈 Summary"}
              </button>
              <button 
                onClick={downloadReportsExcel}
                disabled={downloadLoading}
                className="btn btn-success"
              >
                {downloadLoading ? "⏳..." : "📥 Full Reports"}
              </button>
            </div>
          )}
          <button onClick={exportFeedback} className="export-button" disabled={reports.filter(r => r.prl_feedback).length === 0}>
            📥 Export Feedback
          </button>
          <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
            🔄 {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stream Information */}
      <div className="stream-banner">
        <div className="banner-icon">🌊</div>
        <div className="banner-content">
          <h3>Viewing Reports for: {userStream}</h3>
          <p>You can provide feedback to lecturers teaching courses in your stream</p>
          <div className="storage-notice">
            <small>💾 Feedback is stored locally in your browser</small>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{statistics.totalReports}</h3>
            <p>Total Reports</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>{statistics.reportsWithFeedback}</h3>
            <p>With Feedback</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{statistics.pendingFeedback}</h3>
            <p>Pending Feedback</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{statistics.averageAttendance}%</h3>
            <p>Avg Attendance</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="lecturer-filter">Filter by Lecturer:</label>
          <select 
            id="lecturer-filter"
            value={filterLecturer} 
            onChange={(e) => setFilterLecturer(e.target.value)}
            className="filter-select"
          >
            <option value="">All Lecturers</option>
            {uniqueLecturers.map(lecturer => (
              <option key={lecturer} value={lecturer}>{lecturer}</option>
            ))}
          </select>
        </div>

        {filterLecturer && (
          <button onClick={clearFilters} className="clear-filter">
            Clear Filter
          </button>
        )}

        <div className="results-info">
          Showing {filteredReports.length} of {reports.length} reports in {userStream}
          {filterLecturer && ` for ${filterLecturer}`}
        </div>
      </div>

      {/* Reports List */}
      <div className="reports-grid">
        {filteredReports.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📊</div>
            <p>No reports found for {userStream}</p>
            <p className="info-note">
              {filterLecturer 
                ? `No reports from ${filterLecturer} in ${userStream}` 
                : "Reports will appear here when lecturers in your stream submit them"}
            </p>
            <button onClick={handleRefresh} className="retry-button">
              Check Again
            </button>
          </div>
        ) : (
          filteredReports.map((report) => (
            <ReportCard 
              key={report.id}
              report={report}
              isExpanded={expandedReport === report.id}
              onToggle={() => toggleReportExpansion(report.id)}
              feedbackData={feedbackData[report.id] || ""}
              onFeedbackChange={(value) => handleFeedbackChange(report.id, value)}
              onSubmitFeedback={() => handleSubmitFeedback(report.id)}
              submitting={submittingFeedback[report.id]}
              getAttendanceRate={getAttendanceRate}
              getAttendanceStatus={getAttendanceStatus}
              userStream={userStream}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Report Card Component
const ReportCard = ({ 
  report, 
  isExpanded, 
  onToggle, 
  feedbackData, 
  onFeedbackChange, 
  onSubmitFeedback, 
  submitting,
  getAttendanceRate,
  getAttendanceStatus,
  userStream
}) => {
  const attendanceRate = getAttendanceRate(report);
  const attendanceStatus = getAttendanceStatus(attendanceRate);
  const hasExistingFeedback = report.prl_feedback;

  return (
    <div className="report-card">
      <div className="report-header" onClick={onToggle}>
        <div className="report-main-info">
          <h3>{report.course_name} - {report.class_name}</h3>
          <div className="report-meta">
            <span className="lecturer">By: {report.lecturer_name}</span>
            <span className="stream">Stream: {report.stream}</span>
            <span className="week">Week: {report.week_of_reporting}</span>
          </div>
        </div>
        
        <div className="report-status">
          <div className={`attendance-badge attendance-${attendanceStatus.variant}`}>
            {attendanceRate}% - {attendanceStatus.text}
          </div>
          {hasExistingFeedback && (
            <div className="feedback-indicator" title="Feedback Provided">
              💬
            </div>
          )}
          <div className="toggle-icon">
            {isExpanded ? '▼' : '►'}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="report-details">
          {/* Stream Verification */}
          <div className="stream-verification">
            <div className="verification-badge">
              ✅ This report is from your stream ({userStream})
            </div>
          </div>

          {/* Basic Report Information */}
          <div className="details-grid">
            <div className="detail-item">
              <strong>Students Present:</strong>
              <span>{report.actual_students_present}/{report.total_students}</span>
            </div>
            <div className="detail-item">
              <strong>Attendance Rate:</strong>
              <span>{attendanceRate}%</span>
            </div>
            <div className="detail-item">
              <strong>Topics Covered:</strong>
              <span>{report.topics_covered || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <strong>Teaching Methods:</strong>
              <span>{report.teaching_methods || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <strong>Challenges:</strong>
              <span>{report.challenges_faced || 'None reported'}</span>
            </div>
            <div className="detail-item">
              <strong>Report Date:</strong>
              <span>{new Date(report.report_date || report.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Lecturer's Comments */}
          {report.lecturer_comments && (
            <div className="comments-section">
              <h4>Lecturer's Comments:</h4>
              <div className="comments-text">
                {report.lecturer_comments}
              </div>
            </div>
          )}

          {/* Existing PRL Feedback */}
          {hasExistingFeedback && (
            <div className="existing-feedback">
              <h4>📌 Your Previous Feedback:</h4>
              <div className="feedback-text">
                {report.prl_feedback}
              </div>
              <div className="feedback-meta">
                Provided by {report.feedback_by} on {new Date(report.feedback_date).toLocaleDateString()}
                <br />
                <small>💾 Stored locally in your browser</small>
              </div>
            </div>
          )}

          {/* Feedback Input Section */}
          <div className="feedback-section">
            <h4>{hasExistingFeedback ? 'Update Your Feedback:' : 'Provide Feedback to Lecturer:'}</h4>
            <div className="feedback-input-container">
              <textarea
                placeholder="Enter your constructive feedback for the lecturer... (e.g., Great job on student engagement, consider incorporating more group activities)"
                value={feedbackData}
                onChange={(e) => onFeedbackChange(e.target.value)}
                className="feedback-textarea"
                rows="4"
              />
              <div className="feedback-actions">
                <button
                  onClick={onSubmitFeedback}
                  disabled={!feedbackData.trim() || submitting}
                  className="submit-feedback-button"
                >
                  {submitting ? (
                    <>
                      <div className="button-spinner"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="button-icon">💬</span>
                      {hasExistingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                    </>
                  )}
                </button>
                <div className="feedback-tips">
                  <small>💡 Provide constructive feedback to help improve teaching quality in {userStream}</small>
                  <br />
                  <small>💾 Feedback will be stored locally in your browser</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
