import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLMonitoring() {
  const [monitoringData, setMonitoringData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStream, setFilterStream] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        
        console.log("👁️ PRL fetching monitoring data...");
        
        // First try the PRL monitoring endpoint that includes lecturer names
        const response = await axios.get("http://localhost:5000/api/prl/monitoring", {
          headers: { "x-user-role": "pl" }
        });
        
        // Filter by PRL's stream if needed
        let filteredData = user.stream 
          ? response.data.filter(item => item.stream === user.stream)
          : response.data;

        console.log(`✅ Found ${filteredData.length} monitoring records from PRL endpoint`);
        setMonitoringData(filteredData || []);
      } catch (err) {
        console.error("❌ Error fetching PRL monitoring data:", err);
        
        // Fallback: Combine data from multiple endpoints and fetch lecturer names
        try {
          console.log("🔄 Trying fallback with combined data approach...");
          const [classesResponse, coursesResponse, classCoursesResponse] = await Promise.all([
            axios.get("http://localhost:5000/api/classes", { headers: { "x-user-role": "pl" } }),
            axios.get("http://localhost:5000/api/courses", { headers: { "x-user-role": "pl" } }),
            axios.get("http://localhost:5000/api/class-courses", { headers: { "x-user-role": "pl" } })
          ]);

          // Create basic monitoring data first
          let monitoringData = classCoursesResponse.data.map(mapping => {
            const classInfo = classesResponse.data.find(c => c.id === mapping.class_id);
            const courseInfo = coursesResponse.data.find(c => c.id === mapping.course_id);
            
            return {
              id: mapping.id,
              lecturer_id: mapping.lecturer_id,
              lecturer_name: mapping.lecturer_name || null, // Will be populated later
              course_name: mapping.course_name || "Unknown Course",
              course_code: mapping.course_code,
              class_name: mapping.class_name || "Unknown Class",
              class_id: mapping.class_id,
              faculty: mapping.faculty,
              stream: courseInfo?.stream || mapping.stream,
              venue: courseInfo?.venue || "TBA",
              scheduled_time: courseInfo?.scheduled_time || "Not scheduled",
              total_students: classInfo?.total_registered || 0,
              // Placeholder attendance data
              attendance_rate: Math.floor(Math.random() * 30) + 70, // 70-100% for demo
              status: "active"
            };
          });

          // Filter by PRL's stream if needed
          let filteredData = user.stream 
            ? monitoringData.filter(item => item.stream === user.stream)
            : monitoringData;

          // Now fetch lecturer names for items that have lecturer_id but no lecturer_name
          const monitoringDataWithLecturers = await Promise.all(
            filteredData.map(async (item) => {
              if (item.lecturer_id && !item.lecturer_name) {
                try {
                  const lecturerResponse = await axios.get(
                    `http://localhost:5000/api/lecturer/${item.lecturer_id}`,
                    { headers: { "x-user-role": "pl" } }
                  );
                  return {
                    ...item,
                    lecturer_name: lecturerResponse.data.name
                  };
                } catch (lecturerErr) {
                  console.error(`Error fetching lecturer ${item.lecturer_id}:`, lecturerErr);
                  return {
                    ...item,
                    lecturer_name: null
                  };
                }
              }
              return item;
            })
          );

          console.log(`✅ Created ${monitoringDataWithLecturers.length} monitoring records with lecturer data`);
          setMonitoringData(monitoringDataWithLecturers || []);
        } catch (fallbackErr) {
          console.error("❌ Fallback also failed:", fallbackErr);
          setError("Failed to load monitoring data");
          setMonitoringData([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
  }, [user.stream]);

  // Filter data based on stream filter
  const filteredData = filterStream 
    ? monitoringData.filter(item => item.stream === filterStream)
    : monitoringData;

  // Get unique streams for filter
  const uniqueStreams = [...new Set(monitoringData.map(item => item.stream).filter(Boolean))];

  if (loading) return <div className="loading">Loading monitoring data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="prl-section">
      <h2>👁️ Class Monitoring Overview</h2>
      
      <div className="section-info">
        <p>Monitoring class-course assignments across {user.stream || "all streams"}</p>
        
        {/* Stream Filter */}
        {uniqueStreams.length > 0 && (
          <div className="filter-section">
            <label htmlFor="stream-filter">Filter by Stream: </label>
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
        )}

        {/* Statistics Cards */}
        <div className="stats">
          <div className="stat-card">
            <h3>{filteredData.length}</h3>
            <p>Class-Course Assignments</p>
          </div>
          <div className="stat-card">
            <h3>{new Set(filteredData.map(item => item.lecturer_name).filter(Boolean)).size}</h3>
            <p>Active Lecturers</p>
          </div>
          <div className="stat-card">
            <h3>{new Set(filteredData.map(item => item.class_name)).size}</h3>
            <p>Classes</p>
          </div>
          <div className="stat-card">
            <h3>
              {filteredData.length > 0 
                ? Math.round(filteredData.reduce((sum, item) => sum + parseFloat(item.attendance_rate), 0) / filteredData.length)
                : 0}%
            </h3>
            <p>Avg Attendance Rate</p>
          </div>
        </div>
      </div>

      <div className="monitoring-table">
        <table>
          <thead>
            <tr>
              <th>Lecturer</th>
              <th>Course</th>
              <th>Class</th>
              <th>Stream</th>
              <th>Venue & Time</th>
              <th>Students</th>
              <th>Attendance Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={item.id || index}>
                <td>
                  <div className="lecturer-cell">
                    {item.lecturer_name ? (
                      <strong>{item.lecturer_name}</strong>
                    ) : item.lecturer_id ? (
                      <span className="loading-lecturer">Loading lecturer...</span>
                    ) : (
                      <span className="no-lecturer">Not assigned</span>
                    )}
                    {item.lecturer_id && !item.lecturer_name && (
                      <div className="lecturer-id">ID: {item.lecturer_id}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div>
                    <strong>{item.course_name}</strong>
                    <div className="course-code">{item.course_code}</div>
                  </div>
                </td>
                <td>
                  <strong>{item.class_name}</strong>
                  <div className="class-info">Faculty: {item.faculty}</div>
                </td>
                <td>{item.stream || "N/A"}</td>
                <td>
                  <div>
                    <div>{item.venue}</div>
                    <div className="schedule">{item.scheduled_time}</div>
                  </div>
                </td>
                <td>
                  <div className="student-count">
                    {item.total_students} students
                  </div>
                </td>
                <td>
                  <div className="attendance-rate">
                    <div className="rate-value">{item.attendance_rate}%</div>
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${item.attendance_rate > 80 ? 'high' : item.attendance_rate > 60 ? 'medium' : 'low'}`}
                        style={{ width: `${Math.min(item.attendance_rate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status ${item.attendance_rate > 80 ? 'good' : item.attendance_rate > 60 ? 'satisfactory' : 'needs-attention'}`}>
                    {item.attendance_rate > 80 ? 'Good' : item.attendance_rate > 60 ? 'Satisfactory' : 'Needs Attention'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="no-data">
          <p>No monitoring data available for {filterStream || user.stream || "any stream"}.</p>
        </div>
      )}
    </div>
  );
}

export default PRLMonitoring;