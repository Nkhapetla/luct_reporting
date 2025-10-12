import React, { useEffect, useState } from "react";
import axios from "axios";
import SearchBar from "../../components/SearchBar";

function Monitoring() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // TRACK IF USER HAS SEARCHED

  const backendURL = "https://luct-reporting-cfvn.onrender.com/api";

  // IMPROVED SEARCH HANDLER
  const handleSearch = async (query, filter) => {
    setSearchLoading(true);
    setHasSearched(true); // MARK THAT USER HAS PERFORMED A SEARCH
    
    try {
      // If search is empty, show all courses
      if (!query && !filter) {
        setFilteredCourses(courses);
        setSearchLoading(false);
        return;
      }

      const response = await axios.get(`${backendURL}/search/courses`, {
        params: { 
          q: query,
          stream: filter 
        },
        headers: {
          "x-user-role": "student",
          "Content-Type": "application/json",
        },
      });
      
      // Filter courses to only show those relevant to the student
      const studentRelevantCourses = response.data.filter(course => 
        courses.some(studentCourse => studentCourse.course_id === course.id)
      );
      
      setFilteredCourses(studentRelevantCourses);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to client-side filtering
      const filtered = courses.filter(course => 
        course.course_name?.toLowerCase().includes(query.toLowerCase()) ||
        course.course_code?.toLowerCase().includes(query.toLowerCase()) ||
        course.lecturer_name?.toLowerCase().includes(query.toLowerCase()) ||
        course.venue?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCourses(filtered);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log("🔄 Starting to fetch courses...");

        const userStr = localStorage.getItem("user");
        if (!userStr) {
          console.error("❌ No user found in localStorage");
          setError("No logged-in user found.");
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        console.log("👤 User data:", user);

        if (!user?.id) {
          console.error("❌ Invalid user ID");
          setError("Invalid user data.");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${backendURL}/student/classes/${user.id}`,
          {
            headers: {
              "x-user-role": "student",
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ API Response:", response.data);
        const data = response.data || [];
        setCourses(data);
        setFilteredCourses(data); // INITIALIZE FILTERED COURSES

        // Initialize attendance state
        const initialAttendance = {};
        data.forEach((course) => {
          initialAttendance[course.course_id] = course.present === 1;
        });
        setAttendance(initialAttendance);
        
      } catch (err) {
        console.error("❌ Full error details:", err);
        setError(`Failed to load courses: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Handle attendance toggle (keep your existing function)
  const handleAttendance = async (course) => {
    // ... your existing attendance function ...
  };

  // GET USER STREAM FOR FILTERS
  const getUserStream = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.stream;
  };

  // FILTER OPTIONS
  const monitoringFilters = [
    { value: 'Information Systems', label: 'Information Systems' },
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Software Engineering', label: 'Software Engineering' }
  ].filter(filter => filter.value === getUserStream());

  if (loading) return <div className="loading">🔄 Loading your courses...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="student-monitoring-container">
      <h2> Student Monitoring</h2>
      
      {/* IMPROVED SEARCH BAR */}
      <SearchBar 
        placeholder="Search courses by name, code, lecturer, or venue..."
        onSearch={handleSearch}
        filters={monitoringFilters}
        loading={searchLoading}
        debounceDelay={500} // SLIGHTLY LONGER DEBOUNCE
      />

      {/* IMPROVED SEARCH RESULTS INFO */}
      {hasSearched && (
        <div className="search-results-info">
          <strong>
            {filteredCourses.length} of {courses.length} courses
            {filteredCourses.length === 0 ? " - No matches found" : " matching your search"}
          </strong>
        </div>
      )}

      {/* IMPROVED NO RESULTS MESSAGE */}
      {hasSearched && filteredCourses.length === 0 && courses.length > 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h4>No courses found</h4>
          <p>Try adjusting your search terms or filters</p>
        </div>
      )}

      {filteredCourses.length === 0 && !hasSearched ? (
        <div className="no-courses-message">
          <p>No courses found.</p>
          {courses.length === 0 && (
            <p className="info-note">You are not enrolled in any courses yet.</p>
          )}
        </div>
      ) : (
        <table className="student-monitoring-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Lecturer</th>
              <th>Venue</th>
              <th>Time</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course, index) => (
              <tr key={`${course.course_id}-${course.class_id || index}`}>
                <td>{course.course_code || "-"}</td>
                <td>{course.course_name || "-"}</td>
                <td>{course.lecturer_name || "-"}</td>
                <td>{course.venue || "-"}</td>
                <td>{course.scheduled_time || "-"}</td>
                <td>
                  <button
                    onClick={() => handleAttendance(course)}
                    disabled={updating[course.course_id]}
                    className={`attendance-btn ${
                      attendance[course.course_id] ? "present" : "absent"
                    }`}
                  >
                    {updating[course.course_id]
                      ? "🔄 Updating..."
                      : attendance[course.course_id]
                      ? "✅ Present"
                      : " Mark Present"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Your existing styles... */}
    </div>
  );
}

export default Monitoring;
