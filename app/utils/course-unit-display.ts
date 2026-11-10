type CourseUnitDisplayFields = {
  code?: string
  title?: string
}

export function displayCourseUnitCode(unit: CourseUnitDisplayFields) {
  return unit.code || ''
}

export function displayCourseUnitTitle(unit: CourseUnitDisplayFields) {
  return unit.title || 'Untitled unit'
}
