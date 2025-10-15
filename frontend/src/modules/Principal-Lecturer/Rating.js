import React, { useState, useEffect } from "react";
import axios from "axios";

function LecturerClassRating() {
  const [classes, setClasses] = useState([]);
  const [allCourses, setAllCourses] = useState([]); // All lecturer courses
  const [classCourses, setClassCourses] = useState([]); // Courses for selected class
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    class_id: "",
    course_id: "",
    rating: "",
    comment: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch data only once when component mounts
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (!user) {
          setError("Please log in to submit ratings");
          setLoadingData(false);
          return;
        }

        if (user.role !== "lecturer") {
          setError("This feature is for lecturers only");
          setLoadingData(false);
          return;
        }

        console.log("🔄 Fetching data for lecturer:", user.id);
        setLoadingData(true);

        // Create API instance inside useEffect
        const api = axios.create({
          baseURL: "https://luct-reporting-cfvn.onrender.com",
          headers: {
            "x-user-role": user.role || "",
          },
        });

        // Fetch classes and courses in parallel
        const [classesResponse, coursesResponse] = await Promise.all([
          api.get(`/api/lecturer/classes/${user.id}`),
          api.get(`/api/lecturer/courses/${user.id}`)
        ]);

        if (isMounted) {
          console.log("✅ Lecturer classes:", classesResponse.data);
          console.log("✅ Lecturer courses:", coursesResponse.data);
          
          setClasses(classesResponse.data || []);
          setAllCourses(coursesResponse.data || []); // Store all courses
          setError(null);
        }
        
      } catch (err) {
        if (isMounted) {
          console.error("❌ Error fetching data:", err);
          if (err.response) {
            setError(`Server error: ${err.response.status} - ${err.response.data.error}`);
          } else if (err.request) {
            setError("Cannot connect to backend server. Make sure it's running on port 5000.");
          } else {
            setError("Failed to load your data. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.role]);

  // Fetch courses for selected class only when class changes
  useEffect(() => {
    let isMounted = true;

    const fetchCoursesForClass = async () => {
      if (!form.class_id || !user?.id) {
        // If no class selected, clear class-specific courses
        if (isMounted) {
          setClassCourses([]);
        }
        return;
      }

      setLoading(true);
      try {
        console.log("🔄 Fetching courses for class:", form.class_id);

        const api = axios.create({
          baseURL: "https://luct-reporting-cfvn.onrender.com",
          headers: {
            "x-user-role": user.role || "",
          },
        });

        const response = await api.get(
          `/api/lecturer/class/${form.class_id}/courses/${user.id}`
        );

        if (isMounted) {
          console.log("✅ Courses for class:", response.data);
          setClassCourses(response.data || []); // Store class-specific courses separately
        }
        
      } catch (err) {
        if (isMounted) {
          console.error("❌ Error fetching courses for class:", err);
          setClassCourses([]); // Clear class courses on error
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCoursesForClass();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [form.class_id, user?.id, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      // If class changes, reset course_id
      if (name === "class_id") {
        return { ...prev, class_id: value, course_id: "" };
      }
      return { ...prev, [name]: value };
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please log in to submit a rating");
      return;
    }

    if (!form.course_id || !form.rating) {
      setError("Please select a course and provide a rating");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const api = axios.create({
        baseURL: "https://luct-reporting-cfvn.onrender.com",
        headers: {
          "x-user-role": user.role || "",
        },
      });

      const ratingData = {
        lecturer_id: user.id,
        class_id: form.class_id || null, // Allow null if no class selected
        course_id: form.course_id,
        rating: parseInt(form.rating),
        comment: form.comment || ""
      };

      console.log("⭐ Submitting class rating:", ratingData);

      const response = await api.post("/api/lecturer/class-rating", ratingData);

      console.log("✅ Class rating submitted:", response.data);
      
      alert("Class rating submitted successfully! ✅");
      
      // Reset form
      setForm({ 
        class_id: "", 
        course_id: "",
        rating: "", 
        comment: "" 
      });
      
    } catch (err) {
      console.error("❌ Class rating submission error:", err);
      
      if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`);
      } else if (err.request) {
        setError("Cannot connect to backend server.");
      } else {
        setError(`Failed to submit rating: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine which courses to show
  const availableCourses = form.class_id ? classCourses : allCourses;
  
  // Get selected class and course details
  const selectedClass = classes.find(cls => cls.class_id?.toString() === form.class_id?.toString());
  const selectedCourse = availableCourses.find(course => 
    course.course_id?.toString() === form.course_id?.toString() || 
    course.id?.toString() === form.course_id?.toString()
  );

  const getRatingText = (rating) => {
    const ratings = {
      "1": "Poor",
      "2": "Fair", 
      "3": "Good",
      "4": "Very Good",
      "5": "Excellent"
    };
    return ratings[rating] || "Unknown";
  };

  // Group classes by class_id for the dropdown
  const uniqueClasses = Array.from(new Map(classes.map(cls => [cls.class_id, cls])).values());

  if (loadingData) {
    return (
      <div className="rating-container">
        <div className="loading">🔄 Loading your teaching data...</div>
      </div>
    );
  }

  return (
    <div className="rating-container">
      <h2 className="rating-title">⭐ Rate Your Teaching Experience</h2>
      
      <div className="rating-info">
        <p>As a lecturer, you can rate your teaching experience for specific classes and courses.</p>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rating-form">
        {/* Class Selection (Optional) */}
        <div className="form-group">
          <label htmlFor="class_id">Select Class (Optional):</label>
          <select 
            id="class_id"
            name="class_id" 
            value={form.class_id} 
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">-- All Classes --</option>
            {uniqueClasses.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name}
              </option>
            ))}
          </select>
          <div className="form-hint">
            {form.class_id ? "Showing courses for selected class" : "Showing all your courses"}
          </div>
        </div>

        {/* Course Selection */}
        <div className="form-group">
          <label htmlFor="course_id">Select Course: *</label>
          <select 
            id="course_id"
            name="course_id" 
            value={form.course_id} 
            onChange={handleChange}
            required
            disabled={loading || (form.class_id && classCourses.length === 0)}
          >
            <option value="">-- Select Course --</option>
            {availableCourses.map((course) => (
              <option 
                key={course.course_id || course.id} 
                value={course.course_id || course.id}
              >
                {course.course_code} - {course.course_name}
                {course.class_name && ` (${course.class_name})`}
              </option>
            ))}
          </select>
          {loading && <div className="loading-text">Loading courses...</div>}
          {form.class_id && classCourses.length === 0 && !loading && (
            <div className="form-hint">No courses found for this class</div>
          )}
          {!form.class_id && allCourses.length === 0 && (
            <div className="form-hint">No courses assigned to you</div>
          )}
        </div>

        {/* Class & Course Details */}
        {(selectedClass || selectedCourse) && (
          <div className="class-details">
            <h4>Teaching Assignment Details:</h4>
            <div className="details-grid">
              {selectedClass && (
                <>
                  <div><strong>Class:</strong> {selectedClass.class_name}</div>
                  {selectedClass.faculty && <div><strong>Faculty:</strong> {selectedClass.faculty}</div>}
                </>
              )}
              {selectedCourse && (
                <>
                  <div><strong>Course:</strong> {selectedCourse.course_name}</div>
                  <div><strong>Code:</strong> {selectedCourse.course_code}</div>
                  {selectedCourse.stream && <div><strong>Stream:</strong> {selectedCourse.stream}</div>}
                  {selectedCourse.venue && <div><strong>Venue:</strong> {selectedCourse.venue}</div>}
                  {selectedCourse.scheduled_time && <div><strong>Schedule:</strong> {selectedCourse.scheduled_time}</div>}
                </>
              )}
            </div>
          </div>
        )}

        {/* Rating Selection */}
        <div className="form-group">
          <label htmlFor="rating">Teaching Experience Rating (1-5): *</label>
          <select
            id="rating"
            name="rating"
            value={form.rating}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">-- Select Rating --</option>
            <option value="1">1 ⭐ - Very Difficult/Poor</option>
            <option value="2">2 ⭐⭐ - Challenging/Fair</option>
            <option value="3">3 ⭐⭐⭐ - Average/Good</option>
            <option value="4">4 ⭐⭐⭐⭐ - Smooth/Very Good</option>
            <option value="5">5 ⭐⭐⭐⭐⭐ - Excellent/Outstanding</option>
          </select>
          {form.rating && (
            <div className="rating-preview">
              Selected: {getRatingText(form.rating)} ({form.rating} stars)
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="form-group">
          <label htmlFor="comment">Teaching Feedback:</label>
          <textarea
            id="comment"
            name="comment"
            placeholder="How was your experience teaching this class? Student engagement, challenges faced, what worked well..."
            rows="4"
            value={form.comment}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading || !form.course_id || !form.rating}
        >
          {loading ? "Submitting Rating..." : "Submit Rating"}
        </button>
      </form>

      {classes.length === 0 && allCourses.length === 0 && !error && !loadingData && (
        <div className="no-classes">
          <p>You are not currently assigned to teach any classes or courses.</p>
        </div>
      )}
    </div>
  );
}

export default LecturerClassRating;
