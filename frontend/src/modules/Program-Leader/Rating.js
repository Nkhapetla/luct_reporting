import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function Rating() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterLecturer, setFilterLecturer] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState("all");

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "";

  const getHeaders = () => {
    return {
      "x-user-role": userRole,
      "Content-Type": "application/json"
    };
  };

  // Fetch and combine all ratings data
  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("⭐ Fetching ratings data from multiple sources...");

      // Fetch all necessary data
      let lecturersData = [];
      let studentsData = [];
      let coursesData = [];
      let classesData = [];

      try {
        const lecturersRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/lecturers", { headers: getHeaders() });
        lecturersData = lecturersRes.data;
        console.log("✅ Loaded lecturers data");
      } catch (err) {
        console.log("❌ Lecturers endpoint error:", err.message);
      }

      try {
        const studentsRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/students", { headers: getHeaders() });
        studentsData = studentsRes.data;
        console.log("✅ Loaded students data");
      } catch (err) {
        console.log("❌ Students endpoint error:", err.message);
      }

      try {
        const coursesRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", { headers: getHeaders() });
        coursesData = coursesRes.data;
        console.log("✅ Loaded courses data");
      } catch (err) {
        console.log("❌ Courses endpoint error:", err.message);
      }

      try {
        const classesRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/classes", { headers: getHeaders() });
        classesData = classesRes.data;
        console.log("✅ Loaded classes data");
      } catch (err) {
        console.log("❌ Classes endpoint error:", err.message);
      }

      // Try to fetch from the PRL ratings endpoints
      let studentRatings = [];
      let lecturerRatings = [];

      try {
        // Use PRL rating endpoint
        const studentRatingsRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/rating", { headers: getHeaders() });
        studentRatings = studentRatingsRes.data;
        console.log(`✅ Found ${studentRatings.length} student ratings from /api/prl/rating`);
      } catch (err) {
        console.log("❌ /api/prl/rating endpoint not available:", err.message);
      }

      try {
        // Use PRL lecturer class ratings endpoint
        const lecturerRatingsRes = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/lecturer_class_ratings", { headers: getHeaders() });
        lecturerRatings = lecturerRatingsRes.data;
        console.log(`✅ Found ${lecturerRatings.length} lecturer ratings from /api/prl/lecturer_class_ratings`);
      } catch (err) {
        console.log("❌ /api/prl/lecturer_class_ratings endpoint not available:", err.message);
      }

      // Process student ratings (from rating table)
      const processedStudentRatings = studentRatings.map(rating => {
        return {
          id: `student_${rating.id}`,
          type: 'student',
          student_id: rating.student_id,
          student_name: rating.student_name || `Student ${rating.student_id}`,
          lecturer_id: rating.lecturer_id,
          lecturer_name: rating.lecturer_name || `Lecturer ${rating.lecturer_id}`,
          rating: rating.rating,
          comment: rating.comment || '',
          created_at: rating.created_at,
          date: rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'N/A',
          stream: rating.student_stream || rating.lecturer_stream || 'Unknown'
        };
      });

      // Process lecturer ratings (from lecturer_class_ratings table)
      const processedLecturerRatings = lecturerRatings.map(rating => {
        return {
          id: `lecturer_${rating.id}`,
          type: 'lecturer',
          lecturer_id: rating.lecturer_id,
          lecturer_name: rating.lecturer_name || `Lecturer ${rating.lecturer_id}`,
          course_id: rating.course_id,
          course_name: rating.course_name || `Course ${rating.course_id || 'Unknown'}`,
          course_code: rating.course_code,
          class_id: rating.class_id,
          class_name: rating.class_name,
          rating: rating.rating,
          comment: rating.comment || '',
          created_at: rating.created_at,
          date: rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'N/A',
          stream: rating.course_stream || rating.lecturer_stream || 'Unknown'
        };
      });

      // Combine all ratings
      const allRatings = [...processedStudentRatings, ...processedLecturerRatings];
      
      console.log(`✅ Processed ${allRatings.length} total ratings`);
      console.log(`📊 Student ratings: ${processedStudentRatings.length}`);
      console.log(`📊 Lecturer ratings: ${processedLecturerRatings.length}`);
      setRatings(allRatings);
      
    } catch (err) {
      console.error("❌ Error fetching ratings data:", err);
      setError("Failed to load ratings data. Please check if the API endpoints are available.");
      setRatings([]);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings, refreshTrigger]);

  // Get unique values for filters and statistics
  const { uniqueLecturers, uniqueCourses, totalRatings, averageRating, ratingDistribution } = useMemo(() => {
    const lecturers = [...new Set(ratings.map(r => r.lecturer_name).filter(Boolean))].sort();
    const courses = [...new Set(ratings.map(r => r.course_name).filter(Boolean))].sort();
    
    // Calculate rating statistics
    const total = ratings.length;
    const average = total > 0 
      ? (ratings.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0) / total).toFixed(1)
      : 0;
    
    const distribution = [1, 2, 3, 4, 5].map(stars => ({
      stars,
      count: ratings.filter(r => Math.round(parseFloat(r.rating || 0)) === stars).length,
      percentage: total > 0 ? (ratings.filter(r => Math.round(parseFloat(r.rating || 0)) === stars).length / total * 100).toFixed(1) : 0
    }));

    return {
      uniqueLecturers: lecturers,
      uniqueCourses: courses,
      totalRatings: total,
      averageRating: average,
      ratingDistribution: distribution
    };
  }, [ratings]);

  // Filter ratings based on selected filters and view mode
  const filteredRatings = useMemo(() => {
    let filtered = ratings;
    
    // Filter by view mode
    if (viewMode === "lecturers") {
      filtered = filtered.filter(r => r.type === 'lecturer');
    } else if (viewMode === "students") {
      filtered = filtered.filter(r => r.type === 'student');
    }
    
    if (filterLecturer) {
      filtered = filtered.filter(r => r.lecturer_name === filterLecturer);
    }
    
    if (filterCourse) {
      filtered = filtered.filter(r => r.course_name === filterCourse);
    }
    
    if (filterRating) {
      const ratingValue = parseInt(filterRating);
      filtered = filtered.filter(r => Math.round(parseFloat(r.rating || 0)) === ratingValue);
    }
    
    return filtered;
  }, [ratings, viewMode, filterLecturer, filterCourse, filterRating]);

  // Calculate lecturer statistics
  const lecturerStats = useMemo(() => {
    const lecturerMap = new Map();
    
    ratings.forEach(rating => {
      if (!rating.lecturer_name) return;
      
      if (!lecturerMap.has(rating.lecturer_name)) {
        lecturerMap.set(rating.lecturer_name, {
          lecturer_name: rating.lecturer_name,
          lecturer_id: rating.lecturer_id,
          total_ratings: 0,
          total_score: 0,
          average_rating: 0,
          courses: new Set(),
          recent_ratings: []
        });
      }
      
      const lecturer = lecturerMap.get(rating.lecturer_name);
      lecturer.total_ratings++;
      lecturer.total_score += parseFloat(rating.rating || 0);
      lecturer.average_rating = lecturer.total_score / lecturer.total_ratings;
      
      if (rating.course_name) {
        lecturer.courses.add(rating.course_name);
      }
      
      if (lecturer.recent_ratings.length < 3) {
        lecturer.recent_ratings.push({
          rating: rating.rating,
          comment: rating.comment,
          student_name: rating.student_name,
          course_name: rating.course_name,
          date: rating.created_at
        });
      }
    });
    
    return Array.from(lecturerMap.values())
      .map(lecturer => ({
        ...lecturer,
        courses_count: lecturer.courses.size,
        courses: Array.from(lecturer.courses)
      }))
      .sort((a, b) => b.average_rating - a.average_rating);
  }, [ratings]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  const clearFilters = () => {
    setFilterLecturer("");
    setFilterCourse("");
    setFilterRating("");
    setViewMode("all");
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const numericRating = parseFloat(rating || 0);
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= numericRating ? 'filled' : ''}`}
        >
          {i <= numericRating ? '⭐' : '☆'}
        </span>
      );
    }
    
    return <div className="star-rating">{stars}</div>;
  };

  // Get rating color based on value
  const getRatingColor = (rating) => {
    const numericRating = parseFloat(rating || 0);
    if (numericRating >= 4.5) return 'excellent';
    if (numericRating >= 4.0) return 'very-good';
    if (numericRating >= 3.0) return 'good';
    if (numericRating >= 2.0) return 'fair';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading ratings data...</p>
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
    <div className="rating-container">
      <div className="section-header">
        <div className="header-content">
          <h2>⭐ Ratings & Feedback</h2>
          <p className="section-subtitle">
            Viewing all ratings across all streams
          </p>
        </div>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{totalRatings}</h3>
            <p>Total Ratings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>{averageRating}</h3>
            <p>Avg Rating</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{uniqueLecturers.length}</h3>
            <p>Lecturers Rated</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{uniqueCourses.length}</h3>
            <p>Courses Rated</p>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      {ratings.length > 0 && (
        <div className="rating-distribution">
          <h3>Rating Distribution</h3>
          <div className="distribution-bars">
            {ratingDistribution.map((dist) => (
              <div key={dist.stars} className="distribution-item">
                <div className="stars">{renderStars(dist.stars)}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ width: `${dist.percentage}%` }}
                  ></div>
                </div>
                <div className="count">{dist.count} ({dist.percentage}%)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          📋 All Ratings
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'lecturers' ? 'active' : ''}`}
          onClick={() => setViewMode('lecturers')}
        >
          👨‍🏫 Lecturer Overview
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'students' ? 'active' : ''}`}
          onClick={() => setViewMode('students')}
        >
          👥 Student Feedback
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
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
          <label htmlFor="course-filter">Course:</label>
          <select 
            id="course-filter"
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="filter-select"
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="rating-filter">Rating:</label>
          <select 
            id="rating-filter"
            value={filterRating} 
            onChange={(e) => setFilterRating(e.target.value)}
            className="filter-select"
          >
            <option value="">All Ratings</option>
            <option value="5">⭐ 5 Stars</option>
            <option value="4">⭐ 4 Stars</option>
            <option value="3">⭐ 3 Stars</option>
            <option value="2">⭐ 2 Stars</option>
            <option value="1">⭐ 1 Star</option>
          </select>
        </div>

        {(filterLecturer || filterCourse || filterRating || viewMode !== 'all') && (
          <button onClick={clearFilters} className="clear-filter">
            Clear All
          </button>
        )}

        <div className="results-info">
          Showing {filteredRatings.length} of {ratings.length} ratings
        </div>
      </div>

      {/* Lecturer Overview */}
      {viewMode === 'lecturers' && lecturerStats.length > 0 && (
        <div className="lecturer-overview">
          <h3>📈 Lecturer Performance Overview</h3>
          <div className="lecturer-grid">
            {lecturerStats.map((lecturer, index) => (
              <div key={lecturer.lecturer_name} className="lecturer-card">
                <div className="lecturer-header">
                  <h4>{lecturer.lecturer_name}</h4>
                  <div className={`rating-badge ${getRatingColor(lecturer.average_rating)}`}>
                    {lecturer.average_rating.toFixed(1)} ⭐
                  </div>
                </div>
                <div className="lecturer-stats">
                  <div className="stat">
                    <span className="stat-value">{lecturer.total_ratings}</span>
                    <span className="stat-label">Ratings</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{lecturer.courses_count}</span>
                    <span className="stat-label">Courses</span>
                  </div>
                </div>
                {lecturer.courses.length > 0 && (
                  <div className="courses-taught">
                    <strong>Courses:</strong> {lecturer.courses.join(', ')}
                  </div>
                )}
                {lecturer.recent_ratings.length > 0 && (
                  <div className="recent-feedback">
                    <strong>Recent Feedback:</strong>
                    {lecturer.recent_ratings.map((feedback, idx) => (
                      <div key={idx} className="feedback-item">
                        {renderStars(feedback.rating)} - {feedback.comment || 'No comment'}
                        {feedback.student_name && (
                          <div className="student-name">- {feedback.student_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Ratings & Student Feedback */}
      {(viewMode === 'all' || viewMode === 'students') && (
        <div className="ratings-table-container">
          <table className="ratings-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Lecturer</th>
                <th>Course</th>
                <th>Student</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredRatings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data-cell">
                    <div className="no-data-message">
                      <div className="no-data-icon">⭐</div>
                      <p>No ratings found</p>
                      <p className="info-note">
                        {filterLecturer || filterCourse || filterRating 
                          ? "Try adjusting your filters" 
                          : "Ratings will appear here when students and lecturers submit feedback"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRatings.map((rating) => (
                  <RatingRow key={rating.id} rating={rating} renderStars={renderStars} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {ratings.length === 0 && !loading && (
        <div className="no-data">
          <div className="no-data-icon">⭐</div>
          <p>No ratings data available</p>
          <p className="info-note">
            Ratings will appear here when students and lecturers submit feedback.
          </p>
        </div>
      )}
    </div>
  );
}

// Rating Row Component
const RatingRow = ({ rating, renderStars }) => {
  return (
    <tr className="rating-row">
      <td>
        <div className="rating-display">
          {renderStars(rating.rating)}
          <div className={`rating-value ${rating.rating >= 4 ? 'high' : rating.rating >= 3 ? 'medium' : 'low'}`}>
            {parseFloat(rating.rating || 0).toFixed(1)}
          </div>
        </div>
      </td>
      <td>
        <div className="lecturer-info">
          <strong>{rating.lecturer_name || 'Not specified'}</strong>
        </div>
      </td>
      <td>
        <div className="course-info">
          <strong>{rating.course_name || 'General Rating'}</strong>
          {rating.course_code && (
            <div className="course-code">{rating.course_code}</div>
          )}
        </div>
      </td>
      <td>
        <div className="student-info">
          {rating.student_name || (rating.type === 'student' ? 'Anonymous Student' : 'N/A')}
        </div>
      </td>
      <td>
        <div className="comment-text">
          {rating.comment || <span className="no-comment">No comment provided</span>}
        </div>
      </td>
      <td>
        <div className="rating-date">
          {rating.date}
        </div>
      </td>
      <td>
        <span className={`type-badge ${rating.type}`}>
          {rating.type === 'student' ? '👥 Student' : '👨‍🏫 Lecturer'}
        </span>
      </td>
    </tr>
  );
};

export default Rating;
