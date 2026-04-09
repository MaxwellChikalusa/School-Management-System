import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import { createStudent, deleteStudent, fetchPermissionContext, fetchStudents, updateStudent } from "../api";
import { FORM_OPTIONS, SEX_OPTIONS, groupStudentsByForm, matchesSearch } from "../constants/schoolData";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import "../styles/students.css";

const initialForm = {
  full_name: "",
  sex: "",
  age: "",
  admission_number: "",
  class_name: "",
  guardian_name: "",
  guardian_contact: "",
  address: "",
};

export default function Students() {
  const { currentUser } = useAuth();
  const confirm = useConfirmDialog();
  const [students, setStudents] = useState([]);
  const [permission, setPermission] = useState({ allowed_forms: [], allowed_subjects: [] });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  async function loadStudents() {
    const [studentList, permissionResult] = await Promise.all([
      fetchStudents(),
      fetchPermissionContext().catch(() => ({ allowed_forms: FORM_OPTIONS, allowed_subjects: [] })),
    ]);
    setStudents(studentList);
    setPermission(permissionResult);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter((student) =>
    matchesSearch(
      [student.full_name, student.admission_number, student.class_name, student.guardian_name, student.guardian_contact],
      query
    )
  );
  const groupedStudents = groupStudentsByForm(filteredStudents);
  const classOptions =
    currentUser?.role === "admin"
      ? FORM_OPTIONS
      : permission.allowed_forms?.length
        ? permission.allowed_forms
        : FORM_OPTIONS;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
    };

    if (editingId) {
      await updateStudent(editingId, payload);
    } else {
      await createStudent(payload);
    }

    setForm(initialForm);
    setEditingId(null);
    loadStudents();
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Students</p>
          <h2>Student details register</h2>
        </div>
        <ExportMenu title="Students" filename="students" rows={filteredStudents} />
      </div>

      <div className="page-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit Student" : "Add Student"}</h3>
          <div className="form-grid">
            <input placeholder="Full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
            <select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })} required>
              <option value="">Select sex</option>
              {SEX_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input placeholder="Age" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} />
            <input placeholder="Admission number" value={form.admission_number} onChange={(event) => setForm({ ...form, admission_number: event.target.value })} />
            <select value={form.class_name} onChange={(event) => setForm({ ...form, class_name: event.target.value })} required>
              <option value="">Select class</option>
              {classOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input placeholder="Guardian name" value={form.guardian_name} onChange={(event) => setForm({ ...form, guardian_name: event.target.value })} />
            <input placeholder="Guardian contact" value={form.guardian_contact} onChange={(event) => setForm({ ...form, guardian_contact: event.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div className="button-row">
            <button type="submit">{editingId ? "Update Student" : "Save Student"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button> : null}
          </div>
        </form>

        <div className="panel table-panel">
          <h3>Students List</h3>
          <input
            className="search-input"
            placeholder="Search students, class, guardian or admission number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>Class</th>
                  <th>Age</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedStudents.flatMap((group) => [
                  <tr key={`${group.formName}-label`} className="group-row">
                    <td colSpan="7"><strong>{group.formName}</strong></td>
                  </tr>,
                  ...group.students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.full_name}</td>
                      <td>{student.sex}</td>
                      <td>{student.class_name}</td>
                      <td>{student.age ?? "-"}</td>
                      <td>{student.guardian_name || "-"}</td>
                      <td>{student.guardian_contact || "-"}</td>
                      <td>
                        <button type="button" onClick={() => {
                          setEditingId(student.id);
                          setForm({
                            full_name: student.full_name || "",
                            sex: student.sex || "",
                            age: student.age ?? "",
                            admission_number: student.admission_number || "",
                            class_name: student.class_name || "",
                            guardian_name: student.guardian_name || "",
                            guardian_contact: student.guardian_contact || "",
                            address: student.address || "",
                          });
                        }}>
                          Edit
                        </button>
                        <button type="button" className="danger-button" onClick={async () => {
                          const approved = await confirm({
                            title: "Delete student record?",
                            message: `Remove ${student.full_name || "this student"} from the register? This action cannot be undone.`,
                            confirmLabel: "Delete Student",
                          });
                          if (!approved) return;
                          await deleteStudent(student.id);
                          loadStudents();
                        }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )),
                ])}
                {!filteredStudents.length ? <tr><td colSpan="7">No students found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
