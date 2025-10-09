import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function PRLClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userStream = user.stream || "All Streams";

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🏫 PRL fetching classes for stream:", userStream);
      
      // Use the PRL classes endpoint - it should already filter by stream
      const response = await axios.get("http://localhost:5000/api/prl/classes", {
        headers: { "x-user-role": "pl" },
        timeout: 10000
      });
      
      console.log("📦 Raw data from API:", response.data);
      
      // Since the backend should already filter by PRL's stream, use all returned classes
      let filteredClasses = response.data || [];

      // If for some reason backend doesn't filter, do a simple frontend filter
      if (user.stream && user.stream !== "All Streams") {
        filteredClasses = response.data.filter(cls => {
          // Check if class has stream field that matches
          if (cls.stream === user.stream) return true;
          
          // Check if class has courses array with matching stream
          if (cls.courses && Array.isArray(cls.courses)) {
            return cls.courses.some(course => course.stream === user.stream);
          }
          
          // If no stream info, include the class (let backend handle filtering)
          return true;
        });
      }

      console.log(`✅ Displaying ${filteredClasses.length} classes for ${userStream}`);
      
      // Enhance classes with additional information for display
      const enhancedClasses = filteredClasses.map(cls => ({
        ...cls,
        // Ensure we have all required fields with defaults
        class_name: cls.class_name || "Unnamed Class",
        faculty: cls.faculty || "Not specified",
        total_registered: cls.total_registered || 0,
        capacity: cls.capacity || 0,
        // Calculate course counts
        stream_courses_count: cls.courses ? cls.courses.filter(course => 
          user.stream ? course.stream === user.stream : true
        ).length : 0,
        total_courses_count: cls.courses ? cls.courses.length : 0
      }));

      setClasses(enhancedClasses);
      
    } catch (err) {
      console.error("❌ Error fetching classes:", err);
      
      // Fallback approach if main endpoint fails
      try {
        console.log("🔄 Trying fallback approach...");
        const [classesResponse, classCoursesResponse, coursesResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/classes", { 
            headers: { "x-user-role": "pl" },
            timeout: 10000
          }),
          axios.get("http://localhost:5000/api/class-courses", { 
            headers: { "x-user-role": "pl" },
            timeout: 10000
          }),
          axios.get("http://localhost:5000/api/courses", { 
            headers: { "x-user-role": "pl" },
            timeout: 10000
          })
        ]);

        // Get courses in PRL's stream
        const streamCourses = user.stream 
          ? coursesResponse.data.filter(course => course.stream === user.stream)
          : coursesResponse.data;

        // Find classes that have courses from PRL's stream
        const relevantClassIds = new Set();
        classCoursesResponse.data.forEach(mapping => {
          const isRelevantCourse = streamCourses.some(course => course.id === mapping.course_id);
          if (isRelevantCourse) {
            relevantClassIds.add(mapping.class_id);
          }
        });

        // Filter classes
        let filteredClasses = user.stream 
          ? classesResponse.data.filter(cls => relevantClassIds.has(cls.id))
          : classesResponse.data;

        // Enhance classes with course information
        const enhancedClasses = filteredClasses.map(cls => {
          const classCourseMappings = classCoursesResponse.data.filter(cc => cc.class_id === cls.id);
          
          const allCourseDetails = classCourseMappings.map(cc => {
            const course = coursesResponse.data.find(c => c.id === cc.course_id);
            return course ? {
              ...course,
              lecturer_id: cc.lecturer_id,
              lecturer_name: cc.lecturer_name
            } : null;
          }).filter(Boolean);

          const streamCoursesInClass = allCourseDetails.filter(course => 
            user.stream ? course.stream === user.stream : true
          );

          return {
            ...cls,
            stream_courses: streamCoursesInClass,
            stream_courses_count: streamCoursesInClass.length,
            total_courses_count: allCourseDetails.length,
            courses: allCourseDetails // Add courses array for consistency
          };
        });

        console.log(`✅ Found ${enhancedClasses.length} classes via fallback`);
        setClasses(enhancedClasses);
        
      } catch (fallbackErr) {
        console.error("❌ Fallback also failed:", fallbackErr);
        setError("Failed to load classes. Please check your connection and try again.");
        setClasses([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user.stream, userStream]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses, refreshTrigger]);

  // Statistics calculation
  const statistics = useMemo(() => {
    return {
      totalClasses: classes.length,
      totalStudents: classes.reduce((sum, cls) => sum + (cls.total_registered || 0), 0),
      totalStreamCourses: classes.reduce((sum, cls) => sum + (cls.stream_courses_count || 0), 0),
      totalCourses: classes.reduce((sum, cls) => sum + (cls.total_courses_count || 0), 0)
    };
  }, [classes]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading classes for {userStream}...</p>
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
    <div className="prl-section">
      <div className="section-header">
        <h2>🏫 Classes Management</h2>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="section-info">
        <p>Viewing classes with courses in <strong>{userStream}</strong></p>
        <p className="info-note">
          {user.stream ? `Showing classes that have courses from your stream` : 'Showing all classes'}
        </p>
      </div>

      {/* Statistics */}
      {classes.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏫</div>
            <div className="stat-content">
              <h3>{statistics.totalClasses}</h3>
              <p>Total Classes</p>
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
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{statistics.totalStreamCourses}</h3>
              <p>Stream Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{statistics.totalCourses}</h3>
              <p>Total Courses</p>
            </div>
          </div>
        </div>
      )}

      {/* Classes Grid */}
      <div className="classes-grid">
        {classes.map((cls, index) => (
          <ClassCard key={cls.id || index} classData={cls} userStream={userStream} />
        ))}
      </div>

      {classes.length === 0 && !loading && (
        <div className="no-data">
          <div className="no-data-icon">🏫</div>
          <p>No classes found with courses in {userStream}.</p>
          <p className="info-note">
            Classes will appear here when courses from your stream are assigned to them.
          </p>
          <button onClick={handleRefresh} className="retry-button">
            Check Again
          </button>
        </div>
      )}
    </div>
  );
}

// Class Card Component
const ClassCard = ({ classData, userStream }) => {
  const hasStreamCourses = classData.stream_courses_count > 0;
  const hasCourses = classData.total_courses_count > 0;
  const isOverCapacity = classData.total_registered > classData.capacity;

  // Get stream courses for display
  const streamCourses = classData.stream_courses || 
    (classData.courses ? classData.courses.filter(course => 
      userStream !== "All Streams" ? course.stream === userStream : true
    ) : []);

  // Get other courses for informational display
  const otherCourses = classData.courses ? 
    classData.courses.filter(course => 
      userStream !== "All Streams" ? course.stream !== userStream : false
    ) : [];

  return (
    <div className="class-card">
      <div className="class-header">
        <h3>{classData.class_name}</h3>
        <div className="class-badges">
          <span className="student-count">
            👥 {classData.total_registered} students
          </span>
          {hasStreamCourses && userStream !== "All Streams" && (
            <span className="stream-courses-badge">
              📚 {classData.stream_courses_count} stream course{classData.stream_courses_count !== 1 ? 's' : ''}
            </span>
          )}
          {isOverCapacity && (
            <span className="capacity-warning">⚠️ Over Capacity</span>
          )}
        </div>
      </div>
      
      <div className="class-details">
        <div className="detail-item">
          <strong>Class ID:</strong> {classData.class_code || classData.id}
        </div>
        
        <div className="detail-item">
          <strong>Faculty:</strong> {classData.faculty}
        </div>

        {/* Class Capacity */}
        {classData.capacity > 0 && (
          <div className="detail-item">
            <strong>Capacity:</strong> 
            <span className={`capacity ${isOverCapacity ? 'over-capacity' : 'within-capacity'}`}>
              {classData.total_registered}/{classData.capacity} students
              {isOverCapacity && <span className="warning-text"> (Over capacity!)</span>}
            </span>
          </div>
        )}

        {/* Stream Courses */}
        {hasStreamCourses && streamCourses.length > 0 && (
          <div className="detail-item">
            <strong>{userStream !== "All Streams" ? "Your Stream Courses:" : "Courses:"}</strong> 
            <div className="courses-list">
              {streamCourses.map((course, index) => (
                <div key={index} className="course-item stream-course">
                  <span className="course-name">{course.course_name}</span>
                  <span className="course-code">({course.course_code})</span>
                  {course.lecturer_name && (
                    <span className="lecturer-name"> - {course.lecturer_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Courses (only show if we have specific stream) */}
        {otherCourses.length > 0 && userStream !== "All Streams" && (
          <div className="detail-item">
            <strong>Other Stream Courses:</strong> 
            <div className="other-courses-info">
              <span className="other-courses-count">
                {otherCourses.length} course{otherCourses.length !== 1 ? 's' : ''} from other streams
              </span>
            </div>
          </div>
        )}

        {/* No Courses Assigned */}
        {!hasCourses && (
          <div className="detail-item">
            <strong>Courses:</strong> 
            <span className="no-courses">No courses assigned yet</span>
          </div>
        )}
      </div>

      {/* Class Status Footer */}
      <div className="class-footer">
        <div className="class-status">
          <span className={`status-indicator ${hasStreamCourses ? 'active' : 'inactive'}`}>
            {hasStreamCourses ? '✅ Active' : '⏸️ No Stream Courses'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PRLClasses;