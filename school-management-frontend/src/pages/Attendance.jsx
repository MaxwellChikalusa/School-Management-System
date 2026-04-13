import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import { createAttendance, deleteAttendance, fetchAttendance, fetchStudents, updateAttendance } from "../api";
import { groupStudentsByForm, matchesSearch } from "../constants/schoolData";
import { useConfirmDialog, useNoticeDialog, useSuccessDialog } from "../context/ConfirmDialogContext";
import "../styles/attendance.css";

const initialForm = {
  student_id: "",
  date: "",
  status: "Present",
  note: "",
};

export default function Attendance() {
  const confirm = useConfirmDialog();
  const showNotice = useNoticeDialog();
  const showSuccess = useSuccessDialog();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);

  async function loadData() {
    const [studentList, attendanceList] = await Promise.all([fetchStudents(), fetchAttendance()]);
    setStudents(studentList);
    setRecords(attendanceList);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = records.filter((record) =>
    matchesSearch([record.student?.full_name, record.date, record.status, record.note], query)
  );
  const studentGroups = groupStudentsByForm(students);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Daily attendance register</h2>
        </div>
        <ExportMenu title="Attendance" filename="attendance" rows={filteredRecords} />
      </div>

      <div className="page-grid">
        <form
          className="panel form-panel"
          onSubmit={async (event) => {
            event.preventDefault();
            const payload = { ...form, student_id: Number(form.student_id) };
            try {
              if (editingId) {
                await updateAttendance(editingId, payload);
                showSuccess({ title: "Updated successfully", message: "Attendance record was updated successfully." });
              } else {
                await createAttendance(payload);
                showSuccess({ title: "Saved successfully", message: "Attendance record was saved successfully." });
              }
            } catch (error) {
              const message = error?.response?.data?.detail || error?.message || "Unable to save attendance.";
              showNotice({ title: message === "Already entered" ? "Already entered" : "Unable to Save", message });
              return;
            }
            setForm(initialForm);
            setEditingId(null);
            loadData();
          }}
        >
          <h3>{editingId ? "Edit Attendance" : "Mark Attendance"}</h3>
          <div className="form-grid">
            <select value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })} required>
              <option value="">Select student *</option>
              {studentGroups.map((group) => (
                <optgroup key={group.formName} label={group.formName}>
                  {group.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required aria-label="Date *" />
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
            <input placeholder="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <div className="button-row">
            <button type="submit">{editingId ? "Update Attendance" : "Save Attendance"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button> : null}
          </div>
        </form>

        <div className="panel table-panel">
          <h3>Attendance Records</h3>
          <input
            className="search-input"
            placeholder="Search student, date, status or note"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.student?.full_name}</td>
                    <td>{record.date}</td>
                    <td>{record.status}</td>
                    <td>{record.note || "-"}</td>
                    <td>
                      <button type="button" className={editingId === record.id ? "edit-button-active" : ""} onClick={() => {
                        setEditingId(record.id);
                        setForm({
                          student_id: String(record.student_id),
                          date: record.date,
                          status: record.status,
                          note: record.note || "",
                        });
                      }}>
                        Edit
                      </button>
                      <button type="button" className="danger-button" onClick={async () => {
                        const approved = await confirm({
                          title: `Are You Sure You Want to Delete "${record.student?.full_name || "Attendance Record"}"`,
                          message: "This action cannot be undone.",
                          confirmLabel: "Delete Record",
                        });
                          if (!approved) return;
                          await deleteAttendance(record.id);
                          showSuccess({ title: "Deleted successfully", message: "Attendance record was deleted successfully." });
                          loadData();
                        }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length ? <tr><td colSpan="5">No attendance records found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
