import React, { useEffect, useState } from "react";
import {
  createTimetable,
  deleteTimetable,
  fetchPermissionContext,
  fetchTeachers,
  fetchTimetables,
  postTimetable,
  updateTimetable,
} from "../api";
import ExportMenu from "../components/ExportMenu";
import { FORM_OPTIONS, SECONDARY_SUBJECTS, matchesSearch } from "../constants/schoolData";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import "../styles/timetable.css";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeOptions = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const initialEntry = {
  day_of_week: "Monday",
  start_time: "07:00",
  end_time: "08:00",
  subject: "",
  teacher_name: "",
  room: "",
  note: "",
};

const createInitialForm = () => ({
  title: "",
  timetable_type: "exam",
  class_name: "",
  is_posted: false,
  note: "",
  days,
  entries: [{ ...initialEntry }],
});

function compareEntries(a, b) {
  const dayDifference = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
  if (dayDifference !== 0) return dayDifference;
  return a.start_time.localeCompare(b.start_time);
}

function groupEntriesByDay(entries) {
  return days.map((day) => ({
    day,
    entries: (entries || []).filter((entry) => entry.day_of_week === day).sort(compareEntries),
  }));
}

export default function Timetable() {
  const { currentUser } = useAuth();
  const confirm = useConfirmDialog();
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [permission, setPermission] = useState({ allowed_forms: [], allowed_subjects: [] });
  const [form, setForm] = useState(createInitialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [teacherList, timetableList, permissionContext] = await Promise.all([
      fetchTeachers(),
      fetchTimetables(),
      fetchPermissionContext().catch(() => ({
        allowed_forms: FORM_OPTIONS,
        allowed_subjects: SECONDARY_SUBJECTS,
      })),
    ]);
    setTeachers(teacherList);
    setTimetables(timetableList);
    setPermission(permissionContext);
  }

  useEffect(() => {
    loadData();
  }, []);

  const saveTimetable = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      entries: form.entries.filter((entry) => entry.subject.trim()),
    };

    if (editingId) {
      await updateTimetable(editingId, payload);
    } else {
      await createTimetable(payload);
    }
    setForm(createInitialForm());
    setEditingId(null);
    loadData();
  };

  const filteredTimetables = timetables.filter((timetable) =>
    matchesSearch(
      [timetable.title, timetable.class_name, timetable.note, ...(timetable.entries || []).flatMap((entry) => [entry.subject, entry.teacher_name, entry.room])],
      query
    )
  );

  const timetableRows = filteredTimetables.flatMap((timetable) =>
    timetable.entries.map((entry) => ({
      timetable: timetable.title,
      type: timetable.timetable_type,
      class_name: timetable.class_name,
      posted: timetable.is_posted ? "Yes" : "No",
      day: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      subject: entry.subject,
      teacher: entry.teacher_name,
      room: entry.room,
      note: entry.note,
    }))
  );
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
          <p className="eyebrow">Timetable</p>
          <h2>MSCE style timetable manager</h2>
          <p className="page-note">Creates a printable exam sheet layout while keeping every timetable entry inside PostgreSQL tables.</p>
        </div>
        <ExportMenu title="Timetable" filename="timetable" rows={timetableRows} />
      </div>

      <div className="page-grid">
        <form className="panel form-panel" onSubmit={saveTimetable}>
          <h3>{editingId ? "Update Timetable" : "Create Timetable"}</h3>
          <div className="form-grid">
            <input placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <select value={form.timetable_type} onChange={(event) => setForm({ ...form, timetable_type: event.target.value })}>
              <option value="exam">Exams Timetable</option>
              <option value="subject">Subjects Timetable</option>
            </select>
            <select value={form.class_name} onChange={(event) => setForm({ ...form, class_name: event.target.value })} required>
              <option value="">Select form</option>
              {formOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input placeholder="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>

          <div className="stack-list">
            {form.entries.map((entry, index) => (
              <div key={`${entry.day_of_week}-${index}`} className="list-card list-card-column">
                <div className="form-grid">
                  <select value={entry.day_of_week} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, day_of_week: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }}>
                    {days.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                  <select value={entry.start_time} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, start_time: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }}>
                    {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                  <select value={entry.end_time} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, end_time: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }}>
                    {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                  <select value={entry.subject} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, subject: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }}>
                    <option value="">Select subject</option>
                    {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                  <select value={entry.teacher_name} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, teacher_name: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }}>
                    <option value="">Teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.full_name}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                  <input placeholder="Room" value={entry.room} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, room: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }} />
                  <input placeholder="Note" value={entry.note} onChange={(event) => {
                    const nextEntries = [...form.entries];
                    nextEntries[index] = { ...entry, note: event.target.value };
                    setForm({ ...form, entries: nextEntries });
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div className="button-row">
            <button type="button" onClick={() => setForm({ ...form, entries: [...form.entries, { ...initialEntry }] })}>
              Add Slot
            </button>
            <button type="submit">{editingId ? "Update" : "Save"} Timetable</button>
          </div>
        </form>

        <div className="panel table-panel">
          <h3>Saved Timetables</h3>
          <input
            className="search-input"
            placeholder="Search timetable, form, teacher or subject"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="stack-list">
            {filteredTimetables.map((timetable) => (
              <div key={timetable.id} className="list-card list-card-column">
                <div className="list-card-header">
                  <div>
                    <strong>{timetable.title}</strong>
                    <p>{timetable.class_name} | {timetable.timetable_type} | {timetable.is_posted ? "Posted" : "Draft"}</p>
                  </div>
                  <div className="button-row">
                    <button type="button" onClick={() => {
                      setEditingId(timetable.id);
                      setForm({
                        title: timetable.title,
                        timetable_type: timetable.timetable_type,
                        class_name: timetable.class_name,
                        is_posted: timetable.is_posted,
                        note: timetable.note || "",
                        days: timetable.days,
                        entries: timetable.entries.length ? timetable.entries : [{ ...initialEntry }],
                      });
                    }}>
                      Edit
                    </button>
                    <button type="button" onClick={async () => {
                      await postTimetable(timetable.id);
                      loadData();
                    }}>
                      Post
                    </button>
                    <button type="button" className="danger-button" onClick={async () => {
                      const approved = await confirm({
                        title: "Delete timetable?",
                        message: `Remove ${timetable.title || "this timetable"} from the system?`,
                        confirmLabel: "Delete Timetable",
                      });
                      if (!approved) return;
                      await deleteTimetable(timetable.id);
                      loadData();
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="msce-sheet">
                  <div className="msce-sheet-header">
                    <p className="msce-sheet-kicker">Republic of Malawi</p>
                    <h4>Malawi School Certificate of Education</h4>
                    <p className="msce-sheet-meta">{timetable.title} | {timetable.class_name} | {timetable.is_posted ? "Posted" : "Draft"}</p>
                    <p className="msce-sheet-note">{timetable.note || "Official examination timetable prepared by the school management system."}</p>
                  </div>

                  <div className="table-wrap">
                    <table className="msce-table">
                      <thead>
                        <tr>
                          <th>Day / Date</th>
                          <th>Time</th>
                          <th>Paper / Subject</th>
                          <th>Supervisor</th>
                          <th>Venue</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupEntriesByDay(timetable.entries).map(({ day, entries }) =>
                          entries.length ? (
                            entries.map((entry, index) => (
                              <tr key={entry.id}>
                                <td>{index === 0 ? day : ""}</td>
                                <td>{entry.start_time} - {entry.end_time}</td>
                                <td>{entry.subject}</td>
                                <td>{entry.teacher_name || "Invigilator TBA"}</td>
                                <td>{entry.room || "Main Hall"}</td>
                                <td>{entry.note || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr key={day}>
                              <td>{day}</td>
                              <td colSpan="5">No paper scheduled</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="msce-sheet-footer">
                    <span>Candidate instructions: arrive 30 minutes before the paper starts.</span>
                    <span>Generated from the school database.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
