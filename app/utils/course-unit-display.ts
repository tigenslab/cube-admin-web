type CourseUnitDisplayFields = {
  code?: string
  title?: string
  level?: number
}

export function unitMatchesCourseLevel(courseType: string | undefined, courseLevel: number | undefined, unitLevel: number | undefined) {
  return courseType !== 'SCH:V9'
    || (Number.isInteger(courseLevel) && Number(courseLevel) > 0 && unitLevel === courseLevel)
}

const yearLevelLabel = (courseType: string | undefined, level: number | undefined) =>
  courseType === 'SCH:V9' && Number.isInteger(level) && Number(level) > 0
    ? `Year ${level}`
    : ''

export function displayCourseUnitCode(courseType: string | undefined, unit: CourseUnitDisplayFields) {
  const label = yearLevelLabel(courseType, unit.level)
  return [label, unit.code].filter(Boolean).join(' · ')
}

export function displayCourseUnitTitle(courseType: string | undefined, unit: CourseUnitDisplayFields) {
  const label = yearLevelLabel(courseType, unit.level)
  return [label, unit.title || 'Untitled unit'].filter(Boolean).join(' · ')
}
