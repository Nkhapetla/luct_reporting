import React, { useState, useEffect } from "react";
import axios from "axios";

function Monitoring() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    const fetchLecturerMonitoringData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        
        if (!user) {
          setError("Please log in to view monitoring data");
          setLoading(false);
          return;
        }

        if (user.role !== "lecturer") {
          setError("This page is for lecturers only");
          setLoading(false);
          return;
        }

        console.log("👨‍🏫 Fetching monitoring data for lecturer:", user.id);

        // Fetch attendance data for lecturer's courses
        const response = await axios.get(`https://luct-reporting-cfvn.onrender.com/api/lecturer/monitoring/${user.id}`, {
          headers: { "x-user-role": "lecturer" }
        });

        console.log("✅ Monitoring data:", response.data);
        setAttendanceData(response.data || []);
        
      } catch (err) {
        console.error("❌ Error fetching monitoring data:", err);
        setError("Failed to load monitoring data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLecturerMonitoringData();
  }, []);

  // Filter data by selected course
  const filteredData = selectedCourse 
    ? attendanceData.filter(item => item.course_id == selectedCourse)
    : attendanceData;

  // Get unique courses for filter dropdown
  const uniqueCourses = [...new Set(attendanceData.map(item => ({
    course_id: item.course_id,
    course_name: item.course_name,
    course_code: item.course_code
  })))].filter((course, index, self) => 
    index === self.findIndex(c => c.course_id === course.course_id)
  );

  // Calculate statistics
  const calculateStats = (data) => {
    const totalStudents = [...new Set(data.map(item => item.student_id))].length;
    const presentStudents = data.filter(item => item.present === 1).length;
    const attendanceRate = totalStudents > 0 ? (presentStudents / totalStudents * 100).toFixed(1) : 0;
    
    return { totalStudents, presentStudents, attendanceRate };
  };

  const stats = calculateStats(filteredData);

  if (loading) return <div className="loading">🔄 Loading monitoring data...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="monitoring-container">
      <h2 className="monitoring-title">📊 Class Monitoring & Attendance</h2>

      {/* Statistics Summary */}
      <div className="monitoring-stats">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-number">{stats.totalStudents}</p>
        </div>
        <div className="stat-card">
          <h3>Present Students</h3>
          <p className="stat-number">{stats.presentStudents}</p>
        </div>
        <div className="stat-card">
          <h3>Attendance Rate</h3>
          <p className="stat-number">{stats.attendanceRate}%</p>
        </div>
      </div>

      {/* Course Filter */}
      {uniqueCourses.length > 0 && (
        <div className="filter-section">
          <label htmlFor="course-filter">Filter by Course:</label>
          <select 
            id="course-filter"
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_code} - {course.course_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detailed Attendance Table */}
      <div className="attendance-table-container">
        <h3>Student Attendance Details</h3>
        
        {filteredData.length === 0 ? (
          <div className="no-data">
            <p>No attendance data available for the selected filter.</p>
          </div>
        ) : (
          <table className="monitoring-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Course</th>
                <th>Class</th>
                <th>Date</th>
                <th>Status</th>
                <th>Venue</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record, index) => (
                <tr key={index} className={record.present ? 'present' : 'absent'}>
                  <td>{record.student_name}</td>
                  <td className="student-id">{record.student_id}</td>
                  <td>
                    <div className="course-info">
                      <strong>{record.course_code}</strong>
                      <br />
                      <small>{record.course_name}</small>
                    </div>
                  </td>
                  <td>{record.class_name}</td>
                  <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${record.present ? 'present' : 'absent'}`}>
                      {record.present ? '✅ Present' : '❌ Absent'}
                    </span>
                  </td>
                  <td>{record.venue || 'N/A'}</td>
                  <td>{record.scheduled_time || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Course Summary Section */}
      {uniqueCourses.length > 0 && (
        <div className="course-summary">
          <h3>Course-wise Summary</h3>
          <div className="course-cards">
            {uniqueCourses.map(course => {
              const courseData = attendanceData.filter(item => item.course_id === course.course_id);
              const courseStats = calculateStats(courseData);
              
              return (
                <div key={course.course_id} className="course-summary-card">
                  <h4>{course.course_code} - {course.course_name}</h4>
                  <div className="course-stats">
                    <span>Students: {courseStats.totalStudents}</span>
                    <span>Present: {courseStats.presentStudents}</span>
                    <span>Rate: {courseStats.attendanceRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Monitoring;
