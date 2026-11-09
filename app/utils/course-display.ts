type CourseDisplayFields = {
  type?: string
  level?: number
  code?: string
  title?: string
}

const yearLevelLabel = (course: CourseDisplayFields) =>
  course.type === 'SCH:V9' && Number.isInteger(course.level) && Number(course.level) > 0
    ? `Year ${course.level}`
    : ''

export function displayCourseCode(course: CourseDisplayFields) {
  return [yearLevelLabel(course), course.code].filter(Boolean).join(' · ')
}

export function displayCourseTitle(course: CourseDisplayFields, fallback = 'Untitled course') {
  return [yearLevelLabel(course), course.title || fallback].filter(Boolean).join(' · ')
}
