import React, { useEffect, useState } from "react";
import {
  fetchAttendance,
  fetchDashboardSummary,
  fetchExamRecords,
  fetchFees,
  fetchStudents,
  fetchTeachers,
  fetchTimetables,
} from "../api";
import ExportMenu from "../components/ExportMenu";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatNumber } from "../utils/formatters";
import "../styles/dashboard.css";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [datasets, setDatasets] = useState({
    students: [],
    teachers: [],
    attendance: [],
    fees: [],
    exams: [],
    timetables: [],
  });
  const [activeAction, setActiveAction] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const [dashboardSummary, students, teachers, attendance, fees, exams, timetables] = await Promise.all([
        fetchDashboardSummary(),
        fetchStudents(),
        fetchTeachers(),
        fetchAttendance(),
        fetchFees(),
        fetchExamRecords(),
        fetchTimetables(),
      ]);

      setSummary(dashboardSummary);
      setDatasets({ students, teachers, attendance, fees, exams, timetables });
    }

    loadDashboard();
  }, []);

  const quickActions = [
    { key: "students", label: "Students Report", title: "Students Report", rows: datasets.students },
    { key: "fees", label: "Fees Report", title: "Fees Report", rows: datasets.fees },
    { key: "attendance", label: "Attendance Report", title: "Attendance Report", rows: datasets.attendance },
    { key: "timetables", label: "Timetable Report", title: "Timetable Report", rows: datasets.timetables },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Live Overview</p>
          <h2>Welcome {currentUser?.full_name}</h2>
          <p className="dashboard-subtitle">
            Entries from students, teachers, attendance, exams, fees and timetables are reflected here.
          </p>
        </div>
        <div className="dashboard-badge">{currentUser?.role?.toUpperCase()} ACCESS</div>
      </div>

      <div className="cards">
        <div className="card">
          <span className="card-label">Total Students</span>
          <strong>{formatNumber(summary?.total_students)}</strong>
          <p>Student register is now live from the database.</p>
        </div>
        <div className="card">
          <span className="card-label">Approved Teachers</span>
          <strong>{formatNumber(summary?.total_teachers)}</strong>
          <p>{formatNumber(summary?.pending_teacher_accounts)} pending approvals.</p>
        </div>
        <div className="card">
          <span className="card-label">Attendance Rate</span>
          <strong>{formatNumber(summary?.attendance_rate)}%</strong>
          <p>Based on attendance records entered.</p>
        </div>
        <div className="card">
          <span className="card-label">Fees Collected</span>
          <strong>MWK {formatCurrency(summary?.fees_collected)}</strong>
          <p>{formatNumber(summary?.posted_timetables)} posted timetables visible to users.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Academic Leaders</h3>
            <span>Overall student performance information</span>
          </div>
          <div className="cards compact-cards">
            <div className="card">
              <span className="card-label">Best Average</span>
              <strong>{formatNumber(summary?.top_students?.[0]?.average)}%</strong>
              <p>{summary?.top_students?.[0]?.class_name ?? "No class yet"}</p>
            </div>
            <div className="card">
              <span className="card-label">Leading Student</span>
              <strong>{summary?.top_students?.[0]?.student_name ?? "No results yet"}</strong>
              <p>{summary?.top_students?.[0]?.overall_result ?? "Waiting for results"}</p>
            </div>
            <div className="card">
              <span className="card-label">Students Ranked</span>
              <strong>{formatNumber(datasets.exams.length)}</strong>
              <p>Dashboard reflects all exam records entered.</p>
            </div>
            <div className="card">
              <span className="card-label">Pass Labels</span>
              <strong>{formatNumber(datasets.exams.filter((item) => item.passed).length)}</strong>
              <p>{formatNumber(datasets.exams.filter((item) => item.english_failed).length)} English failures tracked.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Operational Snapshot</h3>
            <span>Live database totals</span>
          </div>
          <div className="schedule-list">
            <div className="schedule-item">
              <strong>{formatNumber(datasets.exams.length)}</strong>
              <div>
                <h4>Exam Results</h4>
                <p>Stored records with automatic averages and ranks</p>
              </div>
            </div>
            <div className="schedule-item">
              <strong>{formatNumber(datasets.fees.length)}</strong>
              <div>
                <h4>Fee Entries</h4>
                <p>Shows expected amount, paid amount, balance and full payment status</p>
              </div>
            </div>
            <div className="schedule-item">
              <strong>{formatNumber(datasets.timetables.length)}</strong>
              <div>
                <h4>Timetables</h4>
                {/* <p>Subject and exam timetables with posting support</p> */}
              </div>
            </div>
          </div>
        </section>

        <section className="panel quick-actions">
          <div className="panel-header">
            <h3>Quick Actions</h3>
            <span>Each report opens the export choices from one button</span>
          </div>
          <div className="quick-action-grid">
            {quickActions.map((action) => (
              <div key={action.key} className="quick-action-card">
                <button type="button" onClick={() => setActiveAction(activeAction === action.key ? "" : action.key)}>
                  {action.label}
                </button>
                {activeAction === action.key ? (
                  <div className="quick-action-options">
                    <ExportMenu title={action.title} filename={action.key} rows={action.rows} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
