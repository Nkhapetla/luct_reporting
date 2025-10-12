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
      
      const [classesResponse, classCoursesResponse, coursesResponse] = await Promise.all([
        axios.get("https://luct-reporting-cfvn.onrender.com/api/classes", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/class-courses", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", {
          headers: { "x-user-role": userRole },
          timeout: 10000
        })
      ]);
      
      console.log(`✅ Found ${classesResponse.data.length} classes`);
      console.log(`✅ Found ${classCoursesResponse.data.length} class-course mappings`);
      console.log(`✅ Found ${coursesResponse.data.length} courses`);
      
      setClasses(classesResponse.data || []);
      setAllCourses(coursesResponse.data || []);
      
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

  const enhancedClasses = useMemo(() => {
    return classes.map(cls => {
      const classCourseMappings = classCourses[cls.id] || [];
      
      const courses = classCourseMappings.map(mapping => {
        const course = allCourses.find(c => c.id === mapping.course_id);
        return course ? {
          ...course,
          lecturer_id: mapping.lecturer_id,
          lecturer_name: mapping.lecturer_name,
          mapping_id: mapping.id
        } : null;
      }).filter(Boolean);

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

  const filteredClasses = useMemo(() => {
    if (!filterStream) return enhancedClasses;
    
    return enhancedClasses.filter(cls => cls.courses.some(course => course.stream === filterStream));
  }, [enhancedClasses, filterStream]);

  const uniqueStreams = useMemo(() => {
    const allStreams = enhancedClasses.flatMap(cls => 
      cls.courses.map(course => course.stream).filter(Boolean)
    );
    return [...new Set(allStreams)].sort();
  }, [enhancedClasses]);

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
      {/* ... rest of your JSX as in original code ... */}
    </div>
  );
}

export default Classes;
