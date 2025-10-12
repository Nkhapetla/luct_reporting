import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const API_BASE = "https://luct-reporting-cfvn.onrender.com";

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
  const headers = { "x-user-role": user.role || "" };

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [classesRes, classCoursesRes, coursesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/classes`, { headers }),
        axios.get(`${API_BASE}/api/class-courses`, { headers }),
        axios.get(`${API_BASE}/api/courses`, { headers })
      ]);

      setClasses(classesRes.data || []);
      setAllCourses(coursesRes.data || []);

      const classMap = {};
      classCoursesRes.data.forEach(mapping => {
        if (!classMap[mapping.class_id]) classMap[mapping.class_id] = [];
        classMap[mapping.class_id].push(mapping);
      });
      setClassCourses(classMap);

    } catch (err) {
      console.error(err);
      setError("Failed to load classes data.");
      setClasses([]);
      setClassCourses({});
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshTrigger]);

  const enhancedClasses = useMemo(() => {
    return classes.map(cls => {
      const mappings = classCourses[cls.id] || [];
      const courses = mappings.map(m => {
        const course = allCourses.find(c => c.id === m.course_id);
        return course ? { ...course, ...m } : null;
      }).filter(Boolean);

      const streamCourses = filterStream ? courses.filter(c => c.stream === filterStream) : courses;

      return {
        ...cls,
        courses,
        stream_courses: streamCourses,
        total_courses_count: courses.length,
        stream_courses_count: streamCourses.length,
        total_students: cls.total_registered || 0
      };
    });
  }, [classes, classCourses, allCourses, filterStream]);

  // Filter classes by stream
  const filteredClasses = useMemo(() => {
    if (!filterStream) return enhancedClasses;
    return enhancedClasses.filter(cls => cls.courses.some(c => c.stream === filterStream));
  }, [enhancedClasses, filterStream]);

  const uniqueStreams = useMemo(() => {
    const streams = enhancedClasses.flatMap(cls => cls.courses.map(c => c.stream).filter(Boolean));
    return [...new Set(streams)].sort();
  }, [enhancedClasses]);

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
  const clearFilter = () => setFilterStream("");
  const toggleClassExpansion = (id) => setExpandedClass(expandedClass === id ? null : id);

  if (loading) return <div>Loading classes and courses...</div>;
  if (error) return <div>Error: {error} <button onClick={handleRefresh}>Retry</button></div>;

  return (
    <div>
      {/* Stream filter, statistics, and class cards logic here */}
    </div>
  );
}

export default Classes;
