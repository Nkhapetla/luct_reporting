import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://luct-reporting-cfvn.onrender.com";

function PRLReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // "summary", "view", "create"
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [newReport, setNewReport] = useState({
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
    stream: ""
  });

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userStream = user.stream || "All Streams";

  const headers = {
    "x-user-role": user.role || "pl",
    "x-user-stream": user.stream || "",
    "Content-Type": "application/json"
  };

  useEffect(() => {
    fetchReports();
    if (activeTab === "create") fetchCoursesAndClasses();
  }, [user.stream, activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/prl/reports`, { headers });
      setReports(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursesAndClasses = async () => {
    try {
      const [coursesRes, classesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/courses`, { headers }),
        axios.get(`${API_BASE}/api/classes`, { headers })
      ]);
      setCourses(user.stream ? coursesRes.data.filter(c => c.stream === user.stream) : coursesRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadExcel = async (url, filename) => {
    setDownloadLoading(true);
    try {
      const res = await axios.get(`${API_BASE}${url}`, { headers, responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setSuccessMessage(`✅ ${filename} downloaded successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to download Excel.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const submitFeedback = async (reportId) => {
    if (!feedback.trim()) return alert("Enter feedback.");
    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/api/prl/feedback`, {
        report_id: reportId,
        feedback,
        prl_id: user.id
      }, { headers });
      setSuccessMessage("Feedback submitted!");
      setFeedback("");
      fetchReports();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const createReport = async (e) => {
    e.preventDefault();
    if (!newReport.course_name || !newReport.class_name || !newReport.lecturer_name) {
      return alert("Course, Class, and Lecturer are required.");
    }
    try {
      setSubmitting(true);
      const reportData = {
        ...newReport,
        stream: user.stream,
        faculty_name: user.faculty || user.stream,
        week_of_reporting: newReport.week_of_reporting || `Week ${new Date().getWeek()}`,
        date_of_lecture: newReport.date_of_lecture || new Date().toISOString().split("T")[0]
      };
      await axios.post(`${API_BASE}/api/reports`, reportData, { headers });
      setSuccessMessage("Report created!");
      setNewReport({
        faculty_name: "", class_name: "", week_of_reporting: "", date_of_lecture: "",
        course_name: "", course_code: "", lecturer_name: "", actual_students_present: "",
        total_students: "", venue: "", scheduled_time: "", topic: "", learning_outcomes: "",
        recommendations: "", stream: ""
      });
      setActiveTab("view");
      fetchReports();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to create report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport(prev => ({ ...prev, [name]: value }));
  };

  const handleCourseSelect = (courseId) => {
    const course = courses.find(c => c.id == courseId);
    if (course) setNewReport(prev => ({ ...prev, course_name: course.course_name, course_code: course.course_code, stream: course.stream, venue: course.venue || prev.venue, scheduled_time: course.scheduled_time || prev.scheduled_time }));
  };

  const handleClassSelect = (className) => setNewReport(prev => ({ ...prev, class_name: className }));

  Date.prototype.getWeek = function () {
    const date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const calculateSummary = () => {
    if (!reports.length) return {};
    const totalReports = reports.length;
    const totalStudents = reports.reduce((sum, r) => sum + (r.total_students || 0), 0);
    const totalPresent = reports.reduce((sum, r) => sum + (r.actual_students_present || 0), 0);
    const averageAttendance = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0;
    const feedbackGiven = reports.filter(r => r.prl_feedback).length;
    const lecturersCount = new Set(reports.map(r => r.lecturer_name)).size;
    const coursesCount = new Set(reports.map(r => r.course_name)).size;
    const classesCount = new Set(reports.map(r => r.class_name)).size;
    return { totalReports, totalStudents, totalPresent, averageAttendance, feedbackGiven, feedbackRate: totalReports > 0 ? ((feedbackGiven / totalReports) * 100).toFixed(1) : 0, lecturersCount, coursesCount, classesCount };
  };

  const summary = calculateSummary();

  if (loading && activeTab === "view") return <div>Loading reports...</div>;

  return (
    <div className="prl-section">
      {/* Tabs, summary cards, report tables, create form, feedback modal, Excel download buttons */}
      {/* Use the state and functions above for all interactions */}
    </div>
  );
}

export default PRLReports;
