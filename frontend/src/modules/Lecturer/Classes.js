import React, { useState, useEffect } from "react";
import axios from "axios";

function Classes() {
  const [teachingData, setTeachingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLecturerTeachingData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        
        if (!user) {
          setError("Please log in to view your teaching schedule");
          setLoading(false);
          return;
        }

        if (user.role !== "lecturer") {
          setError("This page is for lecturers only");
          setLoading(false);
          return;
        }

        console.log(" Fetching teaching data for lecturer:", user.id);

        // Fetch classes and courses taught by this lecturer
        const response = await axios.get(
          `https://luct-reporting-cfvn.onrender.com/api/lecturer/classes/${user.id}`, 
          {
            headers: { "x-user-role": "lecturer" }
          }
        );

        console.log("✅ Lecturer teaching data:", response.data);
        setTeachingData(response.data || []);
        
      } catch (err) {
        console.error("❌ Error fetching lecturer teaching data:", err);
        if (err.response?.status === 404) {
          setError("No teaching assignments found for your account.");
        } else if (err.response?.data?.error) {
          setError(`Server error: ${err.response.data.error}`);
        } else {
          setError("Failed to load your teaching schedule. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLecturerTeachingData();
  }, []);

  // Group teaching data by class for better organization
  const classesWithCourses = teachingData.reduce((acc, item) => {
    const classId = item.class_id;
    if (!acc[classId]) {
      acc[classId] = {
        class_id: item.class_id,
        class_name: item.class_name,
        faculty: item.faculty,
        total_registered: item.total_registered,
        courses: []
      };
    }
    acc[classId].courses.push({
      course_id: item.course_id,
      course_code: item.course_code,
      course_name: item.course_name,
      stream: item.stream,
      venue: item.venue,
      scheduled_time: item.scheduled_time
    });
    return acc;
  }, {});

  const classArray = Object.values(classesWithCourses);

  if (loading) return <div className="loading">🔄 Loading your teaching schedule...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="classes-container">
      <h2 className="classes-title"> My Teaching Schedule</h2>
      
      {classArray.length === 0 ? (
        <div className="no-classes">
          <p>You are not currently assigned to teach any classes.</p>
        </div>
      ) : (
        <>
          <div className="teaching-summary">
            <p>
              You are teaching <strong>{classArray.length}</strong> class{classArray.length !== 1 ? 'es' : ''} 
              with <strong>{teachingData.length}</strong> course{teachingData.length !== 1 ? 's' : ''} in total
            </p>
          </div>
          
          <div className="classes-grid">
            {classArray.map((classItem) => (
              <div key={classItem.class_id} className="class-card">
                <div className="class-header">
                  <h3 className="class-name">{classItem.class_name}</h3>
                  <span className="class-faculty">{classItem.faculty}</span>
                </div>
                
                <div className="class-details">
                  <div className="class-info">
                    <span className="info-label">Total Students:</span>
                    <span className="info-value">{classItem.total_registered} enrolled</span>
                  </div>
                  
                  <div className="class-info">
                    <span className="info-label">Courses Teaching:</span>
                    <span className="info-value">{classItem.courses.length} course{classItem.courses.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Courses for this class */}
                <div className="courses-section">
                  <h4 className="courses-title">Courses in this Class:</h4>
                  <div className="courses-list">
                    {classItem.courses.map((course) => (
                      <div key={course.course_id} className="course-item">
                        <div className="course-header">
                          <h5 className="course-name">{course.course_name}</h5>
                          <span className="course-code">{course.course_code}</span>
                        </div>
                        <div className="course-details">
                          <div className="course-info">
                            <span className="info-label">Stream:</span>
                            <span className="info-value">{course.stream || "General"}</span>
                          </div>
                          <div className="course-info">
                            <span className="info-label">Venue:</span>
                            <span className="info-value">{course.venue || "TBA"}</span>
                          </div>
                          <div className="course-info">
                            <span className="info-label">Schedule:</span>
                            <span className="info-value">{course.scheduled_time || "To be scheduled"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Classes;
