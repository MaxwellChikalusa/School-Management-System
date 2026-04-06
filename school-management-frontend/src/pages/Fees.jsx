import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import { createFee, deleteFee, fetchFees, fetchStudents, updateFee } from "../api";
import { matchesSearch } from "../constants/schoolData";
import "../styles/fees.css";

const initialForm = {
  student_id: "",
  student_name: "",
  expected_amount: "",
  amount_paid: "",
  fully_paid: false,
  note: "",
};

export default function Fees() {
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");

  async function loadData() {
    const [studentList, feeList] = await Promise.all([fetchStudents(), fetchFees()]);
    setStudents(studentList);
    setFees(feeList);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredFees = fees.filter((fee) => matchesSearch([fee.student_name, fee.note], query));

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Fees</p>
          <h2>Fees payment management</h2>
        </div>
        <ExportMenu title="Fees" filename="fees" rows={filteredFees} />
      </div>

      <div className="page-grid">
        <form
          className="panel form-panel"
          onSubmit={async (event) => {
            event.preventDefault();
            const payload = {
              ...form,
              student_id: form.student_id ? Number(form.student_id) : null,
              expected_amount: Number(form.expected_amount),
              amount_paid: Number(form.amount_paid),
            };

            if (editingId) {
              await updateFee(editingId, payload);
            } else {
              await createFee(payload);
            }

            setForm(initialForm);
            setEditingId(null);
            loadData();
          }}
        >
          <h3>{editingId ? "Edit Fees" : "Enter Fees"}</h3>
          <div className="form-grid">
            <select
              value={form.student_id}
              onChange={(event) => {
                const student = students.find((item) => item.id === Number(event.target.value));
                setForm({
                  ...form,
                  student_id: event.target.value,
                  student_name: student?.full_name || "",
                });
              }}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
            <input placeholder="Name" value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} required />
            <input type="number" placeholder="Total fees" value={form.expected_amount} onChange={(event) => setForm({ ...form, expected_amount: event.target.value })} required />
            <input type="number" placeholder="Fees paid" value={form.amount_paid} onChange={(event) => setForm({ ...form, amount_paid: event.target.value })} required />
            <label className="checkbox-row">
              <input type="checkbox" checked={form.fully_paid} onChange={(event) => setForm({ ...form, fully_paid: event.target.checked })} />
              Fully paid
            </label>
            <input placeholder="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <div className="button-row">
            <button type="submit">{editingId ? "Update Fees Record" : "Save Fees Record"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button> : null}
          </div>
        </form>

        <div className="panel table-panel">
          <h3>Fees Records</h3>
          <input
            className="search-input"
            placeholder="Search student or note"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Total Fees</th>
                  <th>Fees Paid</th>
                  <th>Balance</th>
                  <th>Fully Paid</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((fee) => (
                  <tr key={fee.id}>
                    <td>{fee.student_name}</td>
                    <td>{fee.expected_amount}</td>
                    <td>{fee.amount_paid}</td>
                    <td>{fee.balance}</td>
                    <td>{fee.fully_paid ? "Yes" : "No"}</td>
                    <td>{fee.note || "-"}</td>
                    <td>
                      <button type="button" onClick={() => {
                        setEditingId(fee.id);
                        setForm({
                          student_id: fee.student_id ? String(fee.student_id) : "",
                          student_name: fee.student_name || "",
                          expected_amount: fee.expected_amount,
                          amount_paid: fee.amount_paid,
                          fully_paid: fee.fully_paid,
                          note: fee.note || "",
                        });
                      }}>
                        Edit
                      </button>
                      <button type="button" className="danger-button" onClick={async () => {
                        await deleteFee(fee.id);
                        loadData();
                      }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredFees.length ? <tr><td colSpan="7">No fee records found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
