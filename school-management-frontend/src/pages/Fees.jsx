import React, { useEffect, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import { createFee, deleteFee, fetchFees, fetchStudents, updateFee } from "../api";
import { groupStudentsByForm, matchesSearch } from "../constants/schoolData";
import { useConfirmDialog, useNoticeDialog, useSuccessDialog } from "../context/ConfirmDialogContext";
import { formatCurrency, formatNumber } from "../utils/formatters";
import "../styles/fees.css";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const initialForm = {
  student_id: "",
  admission_number: "",
  student_name: "",
  transaction_date: "",
  expected_amount: "",
  amount_paid: "",
  fully_paid: false,
  reference_number: "",
  receipt_files: [],
  note: "",
};

export default function Fees() {
  const confirm = useConfirmDialog();
  const showNotice = useNoticeDialog();
  const showSuccess = useSuccessDialog();
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

  const filteredFees = fees.filter((fee) =>
    matchesSearch([fee.student_name, fee.admission_number, fee.transaction_date, fee.reference_number, fee.note], query)
  );
  const studentGroups = groupStudentsByForm(students);
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));
  const canMarkFullyPaid =
    Number(form.expected_amount || 0) > 0 &&
    Number(form.amount_paid || 0) >= Number(form.expected_amount || 0);
  const groupedFees = studentGroups
    .map((group) => ({
      formName: group.formName,
      rows: filteredFees
        .filter((fee) => studentMap[fee.student_id]?.class_name === group.formName)
        .sort((left, right) => (
          Number(right.fully_paid) - Number(left.fully_paid)
          || right.amount_paid - left.amount_paid
          || left.balance - right.balance
          || left.student_name.localeCompare(right.student_name)
        ))
        .map((fee, index) => ({ ...fee, formRank: index + 1 })),
    }))
    .filter((group) => group.rows.length);

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

            try {
              if (editingId) {
                await updateFee(editingId, payload);
                showSuccess({ title: "Updated successfully", message: "Fee record was updated successfully." });
              } else {
                await createFee(payload);
                showSuccess({ title: "Saved successfully", message: "Fee record was saved successfully." });
              }
            } catch (error) {
              const message = error?.response?.data?.detail || error?.message || "Unable to save fee record.";
              if (!editingId && message === "Do you want to add this to existing fees?") {
                const approved = await confirm({
                  title: "Add To Existing Fees?",
                  message: "Do you want to add this to existing fees?",
                  confirmLabel: "Yes",
                  cancelLabel: "No",
                  tone: "default",
                });
                if (!approved) {
                  return;
                }
                await createFee({ ...payload, merge_with_existing: true });
                showSuccess({ title: "Added successfully", message: "The fee payment was added to the existing fees record." });
              } else {
                showNotice({ title: "Unable to Save", message });
                return;
              }
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
                  admission_number: student?.admission_number || "",
                  student_name: student?.full_name || "",
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
            <input placeholder="Name *" value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} required />
            <input value={form.admission_number || "Auto from student"} readOnly aria-label="Admission Number" />
            <input
              type="date"
              value={form.transaction_date}
              onChange={(event) => setForm({ ...form, transaction_date: event.target.value })}
              required
              aria-label="Transaction Date *"
            />
            <input
              type="number"
              placeholder="Total fees *"
              value={form.expected_amount}
              onChange={(event) => {
                const expectedAmount = event.target.value;
                const nextCanMark = Number(form.amount_paid || 0) >= Number(expectedAmount || 0) && Number(expectedAmount || 0) > 0;
                setForm({ ...form, expected_amount: expectedAmount, fully_paid: nextCanMark ? form.fully_paid : false });
              }}
              required
            />
            <input
              type="number"
              placeholder="Fees paid *"
              value={form.amount_paid}
              onChange={(event) => {
                const amountPaid = event.target.value;
                const nextCanMark = Number(amountPaid || 0) >= Number(form.expected_amount || 0) && Number(form.expected_amount || 0) > 0;
                setForm({ ...form, amount_paid: amountPaid, fully_paid: nextCanMark ? form.fully_paid : false });
              }}
              required
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={canMarkFullyPaid && form.fully_paid}
                disabled={!canMarkFullyPaid}
                onChange={(event) => setForm({ ...form, fully_paid: event.target.checked })}
              />
              Fully paid
            </label>
            <input
              placeholder="Reference Number"
              value={form.reference_number}
              onChange={(event) => setForm({ ...form, reference_number: event.target.value })}
            />
            <label className="stack-list">
              <span>Upload Receipt(s)</span>
              <input
                type="file"
                multiple
                onChange={async (event) => {
                  const files = Array.from(event.target.files || []);
                  const encodedFiles = await Promise.all(files.map((file) => fileToBase64(file)));
                  setForm({ ...form, receipt_files: encodedFiles });
                }}
              />
              <small>{form.receipt_files.length ? `${form.receipt_files.length} receipt(s) selected` : "Optional"}</small>
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
            placeholder="Search student, admission number, date, reference or note"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Admission No.</th>
                  <th>Date</th>
                  <th>Total Fees</th>
                  <th>Fees Paid</th>
                  <th>Balance</th>
                  <th>Fully Paid</th>
                  <th>Reference Number</th>
                  <th>Receipts</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedFees.flatMap((group) => [
                  <tr key={`${group.formName}-header`} className="group-row group-row-green">
                    <td colSpan="12"><strong>{group.formName}</strong></td>
                  </tr>,
                  ...group.rows.map((fee) => (
                    <tr key={fee.id}>
                      <td>{formatNumber(fee.formRank)}</td>
                      <td>{fee.student_name}</td>
                      <td>{fee.admission_number || "-"}</td>
                      <td>{fee.transaction_date || "-"}</td>
                      <td>{formatCurrency(fee.expected_amount)}</td>
                      <td>{formatCurrency(fee.amount_paid)}</td>
                      <td>{formatCurrency(fee.balance)}</td>
                      <td>{fee.fully_paid ? "Yes" : "No"}</td>
                      <td>{fee.reference_number || "-"}</td>
                      <td>{fee.receipt_files?.length ? `${fee.receipt_files.length} uploaded` : "0 uploaded"}</td>
                      <td>{fee.note || "-"}</td>
                      <td>
                        <button type="button" className={editingId === fee.id ? "edit-button-active" : ""} onClick={() => {
                          setEditingId(fee.id);
                          setForm({
                            student_id: fee.student_id ? String(fee.student_id) : "",
                            admission_number: fee.admission_number || "",
                            student_name: fee.student_name || "",
                            transaction_date: fee.transaction_date || "",
                            expected_amount: fee.expected_amount,
                            amount_paid: fee.amount_paid,
                            fully_paid: fee.fully_paid,
                            reference_number: fee.reference_number || "",
                            receipt_files: fee.receipt_files || [],
                            note: fee.note || "",
                          });
                        }}>
                          Edit
                        </button>
                        <button type="button" className="danger-button" onClick={async () => {
                          const approved = await confirm({
                            title: `Are You Sure You Want to Delete "${fee.student_name || "Fee Record"}"`,
                            message: "This action cannot be undone.",
                            confirmLabel: "Delete Record",
                          });
                          if (!approved) return;
                          await deleteFee(fee.id);
                          showSuccess({ title: "Deleted successfully", message: "Fee record was deleted successfully." });
                          loadData();
                        }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )),
                ])}
                {!filteredFees.length ? <tr><td colSpan="12">No fee records found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
