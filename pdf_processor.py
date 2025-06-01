import re
import PyPDF2
from io import BytesIO
import os

def extract_grades_from_pdf(pdf_path):
    """
    Extract course information from a BRAC University grade sheet PDF
    """
    courses = []

    try:
        # Check if file exists
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)

            # Check if PDF has pages
            if len(reader.pages) == 0:
                raise ValueError("PDF file appears to be empty or corrupted")

            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text = page.extract_text()

                # Find course rows in the text using the original pattern
                # Pattern matches course code, title, credits, grade, and grade points
                pattern = r'([A-Z]{3}\d{3})\s+(.*?)\s+(\d+\.\d+)\s+([A-Z][+-]?(?:\s*\([A-Z]{2}\))?)\s+(\d+\.\d+)'
                matches = re.finditer(pattern, text)

                for match in matches:
                    course_code = match.group(1)
                    course_title = match.group(2).strip()
                    credits = match.group(3)
                    grade = match.group(4)
                    grade_points = match.group(5)

                    courses.append({
                        'course_code': course_code,
                        'course_title': course_title,
                        'credits': credits,
                        'grade': grade,
                        'grade_points': grade_points
                    })

        # Additional specific search for MAT110, MAT120, MAT215 if not found by main pattern
        target_courses = ['MAT110', 'MAT120', 'MAT215']
        found_course_codes = [course['course_code'] for course in courses]

        for target_course in target_courses:
            if target_course not in found_course_codes:
                # Search for this specific course in all pages
                for page_num in range(len(reader.pages)):
                    page = reader.pages[page_num]
                    text = page.extract_text()

                    # Look for the specific course code with more flexible pattern
                    # This pattern specifically looks for MAT110/MAT120/MAT215 followed by course data
                    specific_pattern = rf'{target_course}\s+([^0-9]*?)\s+(\d+\.\d+)\s+([A-Z][+-]?(?:\s*\([A-Z]{{2}}\))?)\s+(\d+\.\d+)'
                    match = re.search(specific_pattern, text, re.MULTILINE)

                    if match:
                        course_title = match.group(1).strip()
                        credits = match.group(2)
                        grade = match.group(3)
                        grade_points = match.group(4)

                        courses.append({
                            'course_code': target_course,
                            'course_title': course_title if course_title else f"{target_course} Course",
                            'credits': credits,
                            'grade': grade,
                            'grade_points': grade_points
                        })
                        break  # Found the course, move to next target course

        # If no courses found, provide helpful message
        if not courses:
            raise ValueError("No course data found in the PDF. Please ensure this is a valid BRAC University grade sheet.")

    except PyPDF2.errors.PdfReadError as e:
        raise ValueError(f"Unable to read PDF file. The file may be corrupted or password-protected: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error processing PDF: {str(e)}")

    return courses