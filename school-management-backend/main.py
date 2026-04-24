import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="School Management System API")


def build_allowed_origins() -> list[str]:
    configured_origins = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "https://school-management-frontend-wqp1.onrender.com,http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    frontend_host = os.getenv("FRONTEND_HOST", "").strip()
    if frontend_host:
        configured_origins.append(
            frontend_host if frontend_host.startswith(("http://", "https://")) else f"https://{frontend_host}"
        )
    return list(dict.fromkeys(configured_origins))


allowed_origins = build_allowed_origins()

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


def get_current_user(
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None),
    x_user_role: str | None = Header(default=None),
):
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if x_user_role and user.role != x_user_role:
        raise HTTPException(status_code=401, detail="User role mismatch")
    if user.status != "approved":
        raise HTTPException(status_code=403, detail="Teacher account is waiting for admin approval")
    return user


def require_admin(current_user: models.User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def handle_permission_error(exc: PermissionError) -> None:
    raise HTTPException(status_code=403, detail=str(exc)) from exc


@app.on_event("startup")
def startup_seed():
    db = SessionLocal()
    try:
        models.Base.metadata.create_all(bind=engine)
        crud.ensure_schema(db)
        crud.migrate_legacy_sqlite_if_needed(db)
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


@app.post("/auth/change-password", response_model=schemas.UserOut)
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = crud.change_password(db, current_user, payload.current_password, payload.new_password)
    if not user:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    return user


@app.get("/users", response_model=list[schemas.UserOut])
def read_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    return crud.list_users(db)


@app.get("/users/pending-teachers", response_model=list[schemas.UserOut])
def read_pending_teachers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    return crud.list_pending_teachers(db)


@app.post("/users/{user_id}/approve", response_model=schemas.UserOut)
def approve_teacher(
    user_id: int,
    payload: schemas.ApproveTeacherRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    user = crud.approve_teacher(db, user_id, payload.forms)
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return user


@app.post("/users/admins", response_model=schemas.UserOut)
def create_admin(
    payload: schemas.UserSignup,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    try:
        return crud.create_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/users/{user_id}/disable", response_model=schemas.UserOut)
def disable_teacher_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    user = crud.set_teacher_account_status(db, user_id, "disabled")
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return user


@app.post("/users/{user_id}/enable", response_model=schemas.UserOut)
def enable_teacher_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    user = crud.set_teacher_account_status(db, user_id, "approved")
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return user


@app.get("/students", response_model=list[schemas.StudentOut])
def read_students(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_students(db, current_user)


@app.post("/students", response_model=schemas.StudentOut)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_student(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)


@app.put("/students/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: int,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        student = crud.update_student(db, student_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@app.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.delete_student(db, student_id, current_user):
        raise HTTPException(status_code=404, detail="Student not found")
    return {"success": True}


@app.get("/teachers", response_model=list[schemas.TeacherOut])
def read_teachers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_teachers(db)


@app.post("/teachers", response_model=schemas.TeacherOut)
def create_teacher(
    payload: schemas.TeacherCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    return crud.create_teacher(db, payload)


@app.put("/teachers/{teacher_id}", response_model=schemas.TeacherOut)
def update_teacher(
    teacher_id: int,
    payload: schemas.TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    teacher = crud.update_teacher(db, teacher_id, payload)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@app.get("/attendance", response_model=list[schemas.AttendanceOut])
def read_attendance(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_attendance(db, current_user)


@app.post("/attendance", response_model=schemas.AttendanceOut)
def create_attendance(
    payload: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_attendance(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)


@app.put("/attendance/{attendance_id}", response_model=schemas.AttendanceOut)
def update_attendance(
    attendance_id: int,
    payload: schemas.AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        attendance = crud.update_attendance(db, attendance_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance


@app.delete("/attendance/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.delete_attendance(db, attendance_id, current_user):
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"success": True}


@app.get("/fees", response_model=list[schemas.FeeOut])
def read_fees(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_fees(db, current_user)


@app.post("/fees", response_model=schemas.FeeOut)
def create_fee(
    payload: schemas.FeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_fee(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)


@app.put("/fees/{fee_id}", response_model=schemas.FeeOut)
def update_fee(
    fee_id: int,
    payload: schemas.FeeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        fee = crud.update_fee(db, fee_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")
    return fee


@app.delete("/fees/{fee_id}")
def delete_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.delete_fee(db, fee_id, current_user):
        raise HTTPException(status_code=404, detail="Fee record not found")
    return {"success": True}


@app.get("/exams", response_model=list[schemas.ExamRecordOut])
def read_exam_records(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_exam_records(db, current_user)


@app.post("/exams", response_model=schemas.ExamRecordOut)
def create_exam_record(
    payload: schemas.ExamRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_exam_record(db, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)


@app.put("/exams/{record_id}", response_model=schemas.ExamRecordOut)
def update_exam_record(
    record_id: int,
    payload: schemas.ExamRecordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        record = crud.update_exam_record(db, record_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        handle_permission_error(exc)
    if not record:
        raise HTTPException(status_code=404, detail="Exam record not found")
    return record


@app.delete("/exams/{record_id}")
def delete_exam_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.delete_exam_record(db, record_id, current_user):
        raise HTTPException(status_code=404, detail="Exam record not found")
    return {"success": True}


@app.get("/timetables", response_model=list[schemas.TimetableOut])
def read_timetables(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_timetables(db, current_user)


@app.post("/timetables", response_model=schemas.TimetableOut)
def create_timetable(
    payload: schemas.TimetableCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_timetable(db, payload, current_user)
    except PermissionError as exc:
        handle_permission_error(exc)


@app.put("/timetables/{timetable_id}", response_model=schemas.TimetableOut)
def update_timetable(
    timetable_id: int,
    payload: schemas.TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        timetable = crud.update_timetable(db, timetable_id, payload, current_user)
    except PermissionError as exc:
        handle_permission_error(exc)
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return timetable


@app.delete("/timetables/{timetable_id}")
def delete_timetable(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.delete_timetable(db, timetable_id, current_user):
        raise HTTPException(status_code=404, detail="Timetable not found")
    return {"success": True}


@app.post("/timetables/{timetable_id}/post", response_model=schemas.TimetableOut)
def publish_timetable(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    timetable = crud.post_timetable(db, timetable_id, current_user)
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return timetable


@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def read_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_dashboard_summary(db, current_user)


@app.get("/permissions/me", response_model=schemas.PermissionContext)
def read_permission_context(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_permission_context(db, current_user)


@app.get("/access-requests", response_model=list[schemas.TeacherAccessRequestOut])
def read_access_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_access_requests(db, current_user)


@app.post("/access-requests", response_model=schemas.TeacherAccessRequestOut)
def submit_access_request(
    payload: schemas.TeacherAccessRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_access_request(db, current_user, payload)
    except PermissionError as exc:
        handle_permission_error(exc)


@app.post("/access-requests/{request_id}/approve", response_model=schemas.TeacherAccessRequestOut)
def approve_access_request(
    request_id: int,
    payload: schemas.TeacherAccessRequestApprove,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    result = crud.approve_access_request(db, request_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Access request not found")
    return result
