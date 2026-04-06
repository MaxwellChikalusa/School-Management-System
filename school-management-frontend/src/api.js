import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

const unwrapError = (error, fallback) =>
  error?.response?.data?.detail || error?.message || fallback;

export async function signupUser(payload) {
  try {
    const { data } = await api.post("/auth/signup", payload);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: unwrapError(error, "Unable to create account") };
  }
}

export async function loginUser(payload) {
  try {
    const { data } = await api.post("/auth/login", payload);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: unwrapError(error, "Unable to login") };
  }
}

export async function fetchDashboardSummary() {
  const { data } = await api.get("/dashboard/summary");
  return data;
}

export async function fetchStudents() {
  const { data } = await api.get("/students");
  return data;
}

export async function createStudent(payload) {
  const { data } = await api.post("/students", payload);
  return data;
}

export async function updateStudent(id, payload) {
  const { data } = await api.put(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id) {
  const { data } = await api.delete(`/students/${id}`);
  return data;
}

export async function fetchTeachers() {
  const { data } = await api.get("/teachers");
  return data;
}

export async function updateTeacher(id, payload) {
  const { data } = await api.put(`/teachers/${id}`, payload);
  return data;
}

export async function fetchPendingTeachers() {
  const { data } = await api.get("/users/pending-teachers");
  return data;
}

export async function approveTeacherAccount(id) {
  const { data } = await api.post(`/users/${id}/approve`);
  return data;
}

export async function createAdmin(payload) {
  const { data } = await api.post("/users/admins", payload);
  return data;
}

export async function fetchAttendance() {
  const { data } = await api.get("/attendance");
  return data;
}

export async function createAttendance(payload) {
  const { data } = await api.post("/attendance", payload);
  return data;
}

export async function updateAttendance(id, payload) {
  const { data } = await api.put(`/attendance/${id}`, payload);
  return data;
}

export async function deleteAttendance(id) {
  const { data } = await api.delete(`/attendance/${id}`);
  return data;
}

export async function fetchFees() {
  const { data } = await api.get("/fees");
  return data;
}

export async function createFee(payload) {
  const { data } = await api.post("/fees", payload);
  return data;
}

export async function updateFee(id, payload) {
  const { data } = await api.put(`/fees/${id}`, payload);
  return data;
}

export async function deleteFee(id) {
  const { data } = await api.delete(`/fees/${id}`);
  return data;
}

export async function fetchExamRecords() {
  const { data } = await api.get("/exams");
  return data;
}

export async function createExamRecord(payload) {
  const { data } = await api.post("/exams", payload);
  return data;
}

export async function updateExamRecord(id, payload) {
  const { data } = await api.put(`/exams/${id}`, payload);
  return data;
}

export async function deleteExamRecord(id) {
  const { data } = await api.delete(`/exams/${id}`);
  return data;
}

export async function fetchTimetables() {
  const { data } = await api.get("/timetables");
  return data;
}

export async function createTimetable(payload) {
  const { data } = await api.post("/timetables", payload);
  return data;
}

export async function updateTimetable(id, payload) {
  const { data } = await api.put(`/timetables/${id}`, payload);
  return data;
}

export async function deleteTimetable(id) {
  const { data } = await api.delete(`/timetables/${id}`);
  return data;
}

export async function postTimetable(id) {
  const { data } = await api.post(`/timetables/${id}/post`);
  return data;
}

export default api;
