import React, { useEffect, useState } from "react";
import {
  createTimetable,
  deleteTimetable,
  fetchTeachers,
  fetchTimetables,
  postTimetable,
  updateTimetable,
} from "../api";
import ExportMenu from "../components/ExportMenu";
import { FORM_OPTIONS, SECONDARY_SUBJECTS, matchesSearch } from "../constants/schoolData";
import "../styles/dashboard.css";

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
  timetable_type: "subject",
  class_name: "",
  is_posted: false,
  note: "",
  days,
  entries: [{ ...initialEntry }],
});

export default function Timetable() {
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [teacherList, timetableList] = await Promise.all([fetchTeachers(), fetchTimetables()]);
    setTeachers(teacherList);
    setTimetables(timetableList);
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

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Timetable</p>
          <h2>Subject and exam timetable manager</h2>
          <p className="page-note">Supports Monday to Friday and hours from 7am to 5pm with posting and export.</p>
        </div>
        <ExportMenu title="Timetable" filename="timetable" rows={timetableRows} />
      </div>

      <div className="page-grid">
        <form className="panel form-panel" onSubmit={saveTimetable}>
          <h3>{editingId ? "Update Timetable" : "Create Timetable"}</h3>
          <div className="form-grid">
            <input placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <select value={form.timetable_type} onChange={(event) => setForm({ ...form, timetable_type: event.target.value })}>
              <option value="subject">Subjects Timetable</option>
              <option value="exam">Exams Timetable</option>
            </select>
            <select value={form.class_name} onChange={(event) => setForm({ ...form, class_name: event.target.value })} required>
              <option value="">Select form</option>
              {FORM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
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
                    {SECONDARY_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
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
                      await deleteTimetable(timetable.id);
                      loadData();
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.day_of_week}</td>
                          <td>{entry.start_time}</td>
                          <td>{entry.end_time}</td>
                          <td>{entry.subject}</td>
                          <td>{entry.teacher_name || "-"}</td>
                          <td>{entry.room || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
