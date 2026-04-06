import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import {
  approveTeacherAccount,
  createAdmin,
  fetchPendingTeachers,
  fetchTeachers,
  updateTeacher,
} from "../api";
import { SECONDARY_SUBJECTS, matchesSearch } from "../constants/schoolData";
import { useAuth } from "../context/AuthContext";
import "../styles/teachers.css";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const initialAdmin = {
  username: "",
  password: "",
  full_name: "",
  role: "admin",
};

export default function Teachers() {
  const { currentUser } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [adminForm, setAdminForm] = useState(initialAdmin);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [teacherList, pendingList] = await Promise.all([
      fetchTeachers(),
      fetchPendingTeachers(),
    ]);
    setTeachers(teacherList);
    setPendingTeachers(pendingList);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTeachers = teachers.filter((teacher) =>
    matchesSearch([teacher.full_name, teacher.subject, teacher.email, teacher.phone], query)
  );

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Teachers</p>
          <h2>Approval and staff management</h2>
        </div>
        <ExportMenu title="Teachers" filename="teachers" rows={filteredTeachers} />
      </div>

      <div className="page-grid">
        <div className="panel table-panel">
          <h3>Teachers List</h3>
          <input
            className="search-input"
            placeholder="Search teachers or subjects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Edit Subject</th>
                  <th>Update Image</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>{teacher.full_name}</td>
                    <td>{teacher.subject}</td>
                    <td>{teacher.approved ? "Approved" : "Pending"}</td>
                    <td>
                      {teacher.profile_image ? (
                        <img className="avatar-thumb" src={teacher.profile_image} alt={teacher.full_name} />
                      ) : "No image"}
                    </td>
                    <td>
                      <select
                        value={teacher.subject}
                        onChange={async (event) => {
                          await updateTeacher(teacher.id, { ...teacher, subject: event.target.value });
                          loadData();
                        }}
                      >
                        {SECONDARY_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const image = await fileToBase64(file);
                          await updateTeacher(teacher.id, { ...teacher, profile_image: image });
                          loadData();
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {!filteredTeachers.length ? <tr><td colSpan="6">No teachers found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Pending Teacher Accounts</h3>
          {currentUser?.role !== "admin" ? <p>Only admins can approve teacher accounts.</p> : null}
          <div className="stack-list">
            {pendingTeachers.map((teacher) => (
              <div key={teacher.id} className="list-card">
                <div>
                  <strong>{teacher.full_name}</strong>
                  <p>@{teacher.username}</p>
                </div>
                {currentUser?.role === "admin" ? (
                  <button type="button" onClick={async () => {
                    await approveTeacherAccount(teacher.id);
                    loadData();
                  }}>
                    Approve
                  </button>
                ) : null}
              </div>
            ))}
            {!pendingTeachers.length ? <p>No pending teacher approvals.</p> : null}
          </div>
        </div>

        <form
          className="panel form-panel"
          onSubmit={async (event) => {
            event.preventDefault();
            await createAdmin(adminForm);
            setAdminForm(initialAdmin);
          }}
        >
          <h3>Add Another Admin</h3>
          <p>Admins can add more admins when the school needs two or more controllers.</p>
          <div className="form-grid">
            <input placeholder="Full name" value={adminForm.full_name} onChange={(event) => setAdminForm({ ...adminForm, full_name: event.target.value })} required />
            <input placeholder="Username" value={adminForm.username} onChange={(event) => setAdminForm({ ...adminForm, username: event.target.value })} required />
            <input type="password" placeholder="Password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} required />
          </div>
          <button type="submit" disabled={currentUser?.role !== "admin"}>Create Admin</button>
        </form>
      </div>
    </section>
  );
}
