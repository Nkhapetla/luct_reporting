import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userStream = user.stream || "All Streams";

  useEffect(() => {
    const fetchPRLCourses = async () => {
      try {
        setLoading(true);
        
        console.log("📚 PRL fetching courses with lecturer data...");
        
        // First try the PRL courses endpoint that includes lecturer names
        const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/courses", {
          headers: { "x-user-role": "pl" }
        });
        
        // Filter by PRL's stream if available and valid
        let filteredCourses = user.stream 
          ? response.data.filter(course => course.stream === user.stream)
          : response.data;

        console.log(`✅ Found ${filteredCourses.length} courses for PRL`);
        setCourses(filteredCourses || []);
      } catch (err) {
        console.error("❌ Error fetching PRL courses:", err);
        
        // Fallback: try the regular courses endpoint and fetch lecturer names
        try {
          console.log("🔄 Trying fallback to regular courses endpoint...");
          const fallbackResponse = await axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", {
            headers: { "x-user-role": "pl" }
          });
          
          let filteredCourses = user.stream 
            ? fallbackResponse.data.filter(course => course.stream === user.stream)
            : fallbackResponse.data;

          // Fetch lecturer names for courses that have lecturer_id
          const coursesWithLecturers = await Promise.all(
            filteredCourses.map(async (course) => {
              if (course.lecturer_id) {
                try {
                  const lecturerResponse = await axios.get(
                    `https://luct-reporting-cfvn.onrender.com/api/lecturer/${course.lecturer_id}`,
                    { headers: { "x-user-role": "pl" } }
                  );
                  return {
                    ...course,
                    lecturer_name: lecturerResponse.data.name
                  };
                } catch (lecturerErr) {
                  console.error(`Error fetching lecturer ${course.lecturer_id}:`, lecturerErr);
                  return {
                    ...course,
                    lecturer_name: null
                  };
                }
              }
              return course;
            })
          );

          setCourses(coursesWithLecturers || []);
        } catch (fallbackErr) {
          console.error("❌ Fallback also failed:", fallbackErr);
          setError("Failed to load courses");
          setCourses([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPRLCourses();
  }, [user.stream]);

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="prl-section">
      <h2>📚 Courses Management</h2>
      <div className="section-info">
        <p>Viewing all courses in {userStream}</p>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.id} className="course-card">
            <div className="course-header">
              <h3>{course.course_name || "Unnamed Course"}</h3>
              <span className="course-code">{course.course_code || "No Code"}</span>
            </div>
            <div className="course-details">
              <div className="detail-item">
                <strong>Stream:</strong> {course.stream || "All Streams"}
              </div>
              <div className="detail-item lecturer-info">
                <strong>Lecturer:</strong> 
                <div className="lecturer-details">
                  {course.lecturer_name ? (
                    <span className="lecturer-name">{course.lecturer_name}</span>
                  ) : course.lecturer_id ? (
                    <span className="lecturer-id-only">Loading lecturer name...</span>
                  ) : (
                    <span className="no-lecturer">Not assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="no-data">
          <p>No courses found for {userStream}.</p>
        </div>
      )}
    </div>
  );
}

export default PRLCourses;
