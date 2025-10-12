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

  const api = useCallback(() => axios.create({
    baseURL: "http://localhost:5000",
    headers: { "x-user-role": user?.role || "" }
  }), [user?.role]);

  // Fetch lecturer info and classes
  useEffect(() => {
    if (!user?.id || user?.role !== 'lecturer') return;

    setLoadingClasses(true);
    const fetchData = async () => {
      try {
        const lecturerResp = await api().get(`/api/lecturer/${user.id}`);
        const lecturer = lecturerResp.data;

        setForm(prev => ({
          ...prev,
          lecturer_name: lecturer.name || user.name || "",
          faculty_name: lecturer.faculty || "",
          stream: lecturer.stream || "",
        }));

        const classesResp = await api().get(`/api/lecturer/${user.id}/classes`);
        setClassOptions(classesResp.data);

        if (!classesResp.data.length) {
          setMessage("ℹ️ You are not assigned to any classes. Contact administration.");
        }

      } catch (err) {
        console.error(err);
        setMessage("❌ Failed to load lecturer/classes data.");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchData();
  }, [user?.id, user?.role, api]);

  // Fetch courses when class is selected
  useEffect(() => {
    if (!selectedClass || !user?.id) return;
    setLoadingCourses(true);
    setMessage("");

    const fetchCourses = async () => {
      try {
        const response = await api().get(`/api/lecturer/class/${selectedClass}/courses/${user.id}`);
        setCourseOptions(response.data || []);
        if (!response.data.length) setMessage("⚠️ No courses found for this class.");
      } catch (err) {
        console.error(err);
        setMessage("❌ Failed to load courses for this class.");
        setCourseOptions([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [selectedClass, user?.id, api]);

  // Fetch attendance when course is selected
  useEffect(() => {
    if (!selectedClass || !selectedCourse || !user?.id) return;
    setLoadingAttendance(true);

    const fetchAttendance = async () => {
      try {
        const response = await api().get(`/api/lecturer/monitoring/${user.id}`);
        const filtered = (response.data || []).filter(r =>
          r.class_id.toString() === selectedClass.toString() &&
          r.course_id.toString() === selectedCourse.toString()
        );

        setAttendanceData(filtered);
        const presentCount = filtered.filter(r => r.present === 1).length;
        const absentCount = filtered.filter(r => r.present === 0).length;
        const totalCount = filtered.length;

        setAttendanceSummary({ present: presentCount, absent: absentCount, total: totalCount });
        setForm(prev => ({ ...prev, actual_students_present: presentCount.toString() }));

      } catch (err) {
        console.error(err);
        setMessage("⚠️ Could not load attendance. Enter student count manually.");
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [selectedClass, selectedCourse, user?.id, api]);

  // Excel Download Utility
  const downloadExcel = async (url, defaultFilename) => {
    setDownloadLoading(true);
    try {
      const response = await api().get(url, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = defaultFilename;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMessage(`✅ ${filename} downloaded successfully!`);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Failed to download ${defaultFilename}`);
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadAttendanceExcel = () => downloadExcel(`/api/lecturer/attendance/excel/${user.id}?class_id=${selectedClass}&course_id=${selectedCourse}`, 'attendance-report.xlsx');
  const downloadReportTemplate = () => downloadExcel('/api/lecturer/report-template/excel', 'lecture-report-template.xlsx');
  const downloadMyReportsExcel = () => downloadExcel(`/api/lecturer/reports/excel/${user.id}`, 'my-reports.xlsx');

  const handleClassSelect = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedCourse("");
    setCourseOptions([]);
    setAttendanceData([]);
    setAttendanceSummary({ present: 0, absent: 0, total: 0 });
    setMessage("");

    const cls = classOptions.find(c => c.class_id.toString() === classId.toString());
    if (cls) {
      setForm(prev => ({
        ...prev,
        class_name: cls.class_name,
        total_students: cls.total_registered,
        faculty_name: cls.faculty,
        course_name: "",
        course_code: "",
        venue: "",
        scheduled_time: "",
        stream: cls.stream || prev.stream,
        actual_students_present: "",
      }));
    }
  };

  const handleCourseSelect = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    setMessage("");

    const course = courseOptions.find(c => c.course_id.toString() === courseId.toString());
    if (course) {
      setForm(prev => ({
        ...prev,
        course_name: course.course_name,
        course_code: course.course_code,
        venue: course.venue,
        scheduled_time: course.scheduled_time || "",
        stream: course.stream || prev.stream,
        total_students: course.total_registered || prev.total_students,
        faculty_name: course.faculty || prev.faculty_name,
      }));
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (message) setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!selectedClass || !selectedCourse) {
      setMessage("❌ Please select both class and course");
      setLoading(false);
      return;
    }

    try {
      await api().post("/api/reports", form);
      setMessage("✅ Report submitted successfully!");
      setSubmittedReports(prev => [...prev, { ...form, submittedAt: new Date().toISOString() }]);
      setForm(prev => ({
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
    setForm(prev => ({
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
        <h2>📝 Lecture Reporting Form</h2>
        <p className="error">❌ Access denied. This page is for lecturers only.</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* The rest of your form UI here, same as your current JSX */}
      {/* Just call the download functions as implemented */}
    </div>
  );
}

export default Reports;
