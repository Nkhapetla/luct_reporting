import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

function Reports() {
  const [form, setForm] = useState({
    faculty_name: "",
    class_name: "",
    week_of_reporting: "",
    date_of_lecture: "",
    course_name: "",
    course_code: "",
    lecturer_name: "",
    actual_students_present: "",
    total_students: "",
    venue: "",
    scheduled_time: "",
    topic: "",
    learning_outcomes: "",
    recommendations: "",
    stream: "",
  });

  const [message, setMessage] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    present: 0,
    absent: 0,
    total: 0
  });
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [submittedReports, setSubmittedReports] = useState([]);
  
  const user = JSON.parse(localStorage.getItem("user"));

  // Create axios instance with useCallback to prevent recreation on every render
  const api = useCallback(() => {
    return axios.create({
      baseURL: "https://luct-reporting-cfvn.onrender.com",
      headers: {
        "x-user-role": user?.role || "",
      },
    });
  }, [user?.role]);

  // Fetch lecturer info and classes - RUNS ONLY ONCE
  useEffect(() => {
    if (user?.id && user?.role === 'lecturer') {
      console.log(" Initial fetch for lecturer:", user.id);
      setLoadingClasses(true);
      
      const fetchData = async () => {
        try {
          // Fetch lecturer details
          const lecturerResponse = await api().get(`/api/lecturer/${user.id}`);
          const lecturer = lecturerResponse.data;
          
          setForm((prev) => ({
            ...prev,
            lecturer_name: lecturer.name || user.name || "",
            faculty_name: lecturer.faculty || "",
            stream: lecturer.stream || "",
          }));

          // Fetch lecturer's classes
          const classesResponse = await api().get(`/api/lecturer/${user.id}/classes`);
          console.log("✅ Classes loaded:", classesResponse.data);
          setClassOptions(classesResponse.data);

          if (classesResponse.data.length === 0) {
            setMessage(" You are not assigned to any classes. Please contact administration.");
          }
        } catch (err) {
          console.error("Error loading data:", err);
          if (err.response?.status === 404) {
            setMessage("❌ No teaching assignments found.");
          } else {
            setMessage("❌ Failed to load data. Please check your connection.");
          }
        } finally {
          setLoadingClasses(false);
        }
      };

      fetchData();
    }
  }, [user?.id, user?.role, api]);

  // When class is selected, fetch its courses
  useEffect(() => {
    if (selectedClass && user?.id) {
      console.log("🔄 Fetching courses for class:", selectedClass);
      setLoadingCourses(true);
      setMessage("");
      
      const fetchCourses = async () => {
        try {
          const response = await api().get(`/api/lecturer/class/${selectedClass}/courses/${user.id}`);
          setCourseOptions(response.data);
          console.log("✅ Courses for class:", response.data);
          
          if (response.data.length === 0) {
            setMessage("⚠️ No courses found for this class.");
          }
        } catch (err) {
          console.error("Error loading courses:", err);
          setMessage("❌ Failed to load courses for this class.");
          setCourseOptions([]);
        } finally {
          setLoadingCourses(false);
        }
      };

      fetchCourses();
    }
  }, [selectedClass, user?.id, api]);

  // When course is selected, fetch attendance data
  useEffect(() => {
    if (selectedClass && selectedCourse && user?.id) {
      console.log(" Fetching attendance for class:", selectedClass, "course:", selectedCourse);
      setLoadingAttendance(true);
      
      const fetchAttendance = async () => {
        try {
          // Fetch attendance data for this class and course
          const response = await api().get(`/api/lecturer/monitoring/${user.id}`);
          console.log("✅ Attendance data:", response.data);
          
          // Filter attendance for selected class and course
          const filteredAttendance = response.data.filter(record => 
            record.class_id.toString() === selectedClass.toString() && 
            record.course_id.toString() === selectedCourse.toString()
          );
          
          setAttendanceData(filteredAttendance);
          
          // Calculate attendance summary
          const presentCount = filteredAttendance.filter(record => record.present === 1).length;
          const absentCount = filteredAttendance.filter(record => record.present === 0).length;
          const totalCount = filteredAttendance.length;
          
          setAttendanceSummary({
            present: presentCount,
            absent: absentCount,
            total: totalCount
          });
          
          // Auto-fill the actual students present field
          setForm(prev => ({
            ...prev,
            actual_students_present: presentCount.toString()
          }));
          
          console.log(` Attendance Summary: ${presentCount} present, ${absentCount} absent, ${totalCount} total`);
          
        } catch (err) {
          console.error("Error loading attendance data:", err);
          setMessage("⚠️ Could not load attendance data. Please enter student count manually.");
        } finally {
          setLoadingAttendance(false);
        }
      };

      fetchAttendance();
    }
  }, [selectedClass, selectedCourse, user?.id, api]);

  // Excel Download Functions
  const downloadAttendanceExcel = async () => {
    if (!attendanceData.length) {
      setMessage("❌ No attendance data available to download.");
      return;
    }

    setDownloadLoading(true);
    try {
      const response = await api().get(`/api/lecturer/attendance/excel/${user.id}`, {
        params: {
          class_id: selectedClass,
          course_id: selectedCourse
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'attendance-report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage("✅ Attendance Excel report downloaded successfully!");

    } catch (error) {
      console.error('Error downloading Excel report:', error);
      setMessage('❌ Failed to download Excel report. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadReportTemplate = async () => {
    setDownloadLoading(true);
    try {
      const response = await api().get(`/api/lecturer/report-template/excel`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lecture-report-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage("✅ Report template downloaded successfully!");

    } catch (error) {
      console.error('Error downloading template:', error);
      setMessage('❌ Failed to download template. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadMyReportsExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await api().get(`/api/lecturer/reports/excel/${user.id}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'my-reports.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage("✅ My reports Excel file downloaded successfully!");

    } catch (error) {
      console.error('Error downloading Excel report:', error);
      setMessage('❌ Failed to download reports. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handle class selection
  const handleClassSelect = (e) => {
    const classId = e.target.value;
    console.log("🎯 Class selected:", classId);
    setSelectedClass(classId);
    setSelectedCourse("");
    setCourseOptions([]);
    setAttendanceData([]);
    setAttendanceSummary({ present: 0, absent: 0, total: 0 });
    setMessage("");

    const classData = classOptions.find(
      (c) => c.class_id.toString() === classId
    );

    if (classData) {
      setForm((prev) => ({
        ...prev,
        class_name: classData.class_name,
        total_students: classData.total_registered,
        faculty_name: classData.faculty,
        // Clear course-specific fields until course is selected
        course_name: "",
        course_code: "",
        venue: "",
        scheduled_time: "",
        stream: classData.stream || prev.stream,
        actual_students_present: "",
      }));
    }
  };

  // Handle course selection
  const handleCourseSelect = (e) => {
    const courseId = e.target.value;
    console.log("🎯 Course selected:", courseId);
    setSelectedCourse(courseId);
    setMessage("");

    const courseData = courseOptions.find(
      (c) => c.course_id.toString() === courseId
    );

    if (courseData) {
      setForm((prev) => ({
        ...prev,
        course_name: courseData.course_name,
        course_code: courseData.course_code,
        venue: courseData.venue,
        scheduled_time: courseData.scheduled_time || "",
        stream: courseData.stream || prev.stream,
        total_students: courseData.total_registered || prev.total_students,
        faculty_name: courseData.faculty || prev.faculty_name,
      }));
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (message) setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Validation
    if (!selectedClass || !selectedCourse) {
      setMessage("❌ Please select both class and course");
      setLoading(false);
      return;
    }

    try {
      await api().post("/api/reports", form);
      setMessage("✅ Report submitted successfully!");

      // Add to submitted reports
      setSubmittedReports(prev => [...prev, { ...form, submittedAt: new Date().toISOString() }]);

      // Reset form but keep basic info
      setForm((prev) => ({
        ...prev,
        week_of_reporting: "",
        date_of_lecture: "",
        actual_students_present: "",
        topic: "",
        learning_outcomes: "",
        recommendations: "",
        scheduled_time: "",
      }));
      
      setSelectedCourse("");
      setSelectedClass("");
      setCourseOptions([]);
      setAttendanceData([]);
      setAttendanceSummary({ present: 0, absent: 0, total: 0 });

    } catch (err) {
      console.error(err);
      setMessage("❌ Submission failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedClass("");
    setSelectedCourse("");
    setCourseOptions([]);
    setAttendanceData([]);
    setAttendanceSummary({ present: 0, absent: 0, total: 0 });
    setForm((prev) => ({
      ...prev,
      class_name: "",
      course_name: "",
      course_code: "",
      venue: "",
      total_students: "",
      week_of_reporting: "",
      date_of_lecture: "",
      actual_students_present: "",
      scheduled_time: "",
      topic: "",
      learning_outcomes: "",
      recommendations: "",
    }));
    setMessage("");
  };

  if (!user || user.role !== 'lecturer') {
    return (
      <div className="reports-container">
        <h2> Lecture Reporting Form</h2>
        <p className="error">❌ Access denied. This page is for lecturers only.</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="header-content">
          <h2> Lecture Reporting Form</h2>
          <p>Welcome, {user.name} ({user.role})</p>
        </div>
        <div className="excel-downloads">
          <button 
            onClick={downloadReportTemplate}
            disabled={downloadLoading}
            className="btn btn-outline-primary btn-sm"
            title="Download Excel template for reporting"
          >
             Download Template
          </button>
          <button 
            onClick={downloadMyReportsExcel}
            disabled={downloadLoading}
            className="btn btn-outline-success btn-sm"
            title="Download all your submitted reports"
          >
             My Reports Excel
          </button>
        </div>
      </div>

      {message && (
        <p className={message.includes("✅") ? "success" : "error"}>{message}</p>
      )}

      <form onSubmit={handleSubmit}>
        {/* Class Selection */}
        <div className="form-group">
          <label>Select Class: *</label>
          <select 
            value={selectedClass} 
            onChange={handleClassSelect}
            required
            disabled={loadingClasses}
          >
            <option value="">-- Select Class --</option>
            {classOptions.map((c, index) => (
              <option key={c.class_id || index} value={c.class_id}>
                {c.class_name} ({c.faculty}) - {c.course_code}
              </option>
            ))}
          </select>
          {loadingClasses && <span className="loading-text">Loading classes...</span>}
        </div>

        {/* Course Selection */}
        <div className="form-group">
          <label>Select Course: *</label>
          <select 
            value={selectedCourse} 
            onChange={handleCourseSelect}
            required
            disabled={!selectedClass || loadingCourses}
          >
            <option value="">-- Select Course --</option>
            {courseOptions.map((c, index) => (
              <option key={c.course_id || index} value={c.course_id}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>
          {loadingCourses && <span className="loading-text">Loading courses...</span>}
        </div>

        {/* Only show the rest if both class and course are selected */}
        {selectedClass && selectedCourse && (
          <>
            {/* Attendance Summary with Excel Download */}
            <div className="attendance-section">
              <div className="attendance-header">
                <h3> Attendance Summary (Auto-filled)</h3>
                <button 
                  onClick={downloadAttendanceExcel}
                  disabled={downloadLoading || !attendanceData.length}
                  className="btn btn-success btn-sm"
                >
                  {downloadLoading ? " Downloading..." : " Excel"}
                </button>
              </div>
              {loadingAttendance ? (
                <div className="loading-text">Loading attendance data...</div>
              ) : (
                <div className="attendance-summary">
                  <div className="attendance-stats">
                    <div className="stat-item present">
                      <span className="stat-label">Present:</span>
                      <span className="stat-value">{attendanceSummary.present}</span>
                    </div>
                    <div className="stat-item absent">
                      <span className="stat-label">Absent:</span>
                      <span className="stat-value">{attendanceSummary.absent}</span>
                    </div>
                    <div className="stat-item total">
                      <span className="stat-label">Total Records:</span>
                      <span className="stat-value">{attendanceSummary.total}</span>
                    </div>
                  </div>
                  
                  {attendanceData.length > 0 && (
                    <div className="attendance-details">
                      <h4>Student Attendance Details:</h4>
                      <div className="students-list">
                        {attendanceData.slice(0, 5).map((record, index) => (
                          <div key={index} className={`student-record ${record.present ? 'present' : 'absent'}`}>
                            <span className="student-name">{record.student_name}</span>
                            <span className={`attendance-status ${record.present ? 'present' : 'absent'}`}>
                              {record.present ? '✅ Present' : '❌ Absent'}
                            </span>
                            <span className="attendance-date">{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                        {attendanceData.length > 5 && (
                          <div className="more-students">
                            + {attendanceData.length - 5} more students...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Read-only fields */}
            <div className="readonly-fields">
              <h3>Class & Course Information</h3>
              
              <div className="form-group">
                <label>Class Name:</label>
                <input value={form.class_name} readOnly />
              </div>

              <div className="form-group">
                <label>Course Name:</label>
                <input value={form.course_name} readOnly />
              </div>

              <div className="form-group">
                <label>Course Code:</label>
                <input value={form.course_code} readOnly />
              </div>

              <div className="form-group">
                <label>Venue:</label>
                <input value={form.venue} readOnly />
              </div>

              <div className="form-group">
                <label>Total Registered Students:</label>
                <input value={form.total_students} readOnly />
              </div>

              <div className="form-group">
                <label>Faculty:</label>
                <input value={form.faculty_name} readOnly />
              </div>

              <div className="form-group">
                <label>Stream:</label>
                <input value={form.stream} readOnly />
              </div>

              <div className="form-group">
                <label>Lecturer Name:</label>
                <input value={form.lecturer_name} readOnly />
              </div>
            </div>

            {/* Editable fields */}
            <div className="editable-fields">
              <h3>Lecture Details</h3>
              
              <div className="form-group">
                <label>Week of Reporting: *</label>
                <input
                  name="week_of_reporting"
                  placeholder="e.g., Week 1, Semester 1"
                  value={form.week_of_reporting}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Date of Lecture: *</label>
                <input
                  type="date"
                  name="date_of_lecture"
                  value={form.date_of_lecture}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Scheduled Time: *</label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={form.scheduled_time}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Actual Students Present: *</label>
                <input
                  type="number"
                  name="actual_students_present"
                  placeholder="Number of students present"
                  value={form.actual_students_present}
                  onChange={handleChange}
                  required
                  min="0"
                  max={form.total_students}
                  disabled={loading}
                />
                <div className="field-hint">
                  Auto-filled from attendance data: {attendanceSummary.present} students marked present
                </div>
              </div>

              <div className="form-group">
                <label>Topic Taught: *</label>
                <input
                  name="topic"
                  placeholder="Topic covered in this lecture"
                  value={form.topic}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Learning Outcomes: *</label>
                <textarea
                  name="learning_outcomes"
                  placeholder="What students should have learned"
                  value={form.learning_outcomes}
                  onChange={handleChange}
                  required
                  disabled={loading}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Recommendations:</label>
                <textarea
                  name="recommendations"
                  placeholder="Any recommendations or follow-up actions"
                  value={form.recommendations}
                  onChange={handleChange}
                  disabled={loading}
                ></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleReset}
                disabled={loading}
                className="reset-btn"
              >
                Reset Form
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="submit-btn"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Submitted Reports Summary */}
      {submittedReports.length > 0 && (
        <div className="submitted-reports">
          <h3>Recently Submitted Reports</h3>
          <div className="reports-summary">
            <p>You have submitted {submittedReports.length} report(s) in this session.</p>
            <button 
              onClick={downloadMyReportsExcel}
              disabled={downloadLoading}
              className="btn btn-success"
            >
              {downloadLoading ? " Generating Excel..." : " Download All My Reports"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
