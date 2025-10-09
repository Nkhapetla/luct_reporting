import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLRating() {
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "lecturer_class_ratings", "rating"
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
      console.log("⭐ PRL fetching ratings for stream:", userStream);

      // Fetch from both tables using correct endpoints with proper headers
      const [lecturerClassResponse, ratingResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/prl/lecturer_class_ratings", {
          headers: { 
            "x-user-role": userRole,
            "x-user-stream": userStream 
          },
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        }).catch((err) => {
          console.error("❌ Lecturer class ratings fetch error:", err.response?.data || err.message);
          return { data: [] };
        }),
        
        axios.get("http://localhost:5000/api/prl/rating", {
          headers: { 
            "x-user-role": userRole,
            "x-user-stream": userStream 
          },
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        }).catch((err) => {
          console.error("❌ Rating fetch error:", err.response?.data || err.message);
          return { data: [] };
        })
      ]);

      setLecturerClassRatings(lecturerClassResponse.data || []);
      setRating(ratingResponse.data || []);

    } catch (err) {
      console.error("❌ Error fetching ratings data:", err);
      setError("Failed to load ratings. Using demo data for preview.");
      
      // Demo data
      setLecturerClassRatings(getDemoLecturerClassRatings());
      setRating(getDemoRating());
    } finally {
      setLoading(false);
    }
  };

  // Demo data for lecturer_class_ratings table
  const getDemoLecturerClassRatings = () => [
    {
      id: 1,
      lecturer_id: 28,
      lecturer_name: "Dr. Smith",
      lecturer_email: "smith@university.edu",
      class_id: 11,
      class_name: "CS-3A",
      course_id: 21,
      course_name: "Advanced Programming",
      course_code: "CS401",
      stream: "Computer Science",
      rating: 4,
      comment: "Excellent teaching methods and clear explanations",
      created_at: "2025-10-06 12:09:23"
    },
    {
      id: 2,
      lecturer_id: 26,
      lecturer_name: "Prof. Johnson",
      lecturer_email: "johnson@university.edu",
      class_id: 3,
      class_name: "IT-2B",
      course_id: 2,
      course_name: "Data Structures",
      course_code: "CS302",
      stream: "Computer Science",
      rating: 2,
      comment: "Class pace was too fast, difficult to follow",
      created_at: "2025-10-07 15:30:14"
    }
  ];

  // Demo data for rating table
  const getDemoRating = () => [
    {
      id: 13,
      student_id: 31,
      student_name: "John Doe",
      student_code: "CS001",
      lecturer_id: 28,
      lecturer_name: "Dr. Smith",
      lecturer_email: "smith@university.edu",
      stream: "Computer Science",
      rating: 4,
      comment: "Very helpful and knowledgeable in advanced topics",
      created_at: "2025-10-04 20:06:26"
    },
    {
      id: 14,
      student_id: 32,
      student_name: "Jane Smith",
      student_code: "CS002",
      lecturer_id: 26,
      lecturer_name: "Prof. Johnson",
      lecturer_email: "johnson@university.edu",
      stream: "Computer Science",
      rating: 5,
      comment: "Best lecturer in the department, very approachable",
      created_at: "2025-10-05 09:15:42"
    }
  ];

  // Combine all ratings for overview
  const allRatings = [...lecturerClassRatings, ...rating];

  // Filter data based on stream and date range
  const filterData = (data) => {
    let filtered = data;
    
    // Filter by stream
    if (filterStream) {
      filtered = filtered.filter(item => item.stream === filterStream);
    }
    
    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(item => item.created_at >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => item.created_at <= dateRange.end);
    }
    
    return filtered;
  };

  const filteredLecturerClassRatings = filterData(lecturerClassRatings);
  const filteredRating = filterData(rating);
  const filteredAllRatings = filterData(allRatings);

  // Get unique streams for filter
  const uniqueStreams = [...new Set(allRatings.map(item => item.stream).filter(Boolean))];

  // Calculate statistics for overview
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

  // Get lecturer performance summary
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

    // Calculate averages
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

  if (loading) return <div className="loading">Loading ratings data...</div>;

  return (
    <div className="prl-ratings">
      <h2>⭐ Ratings & Feedback - {userStream}</h2>
      
      <div className="ratings-controls">
        {/* Date Range Filter */}
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

        {/* Stream Filter */}
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

        <button onClick={fetchRatingsData} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Rest of your component remains the same... */}
      {/* ... (keep all the tab content from your previous component) ... */}
    </div>
  );
}

export default PRLRating;