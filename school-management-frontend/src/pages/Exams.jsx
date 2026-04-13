import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import { createExamRecord, deleteExamRecord, fetchExamRecords, fetchPermissionContext, fetchStudents, updateExamRecord } from "../api";
import { FORM_OPTIONS, SECONDARY_SUBJECTS, TERM_OPTIONS, groupStudentsByForm, matchesSearch } from "../constants/schoolData";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog, useNoticeDialog, useSuccessDialog } from "../context/ConfirmDialogContext";
import { formatNumber } from "../utils/formatters";
import "../styles/exams.css";

const defaultSubjects = [
  { subject: "English Language", score: "" },
  { subject: "Mathematics", score: "" },
  { subject: "Biology", score: "" },
  { subject: "Social and Development Studies", score: "" },
];

const createInitialForm = () => ({
  student_id: "",
  student_name: "",
  class_name: "",
  post_office_address: "",
  exam_name: "Main Exam",
  term: "",
  subject_scores: defaultSubjects.map((item) => ({ ...item })),
});

export default function Exams() {
  const { currentUser } = useAuth();
  const confirm = useConfirmDialog();
  const showNotice = useNoticeDialog();
  const showSuccess = useSuccessDialog();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [permission, setPermission] = useState({ allowed_forms: [], allowed_subjects: [] });
  const [form, setForm] = useState(createInitialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [studentList, examList, permissionContext] = await Promise.all([
      fetchStudents(),
      fetchExamRecords(),
      fetchPermissionContext().catch(() => ({
        allowed_forms: FORM_OPTIONS,
        allowed_subjects: SECONDARY_SUBJECTS,
      })),
    ]);
    setStudents(studentList);
    setRecords(examList);
    setPermission(permissionContext);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = records.filter((record) =>
    matchesSearch([record.student_name, record.admission_number, record.class_name, record.exam_name, record.term], query)
  );
  const groupedRecords = FORM_OPTIONS.map((formName) => ({
    formName,
    records: filteredRecords.filter((record) => record.class_name === formName),
  })).filter((group) => group.records.length);
  const studentGroups = groupStudentsByForm(students);
  const formOptions =
    currentUser?.role === "admin"
      ? FORM_OPTIONS
      : permission.allowed_forms?.length
        ? permission.allowed_forms
        : FORM_OPTIONS;
  const subjectOptions =
    currentUser?.role === "admin"
      ? SECONDARY_SUBJECTS
      : permission.allowed_subjects?.length
        ? permission.allowed_subjects
        : SECONDARY_SUBJECTS;

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Exams</p>
          <h2>Average, ranking and result labels</h2>
          {/* <p className="page-note">Subjects and students are now selected from the existing school records.</p> */}
        </div>
        <ExportMenu title="Exams" filename="exams" rows={filteredRecords} />
      </div>

      <div className="page-grid">
        <form
          className="panel form-panel"
          onSubmit={async (event) => {
            event.preventDefault();
            const payload = {
              ...form,
              student_id: form.student_id ? Number(form.student_id) : null,
              subject_scores: form.subject_scores
                .filter((item) => item.subject && item.score !== "")
                .map((item) => ({ subject: item.subject, score: Number(item.score) })),
            };

            try {
              if (editingId) {
                await updateExamRecord(editingId, payload);
                showSuccess({ title: "Updated successfully", message: "Exam result was updated successfully." });
              } else {
                await createExamRecord(payload);
                showSuccess({ title: "Saved successfully", message: "Exam result was saved successfully." });
              }
            } catch (error) {
              const message = error?.response?.data?.detail || error?.message || "Unable to save exam results.";
              showNotice({ title: message === "Details Already Entered" ? "Details Already Entered" : "Unable to Save", message });
              return;
            }

            setForm(createInitialForm());
            setEditingId(null);
            loadData();
          }}
        >
          <h3>{editingId ? "Edit Exam Scores" : "Enter Exam Scores"}</h3>
          <div className="form-grid">
            <select
              value={form.student_id}
              onChange={(event) => {
                const student = students.find((item) => item.id === Number(event.target.value));
                setForm({
                  ...form,
                  student_id: event.target.value,
                  admission_number: student?.admission_number || "",
                  student_name: student?.full_name || "",
                  class_name: student?.class_name || "",
                  post_office_address: student?.address || "",
                });
              }}
            >
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
            <input placeholder="Student name *" value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} required />
            <select value={form.class_name} onChange={(event) => setForm({ ...form, class_name: event.target.value })} required>
              <option value="">Select form *</option>
              {formOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input placeholder="Post Office Address" value={form.post_office_address} onChange={(event) => setForm({ ...form, post_office_address: event.target.value })} />
            <input placeholder="Exam name *" value={form.exam_name} onChange={(event) => setForm({ ...form, exam_name: event.target.value })} required />
            <select value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })}>
              <option value="">Select term</option>
              {TERM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="stack-list">
            {form.subject_scores.map((entry, index) => (
              <div key={`${entry.subject}-${index}`} className="form-grid">
                <select
                  value={entry.subject}
                  onChange={(event) => {
                    const next = [...form.subject_scores];
                    next[index] = { ...entry, subject: event.target.value };
                    setForm({ ...form, subject_scores: next });
                  }}
                >
                  <option value="">Select subject *</option>
                  {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Score"
                  value={entry.score}
                  onChange={(event) => {
                    const next = [...form.subject_scores];
                    next[index] = { ...entry, score: event.target.value };
                    setForm({ ...form, subject_scores: next });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setForm({ ...form, subject_scores: [...form.subject_scores, { subject: "", score: "" }] })}>
              Add Subject
            </button>
            <button type="submit">{editingId ? "Update Result" : "Save Result"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(createInitialForm()); }}>Cancel</button> : null}
          </div>
        </form>

        <div className="panel table-panel">
          <h3>Results Table</h3>
          <input
            className="search-input"
            placeholder="Search student, form, exam or term"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Class</th>
                  <th>P.O. Address</th>
                  <th>Term</th>
                  <th>Subjects</th>
                  <th>Average</th>
                  <th>Label</th>
                  <th>Overall</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedRecords.flatMap((group) => [
                  <tr key={`${group.formName}-header`} className="group-row group-row-green">
                    <td colSpan="11"><strong>{group.formName}</strong></td>
                  </tr>,
                  ...group.records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.rank != null ? formatNumber(record.rank) : "-"}</td>
                      <td>{record.student_name}</td>
                      <td>{record.admission_number || "-"}</td>
                      <td>{record.class_name}</td>
                      <td>{record.post_office_address || "-"}</td>
                      <td>{record.term || "-"}</td>
                      <td>{(record.subject_scores || []).map((item) => `${item.subject}: ${item.score}`).join(", ")}</td>
                      <td>{formatNumber(record.average)}%</td>
                      <td>{record.result_label}</td>
                      <td>{record.overall_result}{record.english_failed ? " (English fail)" : ""}</td>
                      <td>
                        <button type="button" className={editingId === record.id ? "edit-button-active" : ""} onClick={() => {
                          setEditingId(record.id);
                          setForm({
                            student_id: record.student_id ? String(record.student_id) : "",
                            admission_number: record.admission_number || "",
                            student_name: record.student_name || "",
                            class_name: record.class_name || "",
                            post_office_address: record.post_office_address || "",
                            exam_name: record.exam_name || "Main Exam",
                            term: record.term || "",
                            subject_scores: (record.subject_scores || []).length
                              ? record.subject_scores.map((item) => ({ subject: item.subject, score: item.score }))
                              : defaultSubjects.map((item) => ({ ...item })),
                          });
                        }}>
                          Edit
                        </button>
                        <button type="button" className="danger-button" onClick={async () => {
                          const approved = await confirm({
                            title: `Are You Sure You Want to Delete "${record.student_name || "Exam Record"}"`,
                            message: "This action cannot be undone.",
                            confirmLabel: "Delete Result",
                          });
                          if (!approved) return;
                          await deleteExamRecord(record.id);
                          showSuccess({ title: "Deleted successfully", message: "Exam record was deleted successfully." });
                          loadData();
                        }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )),
                ])}
                {!filteredRecords.length ? <tr><td colSpan="11">No exam records found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
