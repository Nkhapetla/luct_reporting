it was reports 


import React, { useState, useEffect } from "react";
import axios from "axios";

function PRLReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // "summary", "view", "create"
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // New report form state
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

  useEffect(() => {
    fetchReports();
    if (activeTab === "create") {
      fetchCoursesAndClasses();
    }
  }, [user.stream, activeTab]);

  const getHeaders = () => ({
    'x-user-role': user.role || 'pl',
    'x-user-stream': user.stream || '',
    'Content-Type': 'application/json'
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 PRL fetching reports for stream:", userStream);

      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/reports", {
        headers: getHeaders()
      });

      console.log(`✅ Found ${response.data.length} reports from backend`);
      setReports(response.data || []);
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError("Failed to load reports from server.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursesAndClasses = async () => {
    try {
      const [coursesResponse, classesResponse] = await Promise.all([
        axios.get("https://luct-reporting-cfvn.onrender.com/api/courses", { headers: getHeaders() }),
        axios.get("https://luct-reporting-cfvn.onrender.com/api/classes", { headers: getHeaders() })
      ]);

      const filteredCourses = user.stream
        ? coursesResponse.data.filter(course => course.stream === user.stream)
        : coursesResponse.data;

      setCourses(filteredCourses);
      setClasses(classesResponse.data);
    } catch (err) {
      console.error("❌ Error fetching courses and classes:", err);
    }
  };

  // Excel Download Functions
  const downloadReportsExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/reports/excel", {
        headers: getHeaders(),
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = "prl-reports.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Excel report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error downloading Excel report:", error);
      setError("❌ Failed to download Excel report. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadSummaryExcel = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get("https://luct-reporting-cfvn.onrender.com/api/prl/reports/summary-excel", {
        headers: getHeaders(),
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reports-summary.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("✅ Summary Excel report downloaded successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error downloading summary Excel:", error);
      setError("❌ Failed to download summary report. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmitFeedback = async (reportId) => {
    if (!feedback.trim()) {
      alert("Please enter feedback before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      await axios.post("https://luct-reporting-cfvn.onrender.com/api/prl/feedback", {
        report_id: reportId,
        feedback: feedback,
        prl_id: user.id
      }, {
        headers: getHeaders()
      });

      setSuccessMessage("Feedback submitted successfully!");
      setFeedback("");
      setSelectedReport(null);

      fetchReports();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error submitting feedback:", err);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();

    if (!newReport.course_name || !newReport.class_name || !newReport.lecturer_name) {
      alert("Please fill in all required fields: Course Name, Class Name, and Lecturer Name.");
      return;
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

      const response = await axios.post("https://luct-reporting-cfvn.onrender.com/api/reports", reportData, {
        headers: getHeaders()
      });

      setSuccessMessage("Report created successfully!");

      setNewReport({
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

      setActiveTab("view");
      fetchReports();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error creating report:", err);
      alert("Failed to create report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCourseSelect = (courseId) => {
    const selectedCourse = courses.find(course => course.id == courseId);
    if (selectedCourse) {
      setNewReport(prev => ({
        ...prev,
        course_name: selectedCourse.course_name,
        course_code: selectedCourse.course_code,
        stream: selectedCourse.stream,
        venue: selectedCourse.venue || prev.venue,
        scheduled_time: selectedCourse.scheduled_time || prev.scheduled_time
      }));
    }
  };

  const handleClassSelect = (className) => {
    setNewReport(prev => ({
      ...prev,
      class_name: className
    }));
  };

  const calculateSummary = () => {
    if (reports.length === 0) return null;

    const totalReports = reports.length;
    const totalStudents = reports.reduce((sum, report) => sum + (report.total_students || 0), 0);
    const totalPresent = reports.reduce((sum, report) => sum + (report.actual_students_present || 0), 0);
    const averageAttendance = totalStudents > 0 
      ? ((totalPresent / totalStudents) * 100).toFixed(1) 
      : 0;

    const lecturers = [...new Set(reports.map(report => report.lecturer_name).filter(Boolean))];
    const coursesCount = [...new Set(reports.map(report => report.course_name).filter(Boolean))];
    const classesCount = [...new Set(reports.map(report => report.class_name).filter(Boolean))];

    const feedbackGiven = reports.filter(report => report.prl_feedback).length;
    const feedbackRate = totalReports > 0 
      ? ((feedbackGiven / totalReports) * 100).toFixed(1) 
      : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentReports = reports.filter(report => 
      report.date_of_lecture && new Date(report.date_of_lecture) >= oneWeekAgo
    );

    return {
      totalReports,
      totalStudents,
      totalPresent,
      averageAttendance,
      lecturersCount: lecturers.length,
      coursesCount: coursesCount.length,
      classesCount: classesCount.length,
      feedbackGiven,
      feedbackRate,
      recentReports: recentReports.length,
      lecturers,
      courses: coursesCount,
      classes: classesCount
    };
  };

  const getReportsByStatus = () => {
    const needsFeedback = reports.filter(report => !report.prl_feedback);
    const feedbackGiven = reports.filter(report => report.prl_feedback);

    return { needsFeedback, feedbackGiven };
  };

  Date.prototype.getWeek = function() {
    const date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const summary = calculateSummary();
  const reportsByStatus = getReportsByStatus();

  if (loading && activeTab === "view") return <div className="loading">Loading reports...</div>;

  return (
    <div className="prl-section">
      {/* ... the rest of your JSX (tabs, summary, view, create, feedback modal) ... */}
    </div>
  );
}

export default PRLReports;
