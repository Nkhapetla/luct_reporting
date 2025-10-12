import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function Monitoring() {
  const [monitoring, setMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStream, setFilterStream] = useState("");
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📊 PRL fetching monitoring data...");
      
      // First try the PRL monitoring endpoint
      try {
        const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/monitoring", {
          headers: getHeaders()
        });
        
        console.log(`✅ Found ${response.data.length} monitoring records from PRL endpoint`);
        
        // Filter by PRL's stream if needed
        let filteredData = userStream 
          ? response.data.filter(item => item.stream === userStream)
          : response.data;
        
        setMonitoring(filteredData || []);
        return;
      } catch (prlError) {
        console.log("PRL monitoring endpoint not available, using combined data approach");
      }

      // Fallback: Combine data from multiple endpoints
      const [classesResponse, coursesResponse, classCoursesResponse, reportsResponse] = await Promise.all([
        axios.get("https://luct-reporting-cfvn.onrender.com/api/classes", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/class-courses", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/reports", { headers: getHeaders() })
      ]);

      // Create monitoring data from combined sources
      const monitoringData = classCoursesResponse.data.map(mapping => {
        const classInfo = classesResponse.data.find(c => c.id === mapping.class_id);
        const courseInfo = coursesResponse.data.find(c => c.id === mapping.course_id);
        
        // Find latest report for this class-course combination
        const latestReport = reportsResponse.data
          .filter(report => report.class_id === mapping.class_id && report.course_id === mapping.course_id)
          .sort((a, b) => new Date(b.report_date || b.created_at) - new Date(a.report_date || a.created_at))[0];

        return {
          id: mapping.id,
          lecturer_id: mapping.lecturer_id,
          lecturer_name: mapping.lecturer_name,
          course_name: courseInfo?.course_name || mapping.course_name,
          course_code: courseInfo?.course_code || mapping.course_code,
          class_name: classInfo?.class_name || mapping.class_name,
          class_id: mapping.class_id,
          stream: courseInfo?.stream || mapping.stream,
          venue: mapping.venue || courseInfo?.venue || classInfo?.venue || "TBA",
          scheduled_time: mapping.scheduled_time || courseInfo?.scheduled_time || "Not scheduled",
          total_students: classInfo?.total_registered || mapping.total_registered || 0,
          present_students: latestReport?.actual_students_present || 0,
          attendance_rate: latestReport ? 
            Math.round((latestReport.actual_students_present / latestReport.total_students) * 100) : 0,
          last_report_date: latestReport?.report_date || latestReport?.created_at,
          status: latestReport ? "Reported" : "No Report"
        };
      });

      // Filter by PRL's stream if needed
      let filteredData = userStream 
        ? monitoringData.filter(item => item.stream === userStream)
        : monitoringData;

      console.log(`✅ Created ${filteredData.length} monitoring records`);
      setMonitoring(filteredData || []);
      
    } catch (err) {
      console.error("❌ Error fetching monitoring data:", err);
      setError("Failed to load monitoring data. Please try again.");
      setMonitoring([]);
    } finally {
      setLoading(false);
    }
  }, [userRole, userStream]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData, refreshTrigger]);

  // Get unique values for filters
  const { uniqueStreams, uniqueLecturers } = useMemo(() => {
    const streams = [...new Set(monitoring.map(m => m.stream).filter(Boolean))].sort();
    const lecturers = [...new Set(monitoring.map(m => m.lecturer_name).filter(Boolean))].sort();
    return { uniqueStreams: streams, uniqueLecturers: lecturers };
  }, [monitoring]);

  // Filter monitoring data
  const filteredMonitoring = useMemo(() => {
    let filtered = monitoring;
    
    if (filterStream) {
      filtered = filtered.filter(item => item.stream === filterStream);
    }
    
    if (filterLecturer) {
      filtered = filtered.filter(item => item.lecturer_name === filterLecturer);
    }
    
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    return filtered;
  }, [monitoring, filterStream, filterLecturer, filterStatus]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalClasses = filteredMonitoring.length;
    const classesWithReports = filteredMonitoring.filter(m => m.status === "Reported").length;
    const totalStudents = filteredMonitoring.reduce((sum, m) => sum + m.total_students, 0);
    const totalPresent = filteredMonitoring.reduce((sum, m) => sum + m.present_students, 0);
    const avgAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    return {
      totalClasses,
      classesWithReports,
      totalStudents,
      totalPresent,
      avgAttendance
    };
  }, [filteredMonitoring]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  const clearFilters = () => {
    setFilterStream("");
    setFilterLecturer("");
    setFilterStatus("");
  };

  // Get attendance status
  const getAttendanceStatus = (attendanceRate) => {
    if (attendanceRate >= 80) return { variant: 'excellent', text: 'Excellent' };
    if (attendanceRate >= 60) return { variant: 'good', text: 'Good' };
    if (attendanceRate >= 40) return { variant: 'fair', text: 'Fair' };
    return { variant: 'poor', text: 'Needs Attention' };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading monitoring data...</p>
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
    <div className="monitoring-container">
      <div className="section-header">
        <div className="header-content">
          <h2>📊 Class Monitoring Dashboard</h2>
          <p className="section-subtitle">
            {userStream 
              ? `Monitoring classes and attendance in ${userStream}` 
              : "Monitoring all classes and attendance across streams"}
          </p>
        </div>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-content">
            <h3>{statistics.totalClasses}</h3>
            <p>Total Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{statistics.classesWithReports}</h3>
            <p>With Reports</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{statistics.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{statistics.avgAttendance}%</h3>
            <p>Avg Attendance</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="stream-filter">Stream:</label>
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
        </div>

        <div className="filter-group">
          <label htmlFor="lecturer-filter">Lecturer:</label>
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

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select 
            id="status-filter"
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Reported">With Reports</option>
            <option value="No Report">No Reports</option>
          </select>
        </div>

        {(filterStream || filterLecturer || filterStatus) && (
          <button onClick={clearFilters} className="clear-filter">
            Clear Filters
          </button>
        )}

        <div className="results-info">
          Showing {filteredMonitoring.length} of {monitoring.length} classes
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container">
        <table className="monitoring-table">
          <thead>
            <tr>
              <th>Lecturer</th>
              <th>Course</th>
              <th>Class</th>
              <th>Stream</th>
              <th>Schedule</th>
              <th>Students</th>
              <th>Attendance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonitoring.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data-cell">
                  <div className="no-data-message">
                    <div className="no-data-icon">📊</div>
                    <p>No monitoring data found</p>
                    <p className="info-note">
                      {filterStream || filterLecturer || filterStatus 
                        ? "Try adjusting your filters" 
                        : "Monitoring data will appear here when classes are assigned and reports are submitted"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMonitoring.map((item) => (
                <MonitoringRow 
                  key={item.id} 
                  item={item}
                  getAttendanceStatus={getAttendanceStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Monitoring Row Component
const MonitoringRow = ({ item, getAttendanceStatus }) => {
  const attendanceStatus = getAttendanceStatus(item.attendance_rate);
  const hasReport = item.status === "Reported";

  return (
    <tr className="monitoring-row">
      <td>
        <div className="lecturer-info">
          <strong>{item.lecturer_name || "Not assigned"}</strong>
          {item.lecturer_id && !item.lecturer_name && (
            <div className="lecturer-id">ID: {item.lecturer_id}</div>
          )}
        </div>
      </td>
      <td>
        <div className="course-info">
          <strong>{item.course_name}</strong>
          <div className="course-code">{item.course_code}</div>
        </div>
      </td>
      <td>
        <div className="class-info">
          <strong>{item.class_name}</strong>
          <div className="class-id">ID: {item.class_id}</div>
        </div>
      </td>
      <td>
        <span className="stream-badge">{item.stream}</span>
      </td>
      <td>
        <div className="schedule-info">
          <div className="time">{item.scheduled_time}</div>
          <div className="venue">{item.venue}</div>
        </div>
      </td>
      <td>
        <div className="student-stats">
          <div className="total-students">
            <strong>{item.total_students}</strong> total
          </div>
          {hasReport && (
            <div className="present-students">
              {item.present_students} present
            </div>
          )}
        </div>
      </td>
      <td>
        {hasReport ? (
          <div className="attendance-display">
            <div className="attendance-rate">{item.attendance_rate}%</div>
            <div className="progress-bar">
              <div 
                className={`progress-fill ${attendanceStatus.variant}`}
                style={{ width: `${Math.min(item.attendance_rate, 100)}%` }}
              ></div>
            </div>
            <div className={`attendance-status ${attendanceStatus.variant}`}>
              {attendanceStatus.text}
            </div>
          </div>
        ) : (
          <div className="no-attendance">
            <span className="no-data">No report</span>
          </div>
        )}
      </td>
      <td>
        <span className={`status-badge ${hasReport ? 'reported' : 'no-report'}`}>
          {hasReport ? (
            <>
              <span className="status-icon">✅</span>
              Reported
            </>
          ) : (
            <>
              <span className="status-icon">⏳</span>
              No Report
            </>
          )}
        </span>
        {hasReport && item.last_report_date && (
          <div className="report-date">
            {new Date(item.last_report_date).toLocaleDateString()}
          </div>
        )}
      </td>
    </tr>
  );
};

export default Monitoring;
