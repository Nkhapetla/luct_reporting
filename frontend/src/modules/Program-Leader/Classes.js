import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

function Classes() {
  const [classes, setClasses] = useState([]);
  const [classCourses, setClassCourses] = useState({});
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStream, setFilterStream] = useState("");
  const [expandedClass, setExpandedClass] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "";

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🏫 Fetching all classes and courses data...");
      
      // Fetch classes, class-courses mappings, and courses in parallel
      const [classesResponse, classCoursesResponse, coursesResponse] = await Promise.all([
        axios.get("http://localhost:5000/api/classes", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        }),
        axios.get("http://localhost:5000/api/class-courses", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        }),
        axios.get("http://localhost:5000/api/courses", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        })
      ]);
      
      console.log(`✅ Found ${classesResponse.data.length} classes`);
      console.log(`✅ Found ${classCoursesResponse.data.length} class-course mappings`);
      console.log(`✅ Found ${coursesResponse.data.length} courses`);
      
      setClasses(classesResponse.data || []);
      setAllCourses(coursesResponse.data || []);
      
      // Process class-courses mappings
      const classCoursesMap = {};
      classCoursesResponse.data.forEach(mapping => {
        if (!classCoursesMap[mapping.class_id]) {
          classCoursesMap[mapping.class_id] = [];
        }
        classCoursesMap[mapping.class_id].push(mapping);
      });
      
      setClassCourses(classCoursesMap);
      
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Failed to load classes data. Please try again.");
      setClasses([]);
      setClassCourses({});
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshTrigger]);

  // Enhance classes with their courses
  const enhancedClasses = useMemo(() => {
    return classes.map(cls => {
      const classCourseMappings = classCourses[cls.id] || [];
      
      // Get all courses for this class
      const courses = classCourseMappings.map(mapping => {
        const course = allCourses.find(c => c.id === mapping.course_id);
        return course ? {
          ...course,
          lecturer_id: mapping.lecturer_id,
          lecturer_name: mapping.lecturer_name,
          mapping_id: mapping.id
        } : null;
      }).filter(Boolean);

      // Calculate statistics
      const streamCourses = filterStream 
        ? courses.filter(course => course.stream === filterStream)
        : courses;

      return {
        ...cls,
        courses: courses,
        stream_courses: streamCourses,
        total_courses_count: courses.length,
        stream_courses_count: streamCourses.length,
        total_students: cls.total_registered || 0
      };
    });
  }, [classes, classCourses, allCourses, filterStream]);

  // Filter classes based on selected stream
  const filteredClasses = useMemo(() => {
    if (!filterStream) return enhancedClasses;
    
    return enhancedClasses.filter(cls => {
      // Include class if it has courses from the filtered stream
      return cls.courses.some(course => course.stream === filterStream);
    });
  }, [enhancedClasses, filterStream]);

  // Get unique streams for filter
  const uniqueStreams = useMemo(() => {
    const allStreams = enhancedClasses.flatMap(cls => 
      cls.courses.map(course => course.stream).filter(Boolean)
    );
    return [...new Set(allStreams)].sort();
  }, [enhancedClasses]);

  // Statistics
  const statistics = useMemo(() => {
    const totalCourses = filteredClasses.reduce((sum, cls) => sum + cls.total_courses_count, 0);
    const totalStreamCourses = filteredClasses.reduce((sum, cls) => sum + cls.stream_courses_count, 0);
    
    return {
      totalClasses: filteredClasses.length,
      totalStudents: filteredClasses.reduce((sum, cls) => sum + (cls.total_students || 0), 0),
      totalCourses: totalCourses,
      streamCourses: totalStreamCourses,
      uniqueStreams: uniqueStreams.length,
      selectedStream: filterStream || "All Streams"
    };
  }, [filteredClasses, uniqueStreams, filterStream]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  const clearFilter = () => {
    setFilterStream("");
  };

  const toggleClassExpansion = (classId) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading classes and courses data...</p>
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
    <div className="classes-container">
      <div className="section-header">
        <h2 className="classes-title">🏫 All Classes & Courses</h2>
        <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stream Filter */}
      <div className="filter-section">
        <div className="filter-controls">
          <label htmlFor="stream-filter">
            <strong>Filter by Stream:</strong>
          </label>
          <select 
            id="stream-filter"
            value={filterStream} 
            onChange={(e) => setFilterStream(e.target.value)}
            className="filter-select"
          >
            <option value="">All Streams ({enhancedClasses.length} classes)</option>
            {uniqueStreams.map(stream => {
              const streamClassCount = enhancedClasses.filter(cls => 
                cls.courses.some(course => course.stream === stream)
              ).length;
              return (
                <option key={stream} value={stream}>
                  {stream} ({streamClassCount} classes)
                </option>
              );
            })}
          </select>
          {filterStream && (
            <button onClick={clearFilter} className="clear-filter-button">
              Clear Filter
            </button>
          )}
        </div>
        
        <div className="filter-info">
          <p>
            Showing <strong>{filteredClasses.length}</strong> of <strong>{enhancedClasses.length}</strong> classes
            {filterStream && ` with courses in ${filterStream}`}
          </p>
        </div>
      </div>

      {/* Statistics */}
      {enhancedClasses.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏫</div>
            <div className="stat-content">
              <h3>{statistics.totalClasses}</h3>
              <p>Classes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{statistics.totalStudents}</h3>
              <p>Students</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{statistics.totalCourses}</h3>
              <p>Total Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{filterStream ? statistics.streamCourses : statistics.uniqueStreams}</h3>
              <p>{filterStream ? 'Stream Courses' : 'Streams'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Classes List */}
      {filteredClasses.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">🏫</div>
          <p>No classes found{filterStream ? ` with courses in ${filterStream}` : ""}.</p>
          {filterStream && (
            <button onClick={clearFilter} className="retry-button">
              View All Classes
            </button>
          )}
        </div>
      ) : (
        <div className="classes-grid">
          {filteredClasses.map((cls) => (
            <ClassCard 
              key={cls.id} 
              classData={cls} 
              isExpanded={expandedClass === cls.id}
              onToggle={() => toggleClassExpansion(cls.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Class Card Component
const ClassCard = ({ classData, isExpanded, onToggle }) => {
  const isOverCapacity = classData.total_students > classData.capacity;
  const hasCourses = classData.courses.length > 0;
  
  // Get unique streams in this class
  const classStreams = [...new Set(classData.courses.map(course => course.stream).filter(Boolean))];
  
  return (
    <div className="class-card">
      <div className="class-header">
        <h3>{classData.class_name || "Unnamed Class"}</h3>
        <div className="class-badges">
          {classStreams.length > 0 && (
            <span className="streams-count">
              🌊 {classStreams.length} stream{classStreams.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="student-count">
            👥 {classData.total_students} students
          </span>
          <span className="courses-count">
            📚 {classData.total_courses_count} course{classData.total_courses_count !== 1 ? 's' : ''}
          </span>
          {isOverCapacity && (
            <span className="capacity-warning">⚠️ Over Capacity</span>
          )}
        </div>
      </div>
      
      <div className="class-details">
        {/* Basic Class Information */}
        <div className="detail-item">
          <strong>Class ID:</strong> {classData.class_code || classData.id}
        </div>

        {classData.faculty && (
          <div className="detail-item">
            <strong>Faculty:</strong> {classData.faculty}
          </div>
        )}

        {/* Capacity Information */}
        {classData.capacity && (
          <div className="detail-item">
            <strong>Capacity:</strong>
            <span className={`capacity ${isOverCapacity ? 'over-capacity' : 'within-capacity'}`}>
              {classData.total_students}/{classData.capacity}
              {isOverCapacity && <span className="warning-text"> (Over capacity!)</span>}
            </span>
          </div>
        )}

        {/* Streams in this class */}
        {classStreams.length > 0 && (
          <div className="detail-item">
            <strong>Streams:</strong>
            <div className="streams-list">
              {classStreams.map(stream => (
                <span key={stream} className="stream-tag">{stream}</span>
              ))}
            </div>
          </div>
        )}

        {/* Courses Section */}
        <div className="courses-section">
          <div className="courses-header" onClick={onToggle} style={{cursor: 'pointer'}}>
            <strong>
              Courses ({classData.courses.length}) 
              <span className="toggle-icon">
                {isExpanded ? '▼' : '►'}
              </span>
            </strong>
          </div>
          
          {isExpanded && (
            <div className="courses-list-expanded">
              {hasCourses ? (
                classData.courses.map((course, index) => (
                  <div key={course.mapping_id || index} className="course-item">
                    <div className="course-main-info">
                      <span className="course-name">{course.course_name}</span>
                      <span className="course-code">({course.course_code})</span>
                    </div>
                    <div className="course-details">
                      {course.stream && (
                        <span className="course-stream">Stream: {course.stream}</span>
                      )}
                      {course.lecturer_name && (
                        <span className="course-lecturer">Lecturer: {course.lecturer_name}</span>
                      )}
                      {course.venue && (
                        <span className="course-venue">Venue: {course.venue}</span>
                      )}
                      {course.scheduled_time && (
                        <span className="course-time">Time: {course.scheduled_time}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-courses-message">
                  No courses assigned to this class
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Class Status Footer */}
      <div className="class-footer">
        <div className="class-status">
          <span className={`status-indicator ${hasCourses ? 'active' : 'inactive'}`}>
            {hasCourses ? '✅ Has Courses' : '⏸️ No Courses'}
          </span>
        </div>
        <button 
          onClick={onToggle}
          className="toggle-courses-button"
        >
          {isExpanded ? 'Hide Courses' : 'Show Courses'}
        </button>
      </div>
    </div>
  );
};

export default Classes;