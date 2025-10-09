// =====================
// Rating.js (Simplified with Single Search)
// =====================
import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchBar from "../../components/SearchBar";

function Rating() {
  const [lecturers, setLecturers] = useState([]);
  const [userRatings, setUserRatings] = useState([]);
  const [filteredRatings, setFilteredRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    lecturer_id: "",
    rating: "",
    comment: "",
  });

  // ✅ Load user once on mount
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // SINGLE SEARCH HANDLER FOR PREVIOUS RATINGS
  const handleRatingSearch = async (query, filter) => {
    setSearchLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/search/ratings", {
        params: { 
          q: query,
          lecturer: filter,
          minRating: filter === 'high' ? 4 : filter === 'low' ? 1 : undefined,
          maxRating: filter === 'low' ? 2 : undefined
        },
        headers: { "x-user-role": "student" }
      });
      setFilteredRatings(response.data);
    } catch (error) {
      console.error("Rating search error:", error);
      // Fallback to client-side filtering
      const filtered = userRatings.filter(rating => 
        rating.lecturer_name?.toLowerCase().includes(query.toLowerCase()) ||
        (rating.comment && rating.comment.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredRatings(filtered);
    } finally {
      setSearchLoading(false);
    }
  };

  // ✅ Fetch data once on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lecturers for the dropdown
        const lecRes = await axios.get("http://localhost:5000/api/lecturers");
        setLecturers(lecRes.data);
      } catch (err) {
        console.error("Error fetching lecturers:", err);
        alert("Failed to load lecturers");
      }

      // Fetch user's previous ratings (only if logged in)
      if (user?.id) {
        try {
          const ratingRes = await axios.get(
            `http://localhost:5000/api/student/ratings/${user.id}`,
            { headers: { "x-user-role": "student" } }
          );
          setUserRatings(ratingRes.data);
          setFilteredRatings(ratingRes.data); // INITIALIZE FILTERED RATINGS
        } catch (err) {
          console.error("Error fetching user ratings:", err);
        }
      }
    };

    fetchData();
  }, []);

  // ----------------------------
  // Form Handlers
  // ----------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please log in to submit a rating");
      return;
    }

    if (!formData.lecturer_id || !formData.rating) {
      alert("Please select a lecturer and provide a rating");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/student/rating",
        {
          student_id: user.id,
          lecturer_id: formData.lecturer_id,
          rating: parseInt(formData.rating),
          comment: formData.comment,
        },
        { headers: { "x-user-role": "student" } }
      );

      alert(`Rating ${response.data.action} successfully!`);
      setFormData({ lecturer_id: "", rating: "", comment: "" });

      // Refresh ratings
      const res = await axios.get(
        `http://localhost:5000/api/student/ratings/${user.id}`,
        { headers: { "x-user-role": "student" } }
      );
      setUserRatings(res.data);
      setFilteredRatings(res.data); // UPDATE FILTERED RATINGS TOO
    } catch (err) {
      console.error("Rating submission error:", err);
      alert(
        `Failed to submit rating: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Helper: Get previous rating for a lecturer
  // ----------------------------
  const getPreviousRating = (lecturerId) => {
    const existingRating = userRatings.find(
      (rating) => rating.lecturer_id === lecturerId
    );
    return existingRating ? ` (Your rating: ${existingRating.rating}/5)` : "";
  };

  // ----------------------------
  // Star Rating Display Component
  // ----------------------------
  const StarRating = ({ rating }) => (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? "star filled" : "star"}>
          {star <= rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );

  // SIMPLIFIED FILTER OPTIONS - ONLY FOR RATINGS SEARCH
  const ratingFilters = [
    { value: 'high', label: 'High Ratings (4-5)' },
    { value: 'low', label: 'Low Ratings (1-2)' },
    { value: 'with_comments', label: 'With Comments' }
  ];

  // ----------------------------
  // Render UI
  // ----------------------------
  return (
    <div className="student-rating-container">
      <h2>⭐ Rate Your Lecturers</h2>

      {/* New Rating Form - NO SEARCH BAR HERE */}
      <div className="rating-form-section">
        <h3>Submit New Rating</h3>

        <form onSubmit={handleSubmit} className="student-rating-form">
          <div className="form-group">
            <label htmlFor="lecturer_id">Select Lecturer:</label>
            <select
              id="lecturer_id"
              name="lecturer_id"
              value={formData.lecturer_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Lecturer --</option>
              {lecturers.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  {lec.name} - {lec.faculty}
                  {getPreviousRating(lec.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rating">Rating (1-5):</label>
            <div className="rating-input-container">
              <input
                id="rating"
                type="number"
                name="rating"
                placeholder="Enter rating 1-5"
                min="1"
                max="5"
                value={formData.rating}
                onChange={handleChange}
                required
              />
              <div className="rating-hint">
                <small>1 = Poor, 5 = Excellent</small>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="comment">Comment (Optional):</label>
            <textarea
              id="comment"
              name="comment"
              placeholder="Share your feedback about this lecturer..."
              rows="4"
              value={formData.comment}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </form>
      </div>

      {/* Display user's previous ratings WITH SINGLE SEARCH BAR */}
      {userRatings.length > 0 ? (
        <div className="previous-ratings-section">
          <h3>Your Previous Ratings</h3>
          
          {/* SINGLE SEARCH BAR FOR RATINGS */}
          <SearchBar 
            placeholder="Search your ratings by lecturer name or comments..."
            onSearch={handleRatingSearch}
            filters={ratingFilters}
            loading={searchLoading}
          />

          {/* SEARCH RESULTS INFO */}
          {filteredRatings.length !== userRatings.length && (
            <div className="search-results-info">
              <small>
                Showing {filteredRatings.length} of {userRatings.length} ratings
                {filteredRatings.length === 0 && " - No matches found"}
              </small>
            </div>
          )}

          <div className="ratings-list">
            {filteredRatings.length === 0 ? (
              <div className="no-ratings-message">
                <p>No ratings found matching your search.</p>
              </div>
            ) : (
              filteredRatings.map((rating) => (
                <div key={rating.id} className="rating-item">
                  <div className="rating-header">
                    <strong>{rating.lecturer_name}</strong>
                    <div className="rating-display">
                      <StarRating rating={rating.rating} />
                      <span className="rating-score">{rating.rating}/5</span>
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="rating-comment">"{rating.comment}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="no-ratings">
          <p>You haven't rated any lecturers yet.</p>
        </div>
      )}

      {/* ENHANCED STYLING */}
      <style>{`
        .student-rating-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .rating-form-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #e9ecef;
        }
        
        .previous-ratings-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .search-results-info {
          margin: 10px 0;
          padding: 8px 12px;
          background: #e3f2fd;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
          font-size: 14px;
        }
        
        .no-ratings-message {
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }
        
        .student-rating-form {
          margin-top: 15px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }
        
        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }
        
        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .rating-input-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .rating-input-container input {
          width: 80px;
        }
        
        .rating-hint {
          color: #666;
          font-size: 12px;
        }
        
        .submit-button {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background-color 0.3s ease;
        }
        
        .submit-button:hover {
          background: #45a049;
        }
        
        .submit-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .ratings-list {
          margin-top: 15px;
        }
        
        .rating-item {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 10px;
          background: white;
          transition: box-shadow 0.3s ease;
        }
        
        .rating-item:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .rating-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .rating-display {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .star-rating {
          color: #ffc107;
          font-size: 18px;
        }
        
        .rating-score {
          font-weight: bold;
          color: #333;
          font-size: 14px;
        }
        
        .rating-comment {
          margin: 0;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          font-style: italic;
          color: #555;
        }
        
        .no-ratings {
          text-align: center;
          padding: 40px 20px;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
      `}</style>
    </div>
  );
}

export default Rating;