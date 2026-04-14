import React, { useEffect, useMemo, useState } from "react";
import PasswordField from "../components/PasswordField";
import ExportMenu from "../components/ExportMenu";
import {
  approveAccessRequest,
  approveTeacherAccountWithForms,
  createAccessRequest,
  createAdmin,
  disableTeacherAccount,
  enableTeacherAccount,
  fetchAccessRequests,
  fetchPendingTeachers,
  fetchTeachers,
  updateTeacher,
} from "../api";
import { FORM_OPTIONS, SECONDARY_SUBJECTS, matchesSearch } from "../constants/schoolData";
import { useAuth } from "../context/AuthContext";
import { useSuccessDialog } from "../context/ConfirmDialogContext";
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

const initialRequest = {
  requested_subject: "",
  requested_forms: [],
  note: "",
};

export default function Teachers() {
  const { currentUser } = useAuth();
  const showSuccess = useSuccessDialog();
  const [teachers, setTeachers] = useState([]);
  const [teacherDrafts, setTeacherDrafts] = useState({});
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [approvalForms, setApprovalForms] = useState({});
  const [accessRequests, setAccessRequests] = useState([]);
  const [adminForm, setAdminForm] = useState(initialAdmin);
  const [requestForm, setRequestForm] = useState(initialRequest);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [teacherList, pendingList, requestList] = await Promise.all([
      fetchTeachers(),
      currentUser?.role === "admin" ? fetchPendingTeachers() : Promise.resolve([]),
      fetchAccessRequests(),
    ]);
    setTeachers(teacherList);
    setTeacherDrafts(
      Object.fromEntries(
        teacherList.map((teacher) => [
          teacher.id,
          {
            ...teacher,
            assigned_forms: teacher.assigned_forms || [],
          },
        ])
      )
    );
    setPendingTeachers(pendingList);
    setApprovalForms(
      Object.fromEntries(
        pendingList.map((teacher) => [teacher.id, FORM_OPTIONS])
      )
    );
    setAccessRequests(requestList);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTeachers = teachers.filter((teacher) =>
    matchesSearch([teacher.full_name, teacher.subject, teacher.email, teacher.phone], query)
  );

  const visibleRequests = useMemo(
    () => accessRequests.filter((requestItem) => requestItem.status === "pending"),
    [accessRequests]
  );

  const toggleForm = (forms, formName) =>
    forms.includes(formName) ? forms.filter((item) => item !== formName) : [...forms, formName];

  async function saveTeacherDraft(teacherId, nextDraft) {
    setTeacherDrafts((current) => ({
      ...current,
      [teacherId]: nextDraft,
    }));
    await updateTeacher(teacherId, nextDraft);
    showSuccess({ title: "Updated successfully", message: "Teacher details were updated successfully." });
    await loadData();
  }

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
                  <th>Main Subject</th>
                  <th>Approved Subjects</th>
                  <th>Assigned Forms</th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => {
                  const draft = teacherDrafts[teacher.id] || teacher;
                  return (
                    <tr key={teacher.id}>
                      <td>{teacher.full_name}</td>
                      <td>
                        <select
                          value={draft.subject}
                          disabled={currentUser?.role !== "admin"}
                          onChange={async (event) => {
                            const nextDraft = { ...draft, subject: event.target.value };
                            await saveTeacherDraft(teacher.id, nextDraft);
                          }}
                        >
                          {SECONDARY_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                        </select>
                      </td>
                      <td>{(teacher.approved_subjects || []).join(", ") || teacher.subject}</td>
                      <td>
                        <div className="teacher-form-grid">
                          {FORM_OPTIONS.map((formName) => (
                            <label key={formName} className="checkbox-row teacher-form-item">
                              <input
                                type="checkbox"
                                checked={(draft.assigned_forms || []).includes(formName)}
                                disabled={currentUser?.role !== "admin"}
                                onChange={async () => {
                                  const nextDraft = {
                                    ...draft,
                                    assigned_forms: toggleForm(draft.assigned_forms || [], formName),
                                  };
                                  await saveTeacherDraft(teacher.id, nextDraft);
                                }}
                              />
                              {formName}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td>{teacher.account_status === "disabled" ? "Disabled" : teacher.approved ? "Approved" : "Pending"}</td>
                      <td>
                        {teacher.profile_image ? (
                          <img className="avatar-thumb" src={teacher.profile_image} alt={teacher.full_name} />
                        ) : "No image"}
                      </td>
                      <td>
                        <div className="stack-list">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={currentUser?.role !== "admin"}
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const image = await fileToBase64(file);
                              const nextDraft = { ...draft, profile_image: image };
                              await saveTeacherDraft(teacher.id, nextDraft);
                            }}
                          />
                          {teacher.user_id ? (
                            <button
                              type="button"
                              className={teacher.account_status === "disabled" ? "" : "danger-button"}
                              disabled={currentUser?.role !== "admin"}
                              onClick={async () => {
                                if (teacher.account_status === "disabled") {
                                  await enableTeacherAccount(teacher.user_id);
                                } else {
                                  await disableTeacherAccount(teacher.user_id);
                                }
                                loadData();
                              }}
                            >
                              {teacher.account_status === "disabled" ? "Enable Account" : "Disable Account"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredTeachers.length ? <tr><td colSpan="7">No teachers found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Pending Teacher Accounts</h3>
          {currentUser?.role !== "admin" ? <p>Only admins can approve teacher accounts.</p> : null}
          <div className="stack-list">
            {pendingTeachers.map((teacher) => (
              <div key={teacher.id} className="list-card list-card-column">
                <div>
                  <strong>{teacher.full_name}</strong>
                  <p>@{teacher.username}</p>
                </div>
                {currentUser?.role === "admin" ? (
                  <>
                    <div className="teacher-form-grid">
                      {FORM_OPTIONS.map((formName) => (
                        <label key={formName} className="checkbox-row teacher-form-item">
                          <input
                            type="checkbox"
                            checked={(approvalForms[teacher.id] || []).includes(formName)}
                            onChange={() =>
                              setApprovalForms((current) => ({
                                ...current,
                                [teacher.id]: toggleForm(current[teacher.id] || [], formName),
                              }))
                            }
                          />
                          {formName}
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={async () => {
                      await approveTeacherAccountWithForms(teacher.id, approvalForms[teacher.id] || FORM_OPTIONS);
                      loadData();
                    }}>
                      Approve Teacher
                    </button>
                  </>
                ) : null}
              </div>
            ))}
            {!pendingTeachers.length ? <p>No pending teacher approvals.</p> : null}
          </div>
        </div>

        <div className="panel">
          <h3>{currentUser?.role === "admin" ? "Pending Subject Access Requests" : "Request Another Subject Access"}</h3>
          {currentUser?.role === "teacher" ? (
            <form
              className="form-panel"
              onSubmit={async (event) => {
                event.preventDefault();
                await createAccessRequest(requestForm);
                setRequestForm(initialRequest);
                loadData();
              }}
            >
              <div className="form-grid">
                <select
                  value={requestForm.requested_subject}
                  onChange={(event) => setRequestForm({ ...requestForm, requested_subject: event.target.value })}
                  required
                >
                  <option value="">Select subject *</option>
                  {SECONDARY_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
                <input
                  placeholder="Short note for admin"
                  value={requestForm.note}
                  onChange={(event) => setRequestForm({ ...requestForm, note: event.target.value })}
                />
              </div>
              <div className="teacher-form-grid">
                {FORM_OPTIONS.map((formName) => (
                  <label key={formName} className="checkbox-row teacher-form-item">
                    <input
                      type="checkbox"
                      checked={requestForm.requested_forms.includes(formName)}
                      onChange={() =>
                        setRequestForm((current) => ({
                          ...current,
                          requested_forms: toggleForm(current.requested_forms, formName),
                        }))
                      }
                    />
                    {formName}
                  </label>
                ))}
              </div>
              <div className="button-row">
                <button type="submit">Send Request</button>
              </div>
            </form>
          ) : null}

          <div className="stack-list">
            {visibleRequests.map((requestItem) => (
              <div key={requestItem.id} className="list-card">
                <div>
                  <strong>{requestItem.teacher_name}</strong>
                  <p>{requestItem.requested_subject} | {(requestItem.requested_forms || []).join(", ")}</p>
                  <p>{requestItem.note || "No note"}</p>
                </div>
                {currentUser?.role === "admin" ? (
                  <button type="button" onClick={async () => {
                    await approveAccessRequest(requestItem.id);
                    loadData();
                  }}>
                    Approve Access
                  </button>
                ) : (
                  <span>{requestItem.status}</span>
                )}
              </div>
            ))}
            {!visibleRequests.length ? <p>No pending access requests.</p> : null}
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
            <input placeholder="Full name *" value={adminForm.full_name} onChange={(event) => setAdminForm({ ...adminForm, full_name: event.target.value })} required />
            <input placeholder="Username *" value={adminForm.username} onChange={(event) => setAdminForm({ ...adminForm, username: event.target.value })} required />
            <PasswordField placeholder="Password *" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} required />
          </div>
          <button type="submit" disabled={currentUser?.role !== "admin"}>Create Admin</button>
        </form>
      </div>
    </section>
  );
}
