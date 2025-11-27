from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from database import get_db
from models.student import Student
from models.test_mark import TestMark
from models.exam import ExamMark
from models.subject import Subject
from models.class_model import Class
from models.academic_year import AcademicYear
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

router = APIRouter(prefix="/student-reports", tags=["Student Reports"])

@router.get("/")
async def get_student_reports(
    school_id: UUID = Query(..., description="School ID"),
    academic_id: UUID = Query(..., description="Academic Year ID"),
    cls_id: Optional[UUID] = Query(None, description="Class ID (optional)"),
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get student reports with combined exam and test marks.
    Returns students with their marks grouped by term and subject.
    """
    try:
        # Verify staff has access to this school (skip check for system users)
        from utils.auth_dependencies import is_system_user_proxy
        if not is_system_user_proxy(current_staff) and str(current_staff.school_id) != str(school_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this school"
            )
        
        # Build base query for students
        student_query = (
            select(Student)
            .filter(
                Student.school_id == school_id,
                Student.is_deleted == False
            )
            .options(
                selectinload(Student.current_class_obj),
                selectinload(Student.school)
            )
        )
        
        # Filter by class if provided
        if cls_id:
            student_query = student_query.filter(Student.current_class == cls_id)
        
        # Execute student query
        student_result = await db.execute(student_query)
        students = student_result.scalars().all()
        
        # Get all test marks for these students
        test_query = (
            select(TestMark)
            .filter(
                TestMark.school_id == school_id,
                TestMark.academic_id == academic_id,
                TestMark.is_deleted == False,
                TestMark.std_id.in_([s.std_id for s in students])
            )
            .options(
                selectinload(TestMark.subject),
                selectinload(TestMark.class_obj)
            )
        )
        
        if cls_id:
            test_query = test_query.filter(TestMark.cls_id == cls_id)
        
        test_result = await db.execute(test_query)
        test_marks = test_result.scalars().all()
        
        # Get all exam marks for these students
        exam_query = (
            select(ExamMark)
            .filter(
                ExamMark.school_id == school_id,
                ExamMark.academic_id == academic_id,
                ExamMark.is_deleted == False,
                ExamMark.std_id.in_([s.std_id for s in students])
            )
            .options(
                selectinload(ExamMark.subject),
                selectinload(ExamMark.class_obj)
            )
        )
        
        if cls_id:
            exam_query = exam_query.filter(ExamMark.cls_id == cls_id)
        
        exam_result = await db.execute(exam_query)
        exam_marks = exam_result.scalars().all()
        
        # Get academic year info
        academic_query = select(AcademicYear).filter(
            AcademicYear.academic_id == academic_id,
            AcademicYear.school_id == school_id
        )
        academic_result = await db.execute(academic_query)
        academic_year = academic_result.scalar_one_or_none()
        
        if not academic_year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found"
            )
        
        # Organize data by student
        reports = []
        for student in students:
            # Get student's test marks
            student_test_marks = [tm for tm in test_marks if tm.std_id == student.std_id]
            # Get student's exam marks
            student_exam_marks = [em for em in exam_marks if em.std_id == student.std_id]
            
            # Group marks by subject and term
            marks_by_subject = {}
            
            # Normalize term names
            def normalize_term(term: str) -> str:
                term_lower = term.lower().strip()
                if '1st' in term_lower or 'first' in term_lower or term_lower == 'term 1':
                    return '1st Term'
                elif '2nd' in term_lower or 'second' in term_lower or term_lower == 'term 2':
                    return '2nd Term'
                elif '3rd' in term_lower or 'third' in term_lower or term_lower == 'term 3':
                    return '3rd Term'
                return term
            
            # Process test marks
            for tm in student_test_marks:
                subj_id = str(tm.subj_id)
                term = normalize_term(tm.term)
                
                if subj_id not in marks_by_subject:
                    marks_by_subject[subj_id] = {
                        "subject_id": subj_id,
                        "subject_name": tm.subject.subj_name if tm.subject else None,
                        "terms": {}
                    }
                
                if term not in marks_by_subject[subj_id]["terms"]:
                    marks_by_subject[subj_id]["terms"][term] = {
                        "term": term,
                        "test_cat": None,
                        "test_ex": None,
                        "test_total": None,
                        "test_is_published": False,
                        "exam_cat": None,
                        "exam_ex": None,
                        "exam_total": None,
                        "exam_is_published": False
                    }
                
                marks_by_subject[subj_id]["terms"][term]["test_cat"] = tm.test_avg_mark
                marks_by_subject[subj_id]["terms"][term]["test_ex"] = tm.test_mark
                marks_by_subject[subj_id]["terms"][term]["test_total"] = (
                    (tm.test_avg_mark or 0) + (tm.test_mark or 0)
                )
                marks_by_subject[subj_id]["terms"][term]["test_is_published"] = tm.is_published
            
            # Process exam marks
            for em in student_exam_marks:
                subj_id = str(em.subj_id)
                term = normalize_term(em.term)
                
                if subj_id not in marks_by_subject:
                    marks_by_subject[subj_id] = {
                        "subject_id": subj_id,
                        "subject_name": em.subject.subj_name if em.subject else None,
                        "terms": {}
                    }
                
                if term not in marks_by_subject[subj_id]["terms"]:
                    marks_by_subject[subj_id]["terms"][term] = {
                        "term": term,
                        "test_cat": None,
                        "test_ex": None,
                        "test_total": None,
                        "test_is_published": False,
                        "exam_cat": None,
                        "exam_ex": None,
                        "exam_total": None,
                        "exam_is_published": False
                    }
                
                marks_by_subject[subj_id]["terms"][term]["exam_cat"] = em.exam_avg_mark
                marks_by_subject[subj_id]["terms"][term]["exam_ex"] = em.exam_mark
                marks_by_subject[subj_id]["terms"][term]["exam_total"] = (
                    (em.exam_avg_mark or 0) + (em.exam_mark or 0)
                )
                marks_by_subject[subj_id]["terms"][term]["exam_is_published"] = em.is_published
            
            # Convert to list format
            subject_marks = []
            for subj_id, data in marks_by_subject.items():
                terms_list = list(data["terms"].values())
                subject_marks.append({
                    "subject_id": data["subject_id"],
                    "subject_name": data["subject_name"],
                    "terms": terms_list
                })
            
            reports.append({
                "student_id": str(student.std_id),
                "student_name": student.std_name,
                "student_code": student.std_code,
                "class_id": str(student.current_class) if student.current_class else None,
                "class_name": student.current_class_obj.cls_name if student.current_class_obj else None,
                "class_type": student.current_class_obj.cls_type if student.current_class_obj else None,
                "subjects": subject_marks
            })
        
        # Get school name
        from models.school import School
        school_query = select(School).filter(School.school_id == school_id)
        school_result = await db.execute(school_query)
        school = school_result.scalar_one_or_none()
        school_name = school.school_name if school else None
        
        return {
            "academic_year": {
                "id": str(academic_year.academic_id),
                "name": academic_year.academic_name
            },
            "school_id": str(school_id),
            "school_name": school_name,
            "class_id": str(cls_id) if cls_id else None,
            "students": reports
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving student reports: {str(e)}"
        )

