import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLRating() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lecturerClassRatings, setLecturerClassRatings] = useState([]);
  const [rating, setRating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStream, setFilterStream] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userStream = user.stream || "All Streams";
  const userRole = user.role || "pl";

  useEffect(() => {
    fetchRatingsData();
  }, [user.stream, dateRange]);

  const fetchRatingsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("⭐ PRL fetching ratings for stream:", userStream);
      console.log("👤 User role:", userRole);

      // Create axios instance with proper headers
      const api = axios.create({
        baseURL: "https://luct-reporting-cfvn.onrender.com",
        headers: {
          "x-user-role": userRole,
          "x-user-stream": userStream,
          "Content-Type": "application/json"
        },
        withCredentials: true
      });

      // Fetch from both tables
      const [lecturerClassResponse, ratingResponse] = await Promise.all([
        api.get(`/api/prl/lecturer_class_ratings`, {
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        }).catch(err => {
          console.error("❌ Lecturer ratings error:", err.response?.status, err.response?.data);
          throw new Error(`Lecturer ratings: ${err.response?.status || 'Network error'}`);
        }),
        
        api.get(`/api/prl/rating`, {
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        }).catch(err => {
          console.error("❌ Student ratings error:", err.response?.status, err.response?.data);
          throw new Error(`Student ratings: ${err.response?.status || 'Network error'}`);
        })
      ]);

      console.log("✅ Lecturer class ratings:", lecturerClassResponse.data);
      console.log("✅ Student ratings:", ratingResponse.data);

      setLecturerClassRatings(lecturerClassResponse.data || []);
      setRating(ratingResponse.data || []);

    } catch (err) {
      console.error("❌ Error fetching ratings data:", err);
      
      let errorMessage = "Failed to load ratings data. ";
      
      if (err.response) {
        const status = err.response.status;
        if (status === 403) {
          errorMessage += "Access forbidden. Please check your permissions or login again.";
        } else if (status === 401) {
          errorMessage += "Unauthorized. Please log in again.";
        } else if (status === 404) {
          errorMessage += "API endpoints not found. Please check backend routes.";
        } else {
          errorMessage += `Server error: ${status}`;
        }
      } else if (err.request) {
        errorMessage += "Cannot connect to backend server. Please check your internet connection.";
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
      
      setLecturerClassRatings([]);
      setRating([]);
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    console.log("🔧 Testing API connection...");
    
    try {
      const testResponse = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/rating", {
        headers: {
          "x-user-role": userRole,
          "x-user-stream": userStream
        }
      });
      console.log("✅ API Test Success:", testResponse.status, testResponse.data);
      alert(`API Test Successful! Status: ${testResponse.status}`);
    } catch (err) {
      console.error("❌ API Test Failed:", err.response?.status, err.response?.data);
      alert(`API Test Failed! Status: ${err.response?.status}\nCheck browser console for details.`);
    }
  };

  const filterData = (data) => {
    let filtered = data;
    
    if (filterStream) {
      filtered = filtered.filter(item => item.stream === filterStream);
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(item => new Date(item.created_at) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.created_at) <= endDate);
    }
    
    return filtered;
  };

  const filteredLecturerClassRatings = filterData(lecturerClassRatings);
  const filteredRating = filterData(rating);
  const allRatings = [...lecturerClassRatings, ...rating];
  const filteredAllRatings = filterData(allRatings);

  const uniqueStreams = [...new Set(allRatings.map(item => item.stream).filter(Boolean))];

  const calculateStats = () => {
    const stats = {
      totalRatings: filteredAllRatings.length,
      lecturerClassRatings: filteredLecturerClassRatings.length,
      studentRatings: filteredRating.length,
      averageRating: filteredAllRatings.length > 0 
        ? (filteredAllRatings.reduce((sum, item) => sum + item.rating, 0) / filteredAllRatings.length).toFixed(1)
        : 0,
      lowRatings: filteredAllRatings.filter(item => item.rating <= 2).length,
      highRatings: filteredAllRatings.filter(item => item.rating >= 4).length,
      lecturers: new Set(filteredAllRatings.map(item => item.lecturer_id)).size,
      students: new Set(filteredRating.map(item => item.student_id)).size
    };

    return stats;
  };

  const stats = calculateStats();

  const getLecturerPerformance = () => {
    const lecturerMap = {};
    
    filteredAllRatings.forEach(rating => {
      if (!lecturerMap[rating.lecturer_id]) {
        lecturerMap[rating.lecturer_id] = {
          lecturer_id: rating.lecturer_id,
          lecturer_name: rating.lecturer_name,
          lecturer_email: rating.lecturer_email,
          stream: rating.stream,
          ratings: [],
          comments: [],
          total_ratings: 0,
          average_rating: 0
        };
      }
      
      lecturerMap[rating.lecturer_id].ratings.push(rating.rating);
      if (rating.comment) {
        lecturerMap[rating.lecturer_id].comments.push(rating.comment);
      }
    });

    Object.values(lecturerMap).forEach(lecturer => {
      lecturer.total_ratings = lecturer.ratings.length;
      lecturer.average_rating = lecturer.ratings.length > 0 
        ? (lecturer.ratings.reduce((sum, rating) => sum + rating, 0) / lecturer.ratings.length).toFixed(1)
        : 0;
      lecturer.recent_feedback = lecturer.comments.length > 0 
        ? lecturer.comments[lecturer.comments.length - 1] 
        : "No feedback yet";
    });

    return Object.values(lecturerMap);
  };

  const lecturerPerformance = getLecturerPerformance();

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredAllRatings.forEach(item => {
      distribution[item.rating]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  const renderStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">🔄 Loading ratings data from database...</div>
        <div className="loading-details">Stream: {userStream} | Role: {userRole}</div>
      </div>
    );
  }

  return (
    <div className="prl-ratings">
      <div className="ratings-header">
        <h2>⭐ Ratings & Feedback Dashboard - {userStream}</h2>
        <div className="header-actions">
          <button onClick={testApiConnection} className="btn-test">
            🔧 Test API Connection
          </button>
          <button onClick={fetchRatingsData} className="btn-refresh" disabled={loading}>
            {loading ? "🔄 Loading..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>⚠️ Access Error (403):</strong> {error}
          <div className="error-help">
            <p><strong>Possible solutions:</strong></p>
            <ul>
              <li>Check if you're logged in with proper PRL role</li>
              <li>Verify backend routes exist: /api/prl/rating and /api/prl/lecturer_class_ratings</li>
              <li>Check backend authentication middleware</li>
              <li>Use "Test API Connection" button above to debug</li>
            </ul>
          </div>
        </div>
      )}

      {!error && (
        <>
          <div className="ratings-controls">
            <div className="date-filter">
              <label>Date Range: </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                placeholder="Start Date"
              />
              <span> to </span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                placeholder="End Date"
              />
            </div>

            {uniqueStreams.length > 0 && (
              <div className="stream-filter">
                <label>Filter by Stream: </label>
                <select 
                  value={filterStream} 
                  onChange={(e) => setFilterStream(e.target.value)}
                >
                  <option value="">All Streams</option>
                  {uniqueStreams.map(stream => (
                    <option key={stream} value={stream}>{stream}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="data-summary">
            <p>
              Found: <strong>{lecturerClassRatings.length}</strong> lecturer self-ratings • 
              <strong> {rating.length}</strong> student ratings • 
              <strong> {allRatings.length}</strong> total ratings
            </p>
          </div>

          <div className="tabs">
            <button 
              className={activeTab === "overview" ? "tab-active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              📊 Overview
            </button>
            <button 
              className={activeTab === "lecturer_class_ratings" ? "tab-active" : ""}
              onClick={() => setActiveTab("lecturer_class_ratings")}
            >
              👨‍🏫 Lecturer Self-Ratings ({lecturerClassRatings.length})
            </button>
            <button 
              className={activeTab === "rating" ? "tab-active" : ""}
              onClick={() => setActiveTab("rating")}
            >
              👥 Student Ratings ({rating.length})
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="tab-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Ratings</h3>
                  <div className="stat-number">{stats.totalRatings}</div>
                  <div className="stat-subtitle">From database</div>
                </div>
                <div className="stat-card">
                  <h3>Average Rating</h3>
                  <div className="stat-number">{stats.averageRating}/5</div>
                  <div className="stat-stars">{renderStars(Math.round(stats.averageRating))}</div>
                </div>
                <div className="stat-card">
                  <h3>Lecturer Self-Ratings</h3>
                  <div className="stat-number">{stats.lecturerClassRatings}</div>
                  <div className="stat-subtitle">From lecturer_class_ratings table</div>
                </div>
                <div className="stat-card">
                  <h3>Student Ratings</h3>
                  <div className="stat-number">{stats.studentRatings}</div>
                  <div className="stat-subtitle">From rating table</div>
                </div>
                <div className="stat-card">
                  <h3>High Ratings (4-5⭐)</h3>
                  <div className="stat-number">{stats.highRatings}</div>
                  <div className="stat-subtitle">{stats.totalRatings > 0 ? Math.round((stats.highRatings / stats.totalRatings) * 100) : 0}%</div>
                </div>
                <div className="stat-card">
                  <h3>Low Ratings (1-2⭐)</h3>
                  <div className="stat-number">{stats.lowRatings}</div>
                  <div className="stat-subtitle">{stats.totalRatings > 0 ? Math.round((stats.lowRatings / stats.totalRatings) * 100) : 0}%</div>
                </div>
              </div>

              {stats.totalRatings > 0 && (
                <div className="distribution-section">
                  <h3>Rating Distribution</h3>
                  <div className="distribution-bars">
                    {[5, 4, 3, 2, 1].map(stars => (
                      <div key={stars} className="distribution-row">
                        <span className="stars-label">{renderStars(stars)}</span>
                        <div className="bar-container">
                          <div 
                            className="bar" 
                            style={{ 
                              width: `${(ratingDistribution[stars] / stats.totalRatings) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <span className="count-label">
                          {ratingDistribution[stars]} 
                          ({stats.totalRatings > 0 ? Math.round((ratingDistribution[stars] / stats.totalRatings) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lecturerPerformance.length > 0 && (
                <div className="lecturer-performance">
                  <h3>Lecturer Performance Summary</h3>
                  <div className="performance-grid">
                    {lecturerPerformance.map(lecturer => (
                      <div key={lecturer.lecturer_id} className="lecturer-card">
                        <h4>{lecturer.lecturer_name}</h4>
                        <p className="lecturer-email">{lecturer.lecturer_email}</p>
                        <div className="lecturer-stats">
                          <div>Average: <strong>{lecturer.average_rating}/5</strong></div>
                          <div>Total Ratings: <strong>{lecturer.total_ratings}</strong></div>
                          <div>Stream: <strong>{lecturer.stream}</strong></div>
                        </div>
                        {lecturer.recent_feedback && (
                          <div className="recent-feedback">
                            <strong>Recent Feedback:</strong> {lecturer.recent_feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "lecturer_class_ratings" && (
            <div className="tab-content">
              <h3>Lecturer Self-Ratings from Database ({filteredLecturerClassRatings.length})</h3>
              <div className="ratings-table-container">
                {filteredLecturerClassRatings.length > 0 ? (
                  <table className="ratings-table">
                    <thead>
                      <tr>
                        <th>Lecturer</th>
                        <th>Class</th>
                        <th>Course</th>
                        <th>Stream</th>
                        <th>Rating</th>
                        <th>Comment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLecturerClassRatings.map((rating) => (
                        <tr key={rating.id}>
                          <td>
                            <div className="lecturer-info">
                              <strong>{rating.lecturer_name}</strong>
                              <div className="email">{rating.lecturer_email}</div>
                            </div>
                          </td>
                          <td>{rating.class_name}</td>
                          <td>
                            <div>
                              <strong>{rating.course_code}</strong>
                              <div>{rating.course_name}</div>
                            </div>
                          </td>
                          <td>{rating.stream}</td>
                          <td>
                            <div className="rating-display">
                              <span className="stars">{renderStars(rating.rating)}</span>
                              <span className="rating-number">({rating.rating}/5)</span>
                            </div>
                          </td>
                          <td className="comment-cell">{rating.comment || "No comment"}</td>
                          <td>{formatDate(rating.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">
                    {lecturerClassRatings.length === 0 
                      ? "No lecturer self-ratings found in the database." 
                      : "No ratings match the current filters."}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rating" && (
            <div className="tab-content">
              <h3>Student Ratings from Database ({filteredRating.length})</h3>
              <div className="ratings-table-container">
                {filteredRating.length > 0 ? (
                  <table className="ratings-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Lecturer</th>
                        <th>Stream</th>
                        <th>Rating</th>
                        <th>Comment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRating.map((rating) => (
                        <tr key={rating.id}>
                          <td>
                            <div className="student-info">
                              <strong>{rating.student_name}</strong>
                              <div className="student-code">{rating.student_code}</div>
                            </div>
                          </td>
                          <td>
                            <div className="lecturer-info">
                              <strong>{rating.lecturer_name}</strong>
                              <div className="email">{rating.lecturer_email}</div>
                            </div>
                          </td>
                          <td>{rating.stream}</td>
                          <td>
                            <div className="rating-display">
                              <span className="stars">{renderStars(rating.rating)}</span>
                              <span className="rating-number">({rating.rating}/5)</span>
                            </div>
                          </td>
                          <td className="comment-cell">{rating.comment || "No comment"}</td>
                          <td>{formatDate(rating.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">
                    {rating.length === 0 
                      ? "No student ratings found in the database." 
                      : "No ratings match the current filters."}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!error && allRatings.length === 0 && (
        <div className="empty-state">
          <h3>📭 No Ratings Data Found</h3>
          <p>No ratings have been submitted yet for your stream ({userStream}).</p>
          <p>Ratings will appear here once lecturers and students start submitting feedback.</p>
        </div>
      )}
    </div>
  );
}

export default PRLRating;
