import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="School Management System API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def startup_seed():
    db = SessionLocal()
    try:
        models.Base.metadata.create_all(bind=engine)
        crud.ensure_schema(db)
        crud.get_or_create_default_admin(db)
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    try:
        return crud.signup_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login", response_model=schemas.UserOut)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.login_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.status != "approved":
        raise HTTPException(status_code=403, detail="Teacher account is waiting for admin approval")
    return user


@app.get("/users", response_model=list[schemas.UserOut])
def read_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@app.get("/users/pending-teachers", response_model=list[schemas.UserOut])
def read_pending_teachers(db: Session = Depends(get_db)):
    return crud.list_pending_teachers(db)


@app.post("/users/{user_id}/approve", response_model=schemas.UserOut)
def approve_teacher(user_id: int, db: Session = Depends(get_db)):
    user = crud.approve_teacher(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return user


@app.post("/users/admins", response_model=schemas.UserOut)
def create_admin(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    try:
        return crud.create_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/students", response_model=list[schemas.StudentOut])
def read_students(db: Session = Depends(get_db)):
    return crud.get_students(db)


@app.post("/students", response_model=schemas.StudentOut)
def create_student(payload: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud.create_student(db, payload)


@app.put("/students/{student_id}", response_model=schemas.StudentOut)
def update_student(student_id: int, payload: schemas.StudentUpdate, db: Session = Depends(get_db)):
    student = crud.update_student(db, student_id, payload)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@app.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    if not crud.delete_student(db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    return {"success": True}


@app.get("/teachers", response_model=list[schemas.TeacherOut])
def read_teachers(db: Session = Depends(get_db)):
    return crud.get_teachers(db)


@app.post("/teachers", response_model=schemas.TeacherOut)
def create_teacher(payload: schemas.TeacherCreate, db: Session = Depends(get_db)):
    return crud.create_teacher(db, payload)


@app.put("/teachers/{teacher_id}", response_model=schemas.TeacherOut)
def update_teacher(teacher_id: int, payload: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    teacher = crud.update_teacher(db, teacher_id, payload)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@app.get("/attendance", response_model=list[schemas.AttendanceOut])
def read_attendance(db: Session = Depends(get_db)):
    return crud.get_attendance(db)


@app.post("/attendance", response_model=schemas.AttendanceOut)
def create_attendance(payload: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    return crud.create_attendance(db, payload)


@app.put("/attendance/{attendance_id}", response_model=schemas.AttendanceOut)
def update_attendance(attendance_id: int, payload: schemas.AttendanceUpdate, db: Session = Depends(get_db)):
    attendance = crud.update_attendance(db, attendance_id, payload)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance


@app.delete("/attendance/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    if not crud.delete_attendance(db, attendance_id):
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"success": True}


@app.get("/fees", response_model=list[schemas.FeeOut])
def read_fees(db: Session = Depends(get_db)):
    return crud.get_fees(db)


@app.post("/fees", response_model=schemas.FeeOut)
def create_fee(payload: schemas.FeeCreate, db: Session = Depends(get_db)):
    return crud.create_fee(db, payload)


@app.put("/fees/{fee_id}", response_model=schemas.FeeOut)
def update_fee(fee_id: int, payload: schemas.FeeUpdate, db: Session = Depends(get_db)):
    fee = crud.update_fee(db, fee_id, payload)
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")
    return fee


@app.delete("/fees/{fee_id}")
def delete_fee(fee_id: int, db: Session = Depends(get_db)):
    if not crud.delete_fee(db, fee_id):
        raise HTTPException(status_code=404, detail="Fee record not found")
    return {"success": True}


@app.get("/exams", response_model=list[schemas.ExamRecordOut])
def read_exam_records(db: Session = Depends(get_db)):
    return crud.get_exam_records(db)


@app.post("/exams", response_model=schemas.ExamRecordOut)
def create_exam_record(payload: schemas.ExamRecordCreate, db: Session = Depends(get_db)):
    return crud.create_exam_record(db, payload)


@app.put("/exams/{record_id}", response_model=schemas.ExamRecordOut)
def update_exam_record(record_id: int, payload: schemas.ExamRecordUpdate, db: Session = Depends(get_db)):
    record = crud.update_exam_record(db, record_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="Exam record not found")
    return record


@app.delete("/exams/{record_id}")
def delete_exam_record(record_id: int, db: Session = Depends(get_db)):
    if not crud.delete_exam_record(db, record_id):
        raise HTTPException(status_code=404, detail="Exam record not found")
    return {"success": True}


@app.get("/timetables", response_model=list[schemas.TimetableOut])
def read_timetables(db: Session = Depends(get_db)):
    return crud.get_timetables(db)


@app.post("/timetables", response_model=schemas.TimetableOut)
def create_timetable(payload: schemas.TimetableCreate, db: Session = Depends(get_db)):
    return crud.create_timetable(db, payload)


@app.put("/timetables/{timetable_id}", response_model=schemas.TimetableOut)
def update_timetable(timetable_id: int, payload: schemas.TimetableUpdate, db: Session = Depends(get_db)):
    timetable = crud.update_timetable(db, timetable_id, payload)
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return timetable


@app.delete("/timetables/{timetable_id}")
def delete_timetable(timetable_id: int, db: Session = Depends(get_db)):
    if not crud.delete_timetable(db, timetable_id):
        raise HTTPException(status_code=404, detail="Timetable not found")
    return {"success": True}


@app.post("/timetables/{timetable_id}/post", response_model=schemas.TimetableOut)
def publish_timetable(timetable_id: int, db: Session = Depends(get_db)):
    timetable = crud.post_timetable(db, timetable_id)
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return timetable


@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def read_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)
